import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import helmet from 'helmet';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors'; // ADDED: For CORS configuration

// Import config and services
import config from './config.js'; // UPDATED: Import config
import conversionService from './services/conversionService.js'; // UPDATED: Import conversionService
import { parseFileSize, generateOutputFilename, checkDirectory, cleanupOldFiles } from './utils/file.js'; // UPDATED: Import file utilities
import logger, { requestLogger, securityMiddleware, rateLimiter } from './utils/logger.js'; // UPDATED: Import logger and middlewares
import { setupWebSocket } from './websocket.js'; // UPDATED: Import WebSocket setup
import { getClientIp, hashIp } from './utils/network.js'; // ADDED: For WebSocket IP handling
import apiRoutes from './src/routes/api.js'; // Path is correct as the src directory is copied to /app/src

// Log directory setup is now handled by the logger module
logger.info(`Using log directory: ${process.env.LOG_DIR || '/app/logs'}`);

const app = express();
const httpServer = http.createServer({
  maxHeaderSize: 81920, // 80KB
  requestTimeout: 300000, // 5 minutes
  keepAliveTimeout: 60000, // 1 minute
  headersTimeout: 65000, // 65 seconds
}, app);

// Set trust proxy for proper IP handling behind reverse proxies
app.set('trust proxy', true);

// Increase the default event listener limit
process.setMaxListeners(20); // Set appropriate limit based on your needs

// ============================================
// Middleware
// ============================================

// Security headers


// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: [
        "'self'", 
        `ws://${config.HOST}:${config.PORT}`, 
        `wss://${config.HOST}:${config.PORT}`
      ]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  dnsPrefetchControl: false,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }, // 1 year
  ieNoOpen: true,
  noSniff: true,
  xssFilter: false // Rely on CSP for XSS protection, this header is often deprecated
}));

// CORS configuration with enhanced security
const corsOptions = {
  origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN.split(',').map(o => o.trim()),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-Requested-With',
    'X-Request-ID',
    'X-HTTP-Method-Override'
  ],
  exposedHeaders: [
    'Content-Length',
    'Content-Type',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS middleware with enhanced security
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight for all routes

// Rate limiting
// Use the rateLimiter from utils/logger.js
app.use(rateLimiter); // Apply rate limiting to all requests

// Apply rate limiting to API routes with exclusions for health checks (if needed, but rateLimiter already handles it)
// The global rate limiter is already applied, so this specific one is not needed
// and `apiLimiter` is not defined.
// app.use('/api', (req, res, next) => {
//   // Exclude health checks from rate limiting
//   if (req.path === '/health') {
//     return next();
//   }
//   return apiLimiter(req, res, next);
// });

// Enhanced request logging
app.use(requestLogger); // Use the requestLogger from utils/logger.js

// Body parsing
app.use(express.json({ 
  limit: config.MAX_FILE_SIZE
  // The 'verify' function is redundant as express.json already handles parsing errors.
  // If parsing fails, Express's error handling middleware will catch it.
  // verify: (req, res, buf) => {
  //   try {
  //     if (buf?.length) JSON.parse(buf.toString());
  //   } catch (e) {
  //     logger.warn('Invalid JSON payload', {
  //       error: e.message,
  //       url: req.url,
  //       method: req.method
  //     });
  //     throw new Error('Invalid JSON');
  //   }
  // }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: config.MAX_FILE_SIZE,
  parameterLimit: 10000
}));

// Mount the API routes from src/routes/api.js
app.use('/api', apiRoutes); // ADDED: Mount API routes

// Health check endpoint for Docker
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Only serve static files in production
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the 'public' directory with proper caching
  app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1y',
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
      // Set caching for static assets
      if (path.endsWith('.html')) {
        // No cache for HTML files
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      } else if (path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
        // Long cache for static assets
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));
}

// Serve index.html for any other route to support client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================
// Routes
// ============================================




