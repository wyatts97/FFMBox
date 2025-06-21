import dotenv from 'dotenv';
dotenv.config();  // Keep only one config call

import { createServer } from 'http';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import ffmpeg from 'fluent-ffmpeg';
import { WebSocket, WebSocketServer } from 'ws';  // Import both WebSocket and WebSocketServer
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

// ES modules equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Validate required environment variables
const requiredEnvVars = ['PORT', 'UPLOAD_DIR', 'OUTPUT_DIR'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`Error: Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// Configuration
const app = express();
const PORT = parseInt(process.env.PORT, 10) || 5500;
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR);
const OUTPUT_DIR = path.resolve(process.env.OUTPUT_DIR);
const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE || '500MB';
const FFMPEG_THREADS = parseInt(process.env.FFMPEG_THREADS, 10) || 2;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Ensure directories exist with proper permissions
const ensureDirectories = () => {
  try {
    // Create directories if they don't exist
    fs.ensureDirSync(UPLOAD_DIR);
    fs.ensureDirSync(OUTPUT_DIR);
    
    // Set directory permissions (read/write/execute for owner and group, read/execute for others)
    fs.chmodSync(UPLOAD_DIR, 0o755);
    fs.chmodSync(OUTPUT_DIR, 0o755);
    
    // Only try to change ownership if running as root
    if (process.getuid && process.getuid() === 0) {
      // Use node user (UID 1000) which is common in Node.js Docker images
      const uid = 1000;
      const gid = 1000;
      fs.chownSync(UPLOAD_DIR, uid, gid);
      fs.chownSync(OUTPUT_DIR, uid, gid);
    }
    
    console.log(`Directory permissions set successfully`);
    return true;
  } catch (error) {
    console.error('Error setting up directories:', error);
    return false;
  }
};

// Initialize directories
if (!ensureDirectories()) {
  console.error('Failed to initialize required directories. Exiting...');
  process.exit(1);
}

// Log configuration
console.log('Server configuration:');
console.log(`- Port: ${PORT}`);
console.log(`- Upload directory: ${UPLOAD_DIR}`);
console.log(`- Output directory: ${OUTPUT_DIR}`);
console.log(`- Max file size: ${MAX_FILE_SIZE}`);
console.log(`- FFmpeg threads: ${FFMPEG_THREADS}`);
console.log(`- CORS Origin: ${CORS_ORIGIN}`);

// Middleware
const corsOptions = {
  origin: CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN.split(',').map(origin => origin.trim()),
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));
app.use(express.json({ limit: MAX_FILE_SIZE }));
app.use(express.urlencoded({ extended: true, limit: MAX_FILE_SIZE }));

// Static file serving with cache control
app.use('/output', express.static(OUTPUT_DIR, {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    return res.status(400).json({
      error: 'File upload error',
      message: err.message
    });
  } else if (err) {
    // An unknown error occurred
    return res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
    });
  }
  
  next();
});

// Allowed MIME types and their corresponding extensions
const ALLOWED_MIME_TYPES = {
  // Video
  'video/mp4': '.mp4',
  'video/x-msvideo': '.avi',
  'video/quicktime': '.mov',
  'video/x-matroska': '.mkv',
  'video/webm': '.webm',
  // Audio
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'audio/aac': '.aac',
  'audio/flac': '.flac',
  // Images
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
  'image/tiff': '.tiff',
  'image/bmp': '.bmp',
};

// File upload setup with secure filename generation
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    // Only keep alphanumeric chars in filename for security
    const safeName = file.originalname.replace(/[^\w\-\.]/g, '_');
    cb(null, `${uniqueSuffix}-${safeName}`);
  }
});

// File filter function with MIME type and extension validation
function fileFilter(req, file, cb) {
  try {
    // Check if MIME type is allowed
    const allowedTypes = Object.keys(ALLOWED_MIME_TYPES);
    const isAllowed = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        // Handle wildcard MIME types
        return file.mimetype.startsWith(type.split('/*')[0]);
      }
      return file.mimetype === type;
    });

    if (!isAllowed) {
      return cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }


    // Verify file extension is valid and matches MIME type
    const fileExt = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = new Set(Object.values(ALLOWED_MIME_TYPES));
    
    if (!allowedExtensions.has(fileExt)) {
      return cb(new Error(`Invalid file extension: ${fileExt}`), false);
    }

    // Additional security checks on filename
    if (!file.originalname.match(/^[\w\- .]+\.[a-zA-Z0-9]+$/)) {
      return cb(new Error('Invalid file name'), false);
    }

    // Check file size if needed
    // if (file.size > MAX_FILE_SIZE) {
    //   return cb(new Error('File size too large'), false);
    // }


    cb(null, true);
  } catch (error) {
    console.error('Error in file filter:', error);
    cb(error, false);
  }
}

// Parse max file size (e.g., '500MB' -> 500 * 1024 * 1024)
function parseFileSize(size) {
  if (!size) return 500 * 1024 * 1024; // Default to 500MB
  
  const match = size.toString().match(/^(\d+)([kmg]?b?)?$/i);
  if (!match) return 500 * 1024 * 1024; // Default to 500MB on invalid format
  
  const num = parseInt(match[1], 10);
  if (isNaN(num)) return 500 * 1024 * 1024; // Default to 500MB on invalid number
  
  const unit = (match[2] || '').toLowerCase().charAt(0);
  
  const multipliers = {
    '': 1,
    'k': 1024,
    'm': 1024 * 1024,
    'g': 1024 * 1024 * 1024
  };
  
  const multiplier = multipliers[unit] || 1;
  const result = num * multiplier;
  
  // Check for overflow
  if (!Number.isSafeInteger(result)) {
    return Number.MAX_SAFE_INTEGER; // Return max safe integer if overflow
  }
  
  return result;
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseFileSize(MAX_FILE_SIZE),
    files: 5,
    fieldNameSize: 200,
    fieldSize: 10 * 1024 * 1024 // 10MB max field size
  }
}).array('files');

// Create HTTP server
const httpServer = createServer(app);

// Export the app for testing (will be overridden in non-test environments)
let exported = { app, server: httpServer };
if (process.env.NODE_ENV !== 'test') {
  exported = null;
}

// Create WebSocket server
const wss = new WebSocketServer({
  server: httpServer,
  clientTracking: true,
  perMessageDeflate: {
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    serverMaxWindowBits: 10,
    concurrencyLimit: 10,
    threshold: 1024
  }
});

// Track active connections and conversions
const activeConversions = new Map();
const activeClients = new Set();
const RECONNECT_INTERVAL = 5000; // 5 seconds

// Track connection statistics
const stats = {
  totalConnections: 0,
  activeConnections: 0,
  messagesSent: 0,
  errors: 0
};

// Heartbeat to keep connections alive
const heartbeat = (ws) => {
  ws.isAlive = true;
};

/**
 * Broadcast progress to all subscribed clients
 * @param {string} conversionId - The ID of the conversion
 * @param {Object} data - Progress data to send
 */
function broadcastProgress(conversionId, data) {
  if (!conversionId || !data) return;
  
  const message = JSON.stringify({
    type: 'progress',
    conversionId,
    timestamp: new Date().toISOString(),
    ...data
  });
  
  let recipients = 0;
  
  wss.clients.forEach((client) => {
    try {
      if (
        client.readyState === WebSocket.OPEN && 
        client.subscriptions && 
        client.subscriptions.has(conversionId)
      ) {
        client.send(message);
        recipients++;
        stats.messagesSent++;
      }
    } catch (err) {
      console.error(`Error sending to client ${client.clientId || 'unknown'}:`, err);
      stats.errors++;
    }
  });
  
  if (recipients > 0) {
    console.log(`[WebSocket] Sent update for ${conversionId} to ${recipients} client(s)`);
  }
}

// FFmpeg Preset Configuration
const PRESETS = {
  // Video presets
  'mp4': {
    format: 'mp4',
    videoCodec: 'libx264',
    audioCodec: 'aac',
    outputOptions: ['-movflags +faststart', '-crf 23', '-preset medium', '-profile:v high', '-pix_fmt yuv420p'],
    description: 'Standard MP4 with H.264 video and AAC audio',
    category: 'video'
  },
  'mp4-hq': {
    format: 'mp4',
    videoCodec: 'libx264',
    audioCodec: 'aac',
    outputOptions: ['-movflags +faststart', '-crf 18', '-preset slower', '-profile:v high', '-pix_fmt yuv420p'],
    description: 'High quality MP4 with better compression (larger file size)',
    category: 'video'
  },
  'webm': {
    format: 'webm',
    videoCodec: 'libvpx-vp9',
    audioCodec: 'libopus',
    outputOptions: ['-b:v 1M', '-crf 30', '-deadline good', '-cpu-used 2'],
    description: 'WebM with VP9 video and Opus audio',
    category: 'video'
  },
  'gif': {
    format: 'gif',
    videoFilters: [
      'fps=15',
      'scale=640:-1:flags=lanczos',
      'split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse'
    ],
    description: 'Animated GIF with optimized palette',
    category: 'video'
  },
  'audio-extract': {
    noVideo: true,
    format: 'mp3',
    audioCodec: 'libmp3lame',
    audioQuality: 3,
    description: 'Extract audio as MP3',
    category: 'audio'
  },
  'mute': {
    noAudio: true,
    format: 'mp4',
    videoCodec: 'libx264',
    outputOptions: ['-crf 23'],
    description: 'Video with audio removed',
    category: 'video'
  },
  
  // Image presets
  'webp': {
    format: 'webp',
    outputOptions: ['-quality 85', '-compression_level 6'],
    description: 'WebP image format',
    category: 'image'
  },
  'jpeg': {
    format: 'mjpeg',
    outputOptions: ['-q:v 85', '-pix_fmt yuvj420p'],
    description: 'JPEG image format',
    category: 'image'
  },
  'png': {
    format: 'png',
    outputOptions: ['-compression_level 9'],
    description: 'PNG image format',
    category: 'image'
  },
  'avif': {
    format: 'avif',
    outputOptions: ['-qp 23', '-speed 6'],
    description: 'AVIF image format',
    category: 'image'
  }
};

// FFmpeg Command Builder
function createFFmpegCommand(input, output, preset, options = {}) {
  // Validate input and output paths
  if (!input || !output) {
    throw new Error('Input and output paths are required');
  }

  // Handle custom command
  if (preset === 'custom' && options.customCommand) {
    return handleCustomCommand(input, output, options.customCommand);
  }
  
  // Get preset config or use default for standard presets
  const presetConfig = getPresetConfig(preset, options);
  
  // Initialize command with input
  const command = ffmpeg(input);
  
  try {
    // Apply format-specific options
    applyFormatOptions(command, preset, options, presetConfig);
    
    // Apply common video/audio options
    applyCommonOptions(command, options, presetConfig);
    
    // Set output format and path
    const outputExt = path.extname(output).substring(1);
    command.format(outputExt || presetConfig.format || 'mp4');
    command.output(output);
    
    return command;
  } catch (error) {
    console.error('Error creating FFmpeg command:', error);
    throw new Error(`Failed to create FFmpeg command: ${error.message}`);
  }
}

// Allowed FFmpeg flags and options
const ALLOWED_FFMPEG_FLAGS = new Set([
  // Input/Output
  '-i', '-f', '-y', '-n', '-c', '-codec', '-t', '-ss', '-to', '-fs', '-map',
  // Video
  '-vcodec', '-vframes', '-r', '-s', '-aspect', '-vn', '-vcodec', '-vf', '-b:v', '-q:v',
  // Audio
  '-acodec', '-aq', '-ar', '-ac', '-an', '-ab', '-vol',
  // Subtitle
  '-scodec', '-sn',
  // Advanced
  '-preset', '-crf', '-b', '-minrate', '-maxrate', '-bufsize', '-g', '-keyint_min'
]);

// Handle custom FFmpeg command with security validation
function handleCustomCommand(input, output, customCommand) {
  if (typeof customCommand !== 'string') {
    throw new Error('Invalid custom command: must be a string');
  }

  // Basic validation to prevent command injection
  const dangerousChars = [';', '&', '|', '`', '$', '>', '<', '~'];
  if (dangerousChars.some(char => customCommand.includes(char))) {
    throw new Error('Invalid characters in custom command');
  }

  const args = customCommand
    .split(' ')
    .filter(arg => arg.trim() !== '');
  
  // Remove 'ffmpeg' if present
  if (args[0] === 'ffmpeg') {
    args.shift();
  }
  
  const command = ffmpeg();
  let inputApplied = false;
  let outputApplied = false;
  
  // Validate and process arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    // Skip empty arguments
    if (!arg.trim()) continue;
    
    // Handle input file
    if (arg === '-i' && args[i + 1]) {
      const inputFile = args[++i];
      // Validate input file path
      if (typeof inputFile !== 'string' || !inputFile.trim()) {
        throw new Error('Invalid input file specified');
      }
      command.input(inputFile);
      inputApplied = true;
      continue;
    }
    
    // Handle output file (last argument)
    if (i === args.length - 1 && !outputApplied) {
      // We'll use our own output path for security
      outputApplied = true;
      continue;
    }
    
    // Validate flags
    if (arg.startsWith('-') && !ALLOWED_FFMPEG_FLAGS.has(arg.split('=')[0])) {
      throw new Error(`Disallowed FFmpeg flag: ${arg.split('=')[0]}`);
    }
    
    // Add validated arguments
    command.outputOptions(arg);
  }
  
  // If input wasn't specified in the command, use the provided input
  if (!inputApplied) {
    command.input(input);
  }
  
  // If output wasn't specified in the command, use the provided output
  if (!outputApplied) {
    command.output(output);
  }
  
  // Handle format-specific options
  const isImage = ['jpeg', 'jpg', 'png', 'webp', 'avif', 'gif'].includes(preset);
  const quality = options.quality || (isImage ? 85 : undefined);
  
  // Apply preset configurations
  if (preset === 'mp4' || preset === 'mp4-hq') {
    command
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions('-movflags +faststart');
      
    if (preset === 'mp4-hq') {
      command.outputOptions('-preset slow', '-crf 18');
    } else {
      command.outputOptions('-crf 23');
    }
  } else if (preset === 'webm') {
    command
      .videoCodec('libvpx-vp9')
      .audioCodec('libopus')
      .outputOptions('-b:v 0', '-crf 30');
  } else if (preset === 'gif') {
    command
      .videoCodec('gif')
      .outputOptions('-f gif');
  } else if (preset === 'webp' || preset === 'avif') {
    command.outputOptions(`-quality ${quality || 75}`);
    if (options.lossless) command.outputOptions('-lossless 1');
  } else if (preset === 'jpeg') {
    command.outputOptions(`-q:v ${quality || 90}`);
    if (options.progressive) command.outputOptions('-progressive 1');
  } else if (preset === 'png') {
    command.outputOptions(`-compression_level ${options.compressionLevel || 9}`);
    if (options.interlaced) command.outputOptions('-interlace Plane');
  }
  
  // Apply video bitrate if specified
  if (options.videoBitrate) {
    command.videoBitrate(options.videoBitrate);
  }
  
  return command;
}

