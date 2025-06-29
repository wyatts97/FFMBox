import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import ffmpeg from 'fluent-ffmpeg';
import { getFFmpegVersion, getFileStats } from '../utils/file.js';
import { addHistoryItem } from '../src/routes/api.js'; // Path is correct as the src directory is copied to /app/src
import logger from '../utils/logger.js';

/**
 * @typedef {import("@ffmbox/shared").PresetOptions} PresetOptions
 */

class ConversionService {
  constructor() {
    this.activeConversions = new Map();
    this.ffmpegInfo = null;
    this.initialize();
  }

  async initialize() {
    // Initialize FFmpeg info
    this.ffmpegInfo = await getFFmpegVersion();
    
    // Set up periodic cleanup
    setInterval(() => this.cleanupOldConversions(), 60 * 60 * 1000); // Run hourly
  }

  /**
   * Create a new conversion
   */
  createConversion(data) {
    const conversionId = uuidv4();
    const now = new Date();
    
    const conversion = {
      id: conversionId,
      status: 'pending',
      progress: 0,
      startTime: now,
      endTime: null,
      error: null,
      timemark: null,
      frames: 0,
      ...data,
      createdAt: now,
      updatedAt: now
    };
    
    this.activeConversions.set(conversionId, conversion);
    return conversion;
  }

  /**
   * Update an existing conversion
   */
  updateConversion(id, updates) {
    const conversion = this.activeConversions.get(id);
    if (!conversion) return null;
    
    const updated = { 
      ...conversion, 
      ...updates, 
      updatedAt: new Date() 
    };
    
    this.activeConversions.set(id, updated);
    return updated;
  }

  /**
   * Get a conversion by ID
   */
  getConversion(id) {
    return this.activeConversions.get(id);
  }

  /**
   * Delete a conversion
   */
  deleteConversion(id) {
    return this.activeConversions.delete(id);
  }

  /**
   * Get all active conversions
   */
  getAllConversions() {
    return Array.from(this.activeConversions.values());
  }

  /**
   * Clean up old conversions
   */
  cleanupOldConversions() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    let cleaned = 0;
    