// File upload endpoint
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.UPLOAD_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = file.originalname.replace(/[^\w\-\.]/g, '_');
    cb(null, `${uniqueSuffix}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseFileSize(config.MAX_FILE_SIZE),
    files: 5,
    fieldNameSize: 200,
    fieldSize: 10 * 1024 * 1024 // 10MB max field size
  }
}).array('files');

app.post('/api/upload', (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      const errorMap = {
        'LIMIT_FILE_SIZE': { status: 413, error: 'File too large' },
        'LIMIT_FILE_TYPES': { status: 415, error: 'Invalid file type' },
        'LIMIT_FILE_COUNT': { status: 400, error: 'Too many files' },
        'LIMIT_FIELD_KEY': { status: 400, error: 'Field name too long' },
        'LIMIT_FIELD_VALUE': { status: 413, error: 'Field value too large' }
      };
      
      const errorInfo = errorMap[err.code] || { status: 500, error: 'Upload failed' };
      return res.status(errorInfo.status).json({
        error: errorInfo.error,
        message: err.message || 'An error occurred while uploading files'
      });
    }
    
    if (!req.files?.length) {
      return res.status(400).json({ 
        error: 'No files uploaded',
        message: 'Please select at least one file to upload'
      });
    }
    
    const fileInfos = req.files.map(file => ({
      id: uuidv4(),
      filename: file.filename,
      originalName: file.originalname,
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

// File conversion endpoint
app.post('/api/convert', async (req, res) => {
  const { fileId, filename, preset, options = {} } = req.body;
  const inputPath = path.join(config.UPLOAD_DIR, filename);
  const outputFilename = generateOutputFilename(filename, preset, options);
  const outputPath = path.join(config.OUTPUT_DIR, outputFilename);
  
  // Create conversion record
  const conversion = conversionService.createConversion({
    filename,
    preset,
    options,
    inputPath,
    outputPath,
    outputFilename
  });
  
  logger.info(`[${conversion.id}] Starting conversion: ${filename} -> ${outputFilename}`);
  
  try {
    // Start the conversion
    await conversionService.startConversion(conversion);
    
    res.status(202).json({
      conversionId: conversion.id,
      status: 'queued',
      message: 'Conversion started',
      progressUrl: `/api/conversion/${conversion.id}/progress`,
      outputFilename
    });
    
  } catch (error) {
    logger.error(`[${conversion.id}] Conversion error:`, error);
    res.status(500).json({ 
      error: 'Conversion failed',
      message: error.message 
    });
  }
});

// Get conversion status
app.get('/api/conversion/:id', (req, res) => {
  const conversion = conversionService.getConversion(req.params.id);
  if (!conversion) {
    return res.status(404).json({ error: 'Conversion not found' });
  }
  res.json(conversion);
});

// Cleanup old files
app.post('/api/cleanup', async (req, res) => {
  try {
    const maxAgeHours = req.body.maxAgeHours || config.DEFAULT_RETENTION_HOURS;
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    
    // Clean up both uploads and outputs directories
    const [uploadsResult, outputsResult] = await Promise.all([
      cleanupOldFiles(config.UPLOAD_DIR, maxAgeMs),
      cleanupOldFiles(config.OUTPUT_DIR, maxAgeMs)
    ]);
    
    res.json({
      message: 'Cleanup completed',
      deletedCount: uploadsResult.deletedCount + outputsResult.deletedCount,
      errorCount: uploadsResult.errorCount + outputsResult.errorCount,
      maxAgeHours
    });
    
  } catch (error) {
    logger.error('Cleanup error:', error);
    res.status(500).json({
      error: 'Cleanup failed',
      message: error.message
    });
  }
});

// ============================================
// WebSocket Server
// ============================================

// Setup WebSocket server
let wssInstance; // WebSocketServer instance (declared with let)
let closeWebSocketServerFunction; // Function to close the WebSocket server (declared with let)

try {
  const wsServer = setupWebSocket(httpServer);
  wssInstance = wsServer.wss;
  closeWebSocketServerFunction = wsServer.close;

  // Expose the clients map from websocket.js to server.js
  const wsClientsMap = wsServer.clients; // This is the clients Map from websocket.js
  // Handle WebSocket server errors
  wssInstance.on('error', (error) => { // FIX: Use wssInstance
    logger.error('WebSocket server error:', error);
  });
  
  logger.info('WebSocket server initialized successfully');
} catch (error) {
  logger.error('Failed to initialize WebSocket server, attempting to exit:', error);
  process.exit(1);
}

// Handle HTTP upgrade requests for WebSocket
httpServer.on('upgrade', (request, socket, head) => {
  const clientId = uuidv4(); // Generate a unique ID for this connection attempt
  const clientIp = getClientIp(request); // FIX: Use getClientIp utility
  const origin = request.headers.origin;
  const url = request.url;
  
  logger.info(`\n=== WebSocket Upgrade Request ===`);
  logger.info(`   - Client ID: ${clientId}`);
  logger.info(`   - URL: ${url}`);
  logger.info(`   - Origin: ${origin || 'none'}`);
  logger.info(`   - IP: ${clientIp}`);
  
  // Check if origin is allowed (same logic as CORS middleware)
  const allowedOrigins = config.CORS_ORIGIN === '*' 
    ? ['*'] 
    : config.CORS_ORIGIN.split(',').map(o => o.trim());
    
  const isAllowed = allowedOrigins.includes('*') || !origin || allowedOrigins.includes(origin);

  // Check IP-based connection limit
  const ipHash = hashIp(clientIp); // FIX: Use imported hashIp
  const currentConnectionsFromIp = Array.from(wsClientsMap.values())
    .filter(clientInfo => clientInfo.ipHash === ipHash).length;

  if (currentConnectionsFromIp >= config.WS_MAX_CONNECTIONS_PER_IP) {
    const errorMsg = `Too many concurrent WebSocket connections from this IP (max ${config.WS_MAX_CONNECTIONS_PER_IP})`;
    logger.warn(`WebSocket connection rejected: ${errorMsg}`, {
      clientId,
      ip: clientIp,
      existingConnections: currentConnectionsFromIp
    });
    socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
    socket.destroy();
    return;
  }

  // Origin validation
  
  if (!isAllowed) {
    const errorMsg = `WebSocket connection rejected from unauthorized origin: ${origin}`;
    logger.warn(errorMsg);
    
    // Send 401 Unauthorized response
    socket.write([
      'HTTP/1.1 401 Unauthorized',
      'Connection: close',
      'Content-Type: text/plain',
      'Content-Length: 0',
      '\r\n'
    ].join('\r\n'));
    
    socket.destroy();
    return;
  }
  
  // Handle the WebSocket upgrade
  wssInstance.handleUpgrade(request, socket, head, (ws) => {
    logger.info(`✅ WebSocket upgrade successful for ${clientId} (${clientIp})`);
    
    // Add connection metadata
    // This clientInfo object will be stored in the clients Map in websocket.js
    const clientInfo = {
      id: clientId,
      ip: clientIp, // Use the resolved clientIp
      ipHash: hashIp(clientIp), // Use the imported hashIp
      connectedAt: new Date(),
      userAgent: request.headers['user-agent'] || 'unknown',
      lastActivity: Date.now(),
      messageCount: 0,
      subscriptions: new Set(), // Track conversion IDs this client is subscribed to
      connectionStart: process.hrtime(),
      headers: {
        origin: request.headers.origin,
        referer: request.headers.referer,
        'user-agent': request.headers['user-agent']
      }
    };

    // Store client info on the WebSocket object itself for easy access within websocket.js handlers
    wsClientsMap.set(ws, clientInfo);
    // Set up ping/pong for connection health
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    
    // Handle the WebSocket connection
    wssInstance.emit('connection', ws); // Pass only ws, clientInfo is already attached
  });
  
  // Handle socket errors
  socket.on('error', (error) => {
    logger.error('WebSocket socket error:', error);
    socket.destroy();
  });
});

// Add conversion to history (this would be called from conversionService after completion/error)
// For now, I'll just add a placeholder. The actual integration would be in conversionService.
app.post('/api/history/add', async (req, res) => {
  // This endpoint is for internal server use or testing, not directly from frontend
  // The frontend calls /api/convert, and the server's conversionService should update history
  res.status(501).json({ message: 'Not implemented for direct client use' });
});


// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const isClientError = status >= 400 && status < 500;
  const requestId = res.getHeader('X-Request-ID') || 'unknown';
  
  // Log the error with appropriate level
  const logContext = {
    requestId,
    status,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  };
  
  if (isClientError) {
    logger.warn(`Client error (${status}): ${err.message}`, logContext);
  } else {
    logger.error(`Server error (${status}): ${err.message}`, logContext);
  }
  
  // Don't leak stack traces in production
  const errorResponse = {
    error: isClientError ? err.name || 'Client Error' : 'Internal Server Error',
    message: isClientError ? err.message : 'An unexpected error occurred',
    status,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    requestId
  };
  
  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }
  
  res.status(status).json(errorResponse);
});

// ============================================
// Server Startup
// ============================================

// Graceful shutdown handler
let isShuttingDown = false;
const shutdown = async () => {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress.');
    return;
  }
  isShuttingDown = true;
  logger.info('\n=== Shutting down server gracefully ===');

  try {
    // Close WebSocket server if it exists
    if (closeWebSocketServerFunction) {
      logger.info('Closing WebSocket server...');
      await closeWebSocketServerFunction();
    } else {
      logger.warn('closeWebSocketServer function not available');
    }

    // Close HTTP server
    if (httpServer.listening) {
      await new Promise((resolve, reject) => {
        httpServer.close((err) => {
          if (err) {
            logger.error('Error closing HTTP server:', err);
            return reject(err);
          }
          logger.info('HTTP server closed');
          resolve();
        });
      });
    } else {
      logger.info('HTTP server is not running, no need to close.');
    }

    logger.info('Server shutdown complete');
    process.exit(0);

  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle process signals with improved logging
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  shutdown();
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  shutdown();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('\n=== UNCAUGHT EXCEPTION ===', error);
  shutdown().catch(() => process.exit(1));
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => { // eslint-disable-line no-unused-vars
  logger.error('\n=== UNHANDLED REJECTION ===', { reason, promise });
  shutdown().catch(() => process.exit(1)); // Initiate graceful shutdown
});

// Start the server
const startServer = async () => {
  try {
    // Start listening
    await new Promise((resolve) => {
      httpServer.listen(config.PORT, config.HOST, () => {
        const serverInfo = `
╔══════════════════════════════════════════════════╗
║               FFMBox Server Started               ║
╠══════════════════════════════════════════════════╣
║ Port:         ${config.PORT}${' '.repeat(36 - config.PORT.toString().length)}║
║ Environment:  ${config.NODE_ENV}${' '.repeat(36 - config.NODE_ENV.length)}║
║ Uploads:      ${config.UPLOAD_DIR}${' '.repeat(36 - Math.min(config.UPLOAD_DIR.length, 36))}║
║ Outputs:      ${config.OUTPUT_DIR}${' '.repeat(36 - Math.min(config.OUTPUT_DIR.length, 36))}║
║ CORS Origin:  ${config.CORS_ORIGIN}${' '.repeat(36 - Math.min(config.CORS_ORIGIN.length, 36))}║
║ Max File Size: ${config.MAX_FILE_SIZE}${' '.repeat(35 - config.MAX_FILE_SIZE.length)}║
╚══════════════════════════════════════════════════╝`;
        
        console.log(serverInfo);
        logger.info(`Server started on http://${config.HOST}:${config.PORT}`);
        resolve();
      });
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};



// Start the server
startServer().catch(error => {
  logger.error('Fatal error during server startup:', error);
  // Ensure we exit with a non-zero code to indicate error
  process.exit(1);
});

// Log unhandled promise rejections
process.on('warning', (warning) => {
  logger.warn('Node.js warning:', warning);
});

// Export for testing
export { app, httpServer, shutdown };