// Get preset configuration with defaults
function getPresetConfig(preset, options) {
  const defaultConfig = {
    format: preset,
    videoCodec: 'libx264',
    audioCodec: 'aac',
    outputOptions: []
  };

  const presetConfig = {
    ...defaultConfig,
    ...PRESETS[preset] || {},
    ...options
  };

  // Set format-specific defaults
  switch (preset) {
    case 'webm':
      presetConfig.videoCodec = 'libvpx-vp9';
      presetConfig.audioCodec = 'libopus';
      break;
    case 'gif':
      presetConfig.videoCodec = 'gif';
      presetConfig.outputOptions.push('-f gif');
      break;
    case 'webp':
    case 'avif':
      presetConfig.outputOptions.push(`-quality ${options.quality || 75}`);
      if (options.lossless) presetConfig.outputOptions.push('-lossless 1');
      break;
    case 'jpeg':
      presetConfig.outputOptions.push(`-q:v ${options.quality || 90}`);
      if (options.progressive) presetConfig.outputOptions.push('-progressive 1');
      break;
    case 'png':
      presetConfig.outputOptions.push(`-compression_level ${options.compressionLevel || 9}`);
      if (options.interlaced) presetConfig.outputOptions.push('-interlace Plane');
      break;
  }

  return presetConfig;
}