    for (const [id, conversion] of this.activeConversions.entries()) {
      if (now - conversion.startTime.getTime() > maxAge) {
        this.activeConversions.delete(id);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} old conversions`);
    }
    
    return cleaned;
  }

  /**
   * Get FFmpeg information
   */
  getFFmpegInfo() {
    return this.ffmpegInfo;
  }

  /**
   * Start a new FFmpeg conversion with enhanced error handling and logging
   */
  async startConversion(conversion) {
    const { id, inputPath, outputPath, preset, options = {} } = conversion;
    const startTime = process.hrtime();
    
    try {
      // Validate input file
      logger.info(`[${id}] Validating input file: ${inputPath}`);
      const inputStats = await getFileStats(inputPath);
      if (!inputStats) {
        throw new Error(`Input file not found: ${inputPath}`);
      }
      
      // Create output directory if it doesn't exist
      const outputDir = path.dirname(outputPath);
      logger.debug(`[${id}] Ensuring output directory exists: ${outputDir}`);
      await fs.ensureDir(outputDir);
      
      // Verify write permissions
      try {
        await fs.access(outputDir, fs.constants.W_OK);
      } catch (error) {
        throw new Error(`No write permission in output directory: ${outputDir}`);
      }
      
      // Update conversion status
      this.updateConversion(id, { 
        status: 'processing',
        fileSize: inputStats.size,
        startTime: new Date()
      });
      
      // Create FFmpeg command with error handling
      logger.debug(`[${id}] Creating FFmpeg command for ${inputPath} -> ${outputPath}`);
      const command = ffmpeg(inputPath);
      
      // Apply preset settings
      logger.debug(`[${id}] Applying preset: ${preset}`, { options });
      this._applyPreset(command, preset, options);
      
      // Add error handling for FFmpeg process
      return new Promise((resolve, reject) => {
        let ffmpegProcess;
        
        // Set up event handlers
        command
          .on('start', (commandLine) => {
            ffmpegProcess = command.ffmpegProc;
            logger.info(`[${id}] FFmpeg command started`, { 
              command: commandLine,
              pid: ffmpegProcess?.pid 
            });
            this.updateConversion(id, { 
              command: commandLine,
              pid: ffmpegProcess?.pid 
            });
          })
          .on('codecData', (data) => {
            logger.debug(`[${id}] Input codec data:`, data);
          })
          .on('progress', (progress) => {
            const percent = Math.min(100, Math.round(progress.percent) || 0);
            logger.debug(`[${id}] Conversion progress: ${percent}%`, {
              timemark: progress.timemark,
              frames: progress.frames
            });
            this.updateConversion(id, {
              progress,
              timemark: progress.timemark,
              frames: progress.frames
            });
          })
          .on('stderr', (stderrLine) => {
            logger.debug(`[${id}] FFmpeg stderr: ${stderrLine}`);
          })
          .on('error', async (err, stdout, stderr) => {
            const errorMsg = `FFmpeg error: ${err.message}`;
            logger.error(`[${id}] ${errorMsg}`, { 
              error: err,
              stdout: stdout?.substring(0, 1000), // Limit log size
              stderr: stderr?.substring(0, 1000)  // Limit log size
            });
            
            try {
              // Clean up partial output file on error
              if (await fs.pathExists(outputPath)) {
                try {
                  await fs.unlink(outputPath);
                  logger.debug(`[${id}] Removed partial output file: ${outputPath}`);
                } catch (cleanupError) {
                  logger.error(`[${id}] Error cleaning up partial output:`, cleanupError);
                }
              }
              
              reject(new Error(`Conversion failed: ${errorMsg}`));
            } catch (error) {
              logger.error(`[${id}] Error in error handler:`, error);
              reject(new Error(`Conversion failed: ${errorMsg} (additional error in cleanup)`));
            }
          })
          .on('end', async () => {
            const [seconds, nanoseconds] = process.hrtime(startTime);
            const durationMs = Math.round((seconds * 1000) + (nanoseconds / 1000000));
            
            try {
              const outputStats = await getFileStats(outputPath);
              logger.info(`[${id}] Conversion completed successfully`, {
                duration: `${durationMs}ms`,
                outputSize: outputStats?.size
              });
              
              this.updateConversion(id, {
                status: 'completed',
                endTime: new Date(),
                progress: 100,
                durationMs,
                outputSize: outputStats?.size
              });
              
              // Add to history
              await addHistoryItem({
                id: id,
                filename: conversion.filename,
                preset: conversion.preset,
                timestamp: new Date().toISOString(),
                status: 'completed',
                downloadUrl: `/output/${conversion.outputFilename}`
              });
              resolve(command);
            } catch (error) {
              logger.error(`[${id}] Error verifying output file:`, error);
              reject(new Error('Conversion completed but output file verification failed'));
            }
          });
          
        // Start the conversion
        command.save(outputPath);
      });
      
    } catch (error) {
      const errorMsg = `Error in conversion process: ${error.message}`;
      logger.error(`[${id}] ${errorMsg}`, { error });
      
      // First add to history
      await addHistoryItem({
        id: id,
        filename: conversion.filename,
        preset: conversion.preset,
        timestamp: new Date().toISOString(),
        status: 'error',
        error: errorMsg
      });

      // Then update conversion
      this.updateConversion(id, {
        status: 'error',
        endTime: new Date(),
        error: errorMsg,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
      
      throw error;
    }
  }

  /**
   * Apply preset settings to FFmpeg command with validation
   * @private
   * @param {Object} command - FFmpeg command instance
   * @param {string} preset - Preset name to apply
   * @param {Object} [options={}] - Additional options
   * @returns {Object} The FFmpeg command instance
   * @throws {Error} If preset is invalid or options are invalid
   */
  _applyPreset(command, preset, options = {}) {
    logger.debug(`Applying preset options for ${preset}:`, options);

    if (!command) {
      throw new Error('FFmpeg command instance is required');
    }

    try {
      // Handle custom command directly
      if (options.customCommand) {
        logger.info(`Applying custom FFmpeg command: ${options.customCommand}`);
        command.outputOptions(options.customCommand.split(' ')); // Split by space, might need more robust parsing
        return command;
      }

      // General output format (e.g., 'mp4', 'mp3', 'webp')
      // This 'preset' argument from the client is often the desired output extension/format.
      if (preset) {
        command.toFormat(preset);
      }

      // Video options
      if (options.videoCodec) {
        command.videoCodec(options.videoCodec);
      }
      if (options.crf !== undefined) {
        command.addOption('-crf', options.crf);
      }
      if (options.preset) { // FFmpeg encoding preset (e.g., 'medium', 'ultrafast')
        command.addOption('-preset', options.preset);
      }
      if (options.pixelFormat) {
        command.addOption('-pix_fmt', options.pixelFormat);
      }
      if (options.profile) {
        command.addOption('-profile:v', options.profile);
      }
      if (options.movflags) {
        command.addOption('-movflags', options.movflags);
      }
      if (options.fps) {
        command.fps(options.fps);
      }

      // Audio options
      if (options.audioCodec) {
        command.audioCodec(options.audioCodec);
      }
      if (options.audioQuality !== undefined) {
        command.addOption('-q:a', options.audioQuality); // For libmp3lame quality
      }
      if (options.audioSampleRate) {
        command.audioFrequency(options.audioSampleRate);
      }
      if (options.audioChannels) {
        command.audioChannels(options.audioChannels);
      }
      if (options.audioVolume) {
        command.audioFilters(`volume=${options.audioVolume}`);
      }

      // Image specific options (e.g., for WebP, JPEG, PNG)
      if (options.quality !== undefined) {
        // For image quality (e.g., WebP, JPEG)
        command.addOption('-q:v', options.quality);
      }
      if (options.compressionLevel !== undefined) {
        // For PNG compression level
        command.addOption('-compression_level', options.compressionLevel);
      }
      if (options.progressive) {
        command.addOption('-progressive', '1');
      }
      if (options.lossless) {
        command.addOption('-lossless', '1');
      }

      // Utility options (trim, resize, watermark, etc.)
      if (options.start !== undefined) {
        command.seekInput(options.start);
      }
      if (options.duration !== undefined) {
        command.duration(options.duration);
      }
      // For extract frames, thumbnail, etc., the server-side logic needs to be more specific
      // as these often involve complex filter graphs or specific FFmpeg commands not directly
      // exposed by fluent-ffmpeg's simple methods.
      // For example, 'extract-frames' might need `-vf fps=1/X` and outputting to a pattern.
      // 'thumbnail' might need `-ss` and `-vframes 1`.
      // 'watermark' would need complex filter graphs.
      // This current `_applyPreset` is a basic mapping. Complex presets need dedicated handling.
      // For now, we'll assume the client sends simple options that map directly to fluent-ffmpeg.

      // Handle resolution (width/height)
      if (options.videoBitrate) {
        if (typeof options.videoBitrate === 'string' || typeof options.videoBitrate === 'number') {
          command.videoBitrate(options.videoBitrate);
        } else {
          logger.warn(`Invalid videoBitrate: ${options.videoBitrate}`);
        }
      }

      if (options.audioBitrate) {
        if (typeof options.audioBitrate === 'string' || typeof options.audioBitrate === 'number') {
          command.audioBitrate(options.audioBitrate);
        } else {
          logger.warn(`Invalid audioBitrate: ${options.audioBitrate}`);
        }
      }

      if (options.width || options.height) {
        const width = parseInt(options.width, 10) || '?';
        const height = parseInt(options.height, 10) || '?';
        // fluent-ffmpeg's .size() method handles aspect ratio correctly with '?'
        if (width > 0 || height > 0) {
          command.size(`${width}x${height}`);
        } else {
          logger.warn(`Invalid resolution: ${width}x${height}`);
        }
      }

      // Apply thread count if specified
      if (options.threads) {
        const threads = parseInt(options.threads, 10);
        if (threads > 0) {
          command.addOption('-threads', threads.toString());
        } else {
          logger.warn(`Invalid thread count: ${options.threads}`);
        }
      }

      return command;
    } catch (err) {
      logger.error(`Failed to apply preset options for ${preset}: ${err.message}`, { options, error: err });
      throw new Error(`Failed to apply preset options: ${err.message}`);
    } // Removed the hardcoded PRESETS object and its validation
  }

  /**
   * Validate video options
   * @private
   */
  _validateVideoOptions(options = {}) {
    const errors = [];
    
    if (options.width && (isNaN(options.width) || options.width <= 0)) {
      errors.push('Width must be a positive number');
    }
    
    if (options.height && (isNaN(options.height) || options.height <= 0)) {
      errors.push('Height must be a positive number');
    }
    
    if (options.fps && (isNaN(options.fps) || options.fps <= 0)) {
      errors.push('FPS must be a positive number');
    }
    
    if (errors.length > 0) {
      throw new Error(`Invalid video options: ${errors.join(', ')}`);
    }
  }

  /**
   * Validate audio options
   * @private
   */
  _validateAudioOptions(options = {}) {
    const errors = [];
    
    if (options.bitrate && (isNaN(options.bitrate) || options.bitrate <= 0)) {
      errors.push('Bitrate must be a positive number');
    }
    
    if (options.channels && (isNaN(options.channels) || options.channels <= 0)) {
      errors.push('Channels must be a positive number');
    }
    
    if (errors.length > 0) {
      throw new Error(`Invalid audio options: ${errors.join(', ')}`);
    }
  }

  /**
   * Validate image options
   * @private
   */
  _validateImageOptions(options = {}) {
    const errors = [];
    
    if (options.quality && (isNaN(options.quality) || options.quality < 0 || options.quality > 100)) {
      errors.push('Quality must be between 0 and 100');
    }
    
    if (options.width && (isNaN(options.width) || options.width <= 0)) {
      errors.push('Width must be a positive number');
    }
    
    if (options.height && (isNaN(options.height) || options.height <= 0)) {
      errors.push('Height must be a positive number');
    }
    
    if (errors.length > 0) {
      throw new Error(`Invalid image options: ${errors.join(', ')}`);
    }
  }
}

export default new ConversionService();
