import dotenv from 'dotenv';
dotenv.config();  // Keep only one config call

import express from 'express';
import multer from 'multer';
import cors from 'cors';
import ffmpeg from 'fluent-ffmpeg';
import { WebSocketServer } from 'ws';  // Keep WebSocketServer import
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

// Allowed file types
const ALLOWED_FILE_TYPES = [
  'video/*',
  'audio/*',
  'image/*',
  'application/octet-stream' // For some video files
];

// File upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  const fileType = file.mimetype;
  const isValidType = ALLOWED_FILE_TYPES.some(type => {
    if (type.endsWith('/*')) {
      // Handle wildcard MIME types (e.g., video/*)
      return fileType.startsWith(type.split('/*')[0]);
    }
    return fileType === type;
  });

  if (!isValidType) {
    const error = new Error(`Invalid file type: ${fileType}. Only video, audio, and image files are allowed.`);
    error.code = 'LIMIT_FILE_TYPES';
    return cb(error, false);
  }
  
  cb(null, true);
};

// Parse max file size (e.g., '500MB' -> 500 * 1024 * 1024)
const parseFileSize = (size) => {
  const units = {
    'B': 1,
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024
  };
  
  const match = size.match(/^(\d+)(B|KB|MB|GB)$/i);
  if (!match) {
    return 500 * 1024 * 1024; // Default to 500MB
  }
  
  const [, value, unit] = match;
  return parseInt(value, 10) * units[unit.toUpperCase()];
};

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

// FFmpeg Command Builder
function createFFmpegCommand(input, output, preset, options = {}) {
  const isImage = ['jpeg', 'jpg', 'png', 'webp', 'avif', 'tiff', 'bmp', 'gif'].includes(
    path.extname(input).toLowerCase().substring(1)
  );

  let command = ffmpeg(input)
    .outputOptions([
      '-threads', FFMPEG_THREADS,
      '-preset', process.env.FFMPEG_PRESET || (isImage ? 'slow' : 'medium'),
      '-movflags', '+faststart'
    ]);

  // Common options
  const width = options.width || options.size?.split('x')[0];
  const height = options.height || options.size?.split('x')[1];
  const quality = options.quality || (isImage ? 85 : undefined);
  
  // Add resize filter if dimensions are provided
  if (width || height) {
    const scaleFilter = [];
    if (width && height) {
      scaleFilter.push(`scale=${width}:${height}:force_original_aspect_ratio=decrease`);
    } else if (width) {
      scaleFilter.push(`scale=${width}:-1`);
    } else if (height) {
      scaleFilter.push(`scale=-1:${height}`);
    }
    
    // Add padding if maintainAspect is true
    if (options.maintainAspect && (width || height)) {
      scaleFilter.push(`pad=${width || 'iw'}:${height || 'ih'}:(ow-iw)/2:(oh-ih)/2:${options.padColor || 'black'}`);
    }
    
    if (scaleFilter.length > 0) {
      command = command.videoFilters(scaleFilter.join(','));
    }
  }

  switch (preset) {
    // Video presets
    case 'mp4':
      command = command
        .videoCodec('libx264')
        .audioCodec('aac')
        .format('mp4')
        .outputOptions('-crf 23');
      break;
      
    case 'webm':
      command = command
        .videoCodec('libvpx-vp9')
        .audioCodec('libvorbis')
        .format('webm')
        .outputOptions(['-b:v 1M', '-crf 30']);
      break;
      
    case 'gif':
      command = command
        .videoFilters([
          'fps=15',
          'scale=640:-1:flags=lanczos',
          'split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse'
        ])
        .format('gif');
      break;
      
    case 'audio-extract':
      command = command
        .noVideo()
        .audioCodec('libmp3lame')
        .format('mp3')
        .audioQuality(3);
      break;
      
    case 'mute':
      command = command
        .noAudio()
        .videoCodec('libx264')
        .format('mp4');
      break;
      
    // Image presets
    case 'webp':
      command = command
        .format('webp')
        .outputOptions([
          `-quality ${quality}`,
          `-compression_level ${options.compressionLevel || 6}`,
          options.lossless ? '-lossless 1' : ''
        ].filter(Boolean));
      break;
      
    case 'jpeg':
    case 'jpg':
      command = command
        .format('mjpeg')
        .outputOptions([
          `-q:v ${quality}`,
          options.progressive ? '-pix_fmt yuvj420p' : '',
          options.subsample ? `-subq ${options.subsample}` : ''
        ].filter(Boolean));
      break;
      
    case 'png':
      command = command
        .format('png')
        .outputOptions([
          `-compression_level ${options.compressionLevel || 9}`,
          options.interlace ? '-interlace plane' : ''
        ].filter(Boolean));
      break;
      
    case 'avif':
      command = command
        .format('avif')
        .outputOptions([
          `-qp ${31 - Math.floor((quality / 100) * 31)}`,
          `-speed ${options.speed || 6}`
        ].filter(Boolean));
      break;
      
    default:
      // For unknown presets, try to use the preset name as the format
      command = command.format(preset);
  }

  if (options.startTime) command.seekInput(options.startTime);
  if (options.duration) command.duration(options.duration);
  if (options.quality && preset !== 'gif') command.videoBitrate(options.quality);
  if (options.watermarkPath && fs.existsSync(options.watermarkPath)) {
    command.complexFilter([
      `[0:v][1:v]overlay=W-w-10:H-h-10[out]`
    ]).input(options.watermarkPath);
  }

  return command.output(output);
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

  try {
    if (!await fs.pathExists(inputPath)) {
      return res.status(404).json({ error: 'Input file not found' });
    }

    activeConversions.set(conversionId, { status: 'processing' });
    command
      .on('start', (commandLine) => {
        console.log(`[${conversionId}] FFmpeg command: ${commandLine}`);
        console.log(`[${conversionId}] Starting conversion: ${input} -> ${output}`);
      })
      .on('progress', (progress) => {
        const percent = Math.round(progress.percent) || 0;
        conversion.progress = percent;
        conversion.timemark = progress.timemark;
        conversion.frames = progress.frames;
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
            input: input,
            output: output,
            size: stats?.size || 0,
            duration: duration,
            downloadUrl: `/output/${output}`,
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
          stderr: stderr
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
app.get('/api/health', (req, res) => {
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

    res.status(isHealthy ? 200 : 503).json({ 
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      ffmpeg: {
        available: !!ffmpeg,
        version: err ? null : ffmpeg.version(),
        formats: err ? null : Object.keys(formats).slice(0, 20)
      },
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