// Apply format-specific options
function applyFormatOptions(command, preset, options, presetConfig) {
  // Apply preset if specified
  if (options.preset) {
    command.preset(options.preset);
  }
}

function applyCommonOptions(command, options, presetConfig) {
  // Apply video codec
  if (presetConfig.videoCodec) {
    command.videoCodec(presetConfig.videoCodec);
  }

  // Apply audio codec
  if (presetConfig.audioCodec) {
    command.audioCodec(presetConfig.audioCodec);
  }

  // Apply additional output options
  if (presetConfig.outputOptions && presetConfig.outputOptions.length > 0) {
    if (Array.isArray(presetConfig.outputOptions)) {
      command.outputOptions(presetConfig.outputOptions);
    } else if (typeof presetConfig.outputOptions === 'string') {
      command.outputOptions(presetConfig.outputOptions.split(' '));
    }
  }

  // Apply video filters if specified
  if (presetConfig.videoFilters) {
    command.videoFilters(presetConfig.videoFilters);
  }

  // Apply preset if specified
  if (options.preset) {
    command.preset(options.preset);
  }

  // Apply dimensions if specified
  if (options.width || options.height) {
    command.size(`${options.width || '?'}x${options.height || '?'}`);
  }

  // Apply FPS if specified
  if (options.fps) {
    command.fps(options.fps);
  }

  // Apply quality if specified
  if (options.quality !== undefined) {
    command.outputOptions(`-q:v ${options.quality}`);
  }

  // Apply audio bitrate if specified
  if (options.audioBitrate) {
    command.audioBitrate(options.audioBitrate);
  }

  // Apply video bitrate if specified
  if (options.videoBitrate) {
    command.videoBitrate(options.videoBitrate);
  }
  
  return command;
}

