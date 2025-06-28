import fs from 'fs-extra';
import path from 'path';
import { promisify } from 'util'; // Correct import for ES modules
import { exec } from 'child_process';
import logger from './logger.js';

const execAsync = promisify(exec);

// File operation constants
const FILE_OPERATION_RETRIES = 3;
const FILE_OPERATION_RETRY_DELAY = 1000; // 1 second

/**
 * Parse file size string (e.g., '500MB') to bytes
 */
export const parseFileSize = (size) => {
  if (!size) return 500 * 1024 * 1024; // Default to 500MB
  
  const match = size.toString().match(/^(\d+)([kmg]?b?)?$/i);
  if (!match) return 500 * 1024 * 1024;
  
  const num = parseInt(match[1], 10);
  if (isNaN(num)) return 500 * 1024 * 1024;
  
  const unit = (match[2] || '').toLowerCase().charAt(0);
  const multipliers = {
    '': 1,          // bytes
    'k': 1024,      // kilobytes
    'm': 1024 * 1024, // megabytes
    'g': 1024 * 1024 * 1024 // gigabytes
  };
  
  const multiplier = multipliers[unit] || 1;
  const result = num * multiplier;
  
  return Number.isSafeInteger(result) ? result : Number.MAX_SAFE_INTEGER;
};

// Helper functions for JSON file operations (moved from server.js)
export async function readJsonFile(filePath, defaultValue) {
  try {
    // Use fs.access to check for file existence without throwing an error if it doesn't exist
    if (!await fs.access(filePath).then(() => true).catch(() => false)) {
      await fs.writeJson(filePath, defaultValue, { spaces: 2 });
      return defaultValue;
    }
    return await fs.readJson(filePath);
  } catch (error) {
    logger.error(`Error reading JSON file ${filePath}:`, error);
    return defaultValue;
  }
}

export async function writeJsonFile(filePath, data) {
  try {
    await fs.writeJson(filePath, data, { spaces: 2 });
    return true;
  } catch (error) {
    logger.error(`Error writing JSON file ${filePath}:`, error);
    return false;
  }
}

/**
 * Generate a unique output filename
 */
export const generateOutputFilename = (originalFilename, preset, options = {}) => {
  if (options.customOutputName) {
    // If a custom output name is provided, use it directly
    const customExt = path.extname(options.customOutputName);
    if (customExt) {
      return options.customOutputName;
    }
    // If no extension in custom name, append one based on preset
    return `${options.customOutputName}.${preset}`;
  }

  const baseName = path.parse(originalFilename).name;
  // Use the preset as the extension directly, as it often corresponds to the output format
  // Fallback to 'bin' if preset is not a valid extension
  const ext = preset.toLowerCase() || 'bin';
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  
  return `${baseName}-${timestamp}-${random}.${ext}`;
};

/**
 * Check if directory exists and is writable
 */
export const checkDirectory = async (dir) => {
  try {
    await fs.access(dir, fs.constants.R_OK | fs.constants.W_OK);
    return { exists: true, writable: true };
  } catch (error) {
    return { 
      exists: false, 
      writable: false, 
      error: error.message 
    };
  }
};

/**
 * Get file stats if file exists
 */
export const getFileStats = async (filePath) => {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

/**
 * Get FFmpeg version information
 */
export const getFFmpegVersion = async () => {
  try {
    const { stdout } = await execAsync('ffmpeg -version');
    return {
      available: true,
      version: stdout.split('\n')[0] || 'unknown',
      details: stdout.split('\n').slice(0, 5).join('\n')
    };
  } catch (error) {
    return {
      available: false,
      error: error.message,
      version: 'unknown'
    };
  }
};

/**
 * Retry a file operation with exponential backoff
 */
const retryFileOperation = async (operation, operationName, maxRetries = FILE_OPERATION_RETRIES) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delay = FILE_OPERATION_RETRY_DELAY * Math.pow(2, attempt - 1);
        logger.warn(`Retry ${attempt}/${maxRetries} for ${operationName} after ${delay}ms`, { error: error.message });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
};

/**
 * Clean up old files in a directory with retry logic and better error handling
 */
export const cleanupOldFiles = async (dir, maxAgeMs) => {
  let deletedCount = 0;
  let errorCount = 0;
  
  try {
    const files = await retryFileOperation(
      () => fs.readdir(dir),
      `readdir ${dir}`
    );
    
    const now = Date.now();
    
    await Promise.all(files.map(async (file) => {
      const filePath = path.join(dir, file);
      
      try {
        const stats = await retryFileOperation(
          () => fs.stat(filePath),
          `stat ${filePath}`
        );
        
        if (now - stats.mtimeMs > maxAgeMs) {
          await retryFileOperation(
            () => fs.remove(filePath),
            `remove ${filePath}`
          );
          deletedCount++;
          logger.debug(`Cleaned up old file: ${filePath}`);
        }
      } catch (error) {
        errorCount++;
        logger.error(`Error processing file ${filePath}:`, error);
      }
    }));
    
    return { deletedCount, errorCount };
  } catch (error) {
    logger.error(`Error reading directory ${dir}:`, error);
    throw error;
  }
};

export default {
  parseFileSize,
  generateOutputFilename,
  checkDirectory,
  getFileStats,
  getFFmpegVersion,
  cleanupOldFiles
};