function generateOutputFilename(originalFilename, preset) {
  const baseName = path.parse(originalFilename).name;
  const ext = path.extname(originalFilename).toLowerCase();
  
  // Map presets to file extensions
  const extensions = {
    // Video formats
    mp4: 'mp4',
    webm: 'webm',
    gif: 'gif',
    'audio-extract': 'mp3',
    mute: 'mp4',
    
    // Image formats
    jpeg: 'jpg',
    jpg: 'jpg',
    png: 'png',
    webp: 'webp',
    avif: 'avif',
    tiff: 'tif',
    bmp: 'bmp',
    
    // Special cases
    'image-optimized': ext === '.gif' ? 'gif' : 'webp',
    'image-lossless': ext === '.png' ? 'png' : 'webp'
  };
  
  // If preset is a known format, use it, otherwise use the preset as extension
  const outputExt = extensions[preset] || preset || 'bin';
  
  return `${baseName}-${preset}-${Date.now()}.${outputExt}`;
}

// API Endpoints
app.get('/api/ffmpeg-status', (req, res) => {
  ffmpeg.getAvailableFormats((err, formats) => {
    const imageFormats = ['jpeg', 'jpg', 'png', 'webp', 'avif', 'gif', 'tiff', 'bmp'];
    const supportedFormats = {
      video: ['mp4', 'webm', 'mov', 'mkv', 'avi', 'flv', 'mpeg', 'mpg'],
      audio: ['mp3', 'aac', 'wav', 'ogg', 'flac', 'm4a'],
      image: imageFormats,
      document: ['pdf', 'doc', 'docx', 'txt', 'rtf']
    };
    
    res.json({
      available: !err,
      version: err ? null : ffmpeg.version(),
      formats: {
        video: supportedFormats.video,
        audio: supportedFormats.audio,
        image: supportedFormats.image,
        document: supportedFormats.document
      },
      presets: {
        video: ['mp4', 'webm', 'gif', 'mute'],
        audio: ['audio-extract', 'mp3', 'aac'],
        image: ['webp', 'jpeg', 'png', 'avif', 'tiff', 'bmp', 'image-optimized', 'image-lossless']
      },
      options: {
        quality: { min: 1, max: 100, default: 85, description: 'Image quality (1-100)' },
        width: { type: 'number', description: 'Resize width in pixels' },
        height: { type: 'number', description: 'Resize height in pixels' },
        maintainAspect: { type: 'boolean', default: true, description: 'Maintain aspect ratio when resizing' },
        padColor: { type: 'string', default: 'black', description: 'Background color when maintaining aspect ratio' },
        compressionLevel: { min: 0, max: 9, default: 6, description: 'Compression level (0-9)' },
        lossless: { type: 'boolean', default: false, description: 'Use lossless compression (WebP)' },
        progressive: { type: 'boolean', default: true, description: 'Use progressive encoding (JPEG)' },
        subsample: { type: 'number', default: 6, min: 1, max: 6, description: 'Chroma subsampling (1-6)' },
        speed: { type: 'number', default: 6, min: 0, max: 8, description: 'Speed/quality tradeoff (0=best quality, 8=fastest)' }
      }
    });
  });
});

app.post('/api/upload', (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ 
          error: 'File too large',
          message: `File size exceeds the limit of ${MAX_FILE_SIZE}`
        });
      }
      if (err.code === 'LIMIT_FILE_TYPES') {
        return res.status(415).json({ 
          error: 'Invalid file type',
          message: err.message
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          error: 'Too many files',
          message: 'Maximum 5 files allowed per request'
        });
      }
      if (err.code === 'LIMIT_FIELD_KEY') {
        return res.status(400).json({
          error: 'Field name too long',
          message: 'Field name exceeds maximum length'
        });
      }
      if (err.code === 'LIMIT_FIELD_VALUE') {
        return res.status(413).json({
          error: 'Field value too large',
          message: 'Field value exceeds maximum size'
        });
      }
      
      console.error('Upload error:', err);
      return res.status(500).json({
        error: 'Upload failed',
        message: 'An error occurred while uploading files'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        error: 'No files uploaded',
        message: 'Please select at least one file to upload'
      });
    }

    const fileInfos = req.files.map(file => ({
      id: uuidv4(),
      filename: file.filename,
      originalname: file.originalname,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
      created: new Date(),
      downloadUrl: `/output/${file.filename}`
    }));

    res.status(201).json({
      message: 'Files uploaded successfully',
      files: fileInfos,
      count: fileInfos.length
    });
  });
});

app.post('/api/convert', async (req, res) => {
  const { fileId, filename, preset, options = {} } = req.body;
  const inputPath = path.join(UPLOAD_DIR, filename);
  const outputFilename = generateOutputFilename(filename, preset);
  const outputPath = path.join(OUTPUT_DIR, outputFilename);
  const conversionId = uuidv4();
  
  // Initialize conversion object with all required properties
  const conversion = {
    id: conversionId,
    input: filename,
    output: outputFilename,
    preset,
    status: 'pending',
    progress: 0,
    startTime: new Date(),
    endTime: null,
    error: null,
    options: { ...options } // Store the options for reference
  };
  
  // Store the conversion in active conversions
  activeConversions.set(conversionId, conversion);
  
  try {
    if (!await fs.pathExists(inputPath)) {
      throw new Error('Input file not found');
    }
    
    // Create the FFmpeg command with all required parameters
    const command = createFFmpegCommand(inputPath, outputPath, preset, options);
    
    // Update conversion status to processing
    conversion.status = 'processing';
    activeConversions.set(conversionId, conversion);
    
    // Broadcast initial progress
    broadcastProgress(conversionId, {
      status: 'processing',
      progress: 0,
      timemark: '00:00:00.00'
    });
    
    command
      .on('start', (commandLine) => {
        console.log(`[${conversionId}] FFmpeg command: ${commandLine}`);
        console.log(`[${conversionId}] Starting conversion: ${filename} -> ${outputFilename}`);
        conversion.status = 'processing';
        activeConversions.set(conversionId, conversion);
        broadcastProgress(conversionId, conversion);
      })
      .on('progress', (progress) => {
        const percent = Math.round(progress.percent) || 0;
        conversion.progress = percent;
        conversion.timemark = progress.timemark;
        conversion.frames = progress.frames;
        conversion.status = 'processing';
        activeConversions.set(conversionId, conversion);
        broadcastProgress(conversionId, conversion);
      })
      .on('end', () => {
        const endTime = new Date();
        const duration = (endTime - conversion.startTime) / 1000; // in seconds
        
        console.log(`[${conversionId}] Conversion completed in ${duration.toFixed(2)}s`);
        
        // Get file stats for the output
        fs.stat(outputPath, (err, stats) => {
          if (err) {
            console.error(`[${conversionId}] Error getting output file stats:`, err);
          }
          
          const result = {
            id: conversionId,
            status: 'completed',
            input: filename,
            output: outputFilename,
            size: stats?.size || 0,
            duration: duration,
            downloadUrl: `/output/${outputFilename}`,
            completedAt: endTime.toISOString()
          };
          
          // Send final progress update
          broadcastProgress(conversionId, { ...conversion, ...result });
          
          // Clean up
          activeConversions.delete(conversionId);
        });
      })
      .on('error', (err, stdout, stderr) => {
        console.error(`[${conversionId}] Conversion error:`, err);
        console.error(`[${conversionId}] FFmpeg stderr:`, stderr);
        
        const errorInfo = {
          id: conversionId,
          status: 'error',
          error: 'Conversion failed',
          message: err.message,
          code: err.code,
          stderr: stderr,
          input: filename,
          output: outputFilename
        };
        
        // Send error update
        broadcastProgress(conversionId, { ...conversion, ...errorInfo });
        
        // Clean up
        activeConversions.delete(conversionId);
      })
      .run();
    
    // Respond immediately with conversion ID
    res.status(202).json({
      id: conversionId,
      status: 'queued',
      message: 'Conversion started',
      progressUrl: `/api/conversion/${conversionId}/progress`,
      outputFilename
    });

  } catch (err) {
    console.error('Conversion error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/conversion/:id', (req, res) => {
  const conversion = activeConversions.get(req.params.id);
  res.json(conversion || { error: 'Conversion not found' });
});

// Enhanced health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check if directories exist and are writable
    const checkDir = (dir) => {
      try {
        fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK);
        return { exists: true, writable: true };
      } catch (err) {
        console.error(`Directory check failed for ${dir}:`, err);
        return { exists: false, writable: false, error: err.message };
      }
    };

    const uploadsCheck = checkDir(UPLOAD_DIR);
    const outputCheck = checkDir(OUTPUT_DIR);

    const isHealthy = uploadsCheck.writable && outputCheck.writable;

    // Get FFmpeg version info
    let ffmpegInfo = { available: false };
    try {
      const { execSync } = await import('child_process');
      let ffmpegVersionStr = '';
      try {
        ffmpegVersionStr = execSync('ffmpeg -version').toString().split('\n')[0];
        ffmpegInfo = {
          available: true,
          version: ffmpegVersionStr
        };
      } catch (e) {
        console.error('FFmpeg version check failed:', e);
        ffmpegInfo = {
          available: false,
          error: e.message,
          version: 'unknown'
        };
      }
    } catch (err) {
      console.error('FFmpeg version check failed:', err);
      ffmpegInfo = {
        available: false,
        error: err.message,
        version: 'unknown'
      };
    }

    res.status(isHealthy ? 200 : 503).json({ 
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      ffmpeg: ffmpegInfo,
      directories: {
        uploads: {
          path: UPLOAD_DIR,
          ...uploadsCheck
        },
        output: {
          path: OUTPUT_DIR,
          ...outputCheck
        }
      }
    });
  } catch (err) {
    console.error('Health check error:', err);
    res.status(500).json({ 
      status: 'error',
      error: 'Health check failed',
      message: err.message 
    });
  }
});

// Clean up old files
app.post('/api/cleanup', async (req, res) => {
  try {
    const { maxAgeHours = 24 } = req.body;
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000; // Convert hours to milliseconds
    const now = Date.now();
    let deletedCount = 0;
    let errorCount = 0;

    // Clean up uploads directory
    const uploadFiles = await fs.readdir(UPLOAD_DIR);
    for (const file of uploadFiles) {
      try {
        const filePath = path.join(UPLOAD_DIR, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtimeMs > maxAgeMs) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      } catch (err) {
        console.error(`Error deleting file ${file}:`, err);
        errorCount++;
      }
    }

    // Clean up output directory
    const outputFiles = await fs.readdir(OUTPUT_DIR);
    for (const file of outputFiles) {
      try {
        const filePath = path.join(OUTPUT_DIR, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtimeMs > maxAgeMs) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      } catch (err) {
        console.error(`Error deleting file ${file}:`, err);
        errorCount++;
      }
    }

    res.json({
      message: 'Cleanup completed',
      deletedCount,
      errorCount,
      maxAgeHours
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      error: 'Cleanup failed',
      message: error.message
    });
  }
});

// Set up WebSocket heartbeat interval (30 seconds)
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log(`[WebSocket] Terminating inactive connection: ${ws.clientId || 'unknown'}`);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping(() => {});
  });
}, HEARTBEAT_INTERVAL);

// Clean up interval on server close
wss.on('close', () => {
  clearInterval(interval);
  console.log('WebSocket server closed');
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  const clientId = uuidv4();
  const ip = req.socket.remoteAddress;
  
  // Initialize client state
  ws.isAlive = true;
  ws.clientId = clientId;
  ws.ip = ip;
  ws.subscriptions = new Set();
  
  // Add to active clients
  activeClients.add(ws);
  
  // Update stats
  stats.totalConnections++;
  stats.activeConnections++;
  
  console.log(`[WebSocket] Client connected: ${clientId} (${ip}), Total: ${stats.activeConnections}`);
  
  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Handle heartbeat
      if (data.type === 'ping') {
        return ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      }
      
      // Handle subscription
      if (data.type === 'subscribe' && data.conversionId) {
        ws.subscriptions.add(data.conversionId);
        console.log(`[WebSocket] Client ${clientId} subscribed to ${data.conversionId}`);
        
        // Send current progress if available
        const conversion = activeConversions.get(data.conversionId);
        if (conversion) {
          ws.send(JSON.stringify({
            type: 'progress',
            conversionId: data.conversionId,
            ...conversion
          }));
        }
        
        return;
      }
      
      // Handle unsubscription
      if (data.type === 'unsubscribe' && data.conversionId) {
        ws.subscriptions.delete(data.conversionId);
        console.log(`[WebSocket] Client ${clientId} unsubscribed from ${data.conversionId}`);
        return;
      }
      
      // Handle other message types
      console.log(`[WebSocket] Received message from ${clientId}:`, data);
      
    } catch (err) {
      console.error(`[WebSocket] Error processing message from ${clientId || 'unknown'}:`, err);
      stats.errors++;
      
      // Send error back to client
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Invalid message format',
          message: err.message
        }));
      }
    }
  });
  
  // Handle pongs for heartbeat
  ws.on('pong', () => heartbeat(ws));
  
  // Handle client disconnection
  ws.on('close', () => {
    activeClients.delete(ws);
    stats.activeConnections--;
    console.log(`[WebSocket] Client disconnected: ${clientId}, Remaining: ${stats.activeConnections}`);
  });
  
  // Handle errors
  ws.on('error', (err) => {
    console.error(`[WebSocket] Error with client ${clientId}:`, err);
    stats.errors++;
  });
});

// Start server
httpServer.listen(PORT, '0.0.0.0', () => {
  // Log any uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
  });

  // Log unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║               FFMBox Server Started               ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║ Port:         ${PORT}${' '.repeat(36 - PORT.toString().length)}║`);
  console.log(`║ Uploads:      ${UPLOAD_DIR}${' '.repeat(36 - Math.min(UPLOAD_DIR.length, 36))}║`);
  console.log(`║ Outputs:      ${OUTPUT_DIR}${' '.repeat(36 - Math.min(OUTPUT_DIR.length, 36))}║`);
  console.log(`║ CORS Origin:  ${CORS_ORIGIN}${' '.repeat(36 - Math.min(CORS_ORIGIN.length, 36))}║`);
  console.log(`║ Max File Size: ${MAX_FILE_SIZE}${' '.repeat(35 - MAX_FILE_SIZE.length)}║`);
  console.log(`║ FFmpeg Threads: ${FFMPEG_THREADS}${' '.repeat(33 - FFMPEG_THREADS.toString().length)}║`);
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`Server started at: ${new Date().toISOString()}`);
});

// Handle server errors
httpServer.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

  // Handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// Log FFmpeg version
import { exec } from 'child_process';
console.log('\nFFmpeg version:');
exec('ffmpeg -version', (err, stdout) => {
  if (err) {
    console.error('Error getting FFmpeg version:', err);
    return;
  }
  console.log(stdout.split('\n').slice(0, 5).join('\n'));
});

console.log(`HTTP Server running on port ${PORT}`);
console.log(`WebSocket server active on port ${PORT}`);
console.log(`Health check available at http://localhost:${PORT}/api/health`);

// Export the app for testing
export const testExports = process.env.NODE_ENV === 'test' ? { app, server: httpServer } : null;