import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import DailyRotateFile from 'winston-daily-rotate-file';

const { createLogger, format, transports } = winston;
const { combine, timestamp, printf, colorize, json } = format;

// Ensure logs directory exists
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use LOG_DIR from environment or default to /app/logs
const logDir = process.env.LOG_DIR || '/app/logs';
const serverLogDir = '/app/server/logs';

// Function to ensure directory exists and is writable
const ensureLogDirectory = (dir) => {
  try {
    // Try to create the directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true, mode: 0o775 });
        console.log(`Created directory: ${dir}`);
        
        // Set ownership if running as root
        if (process.getuid && process.getuid() === 0) {
          try {
            fs.chownSync(dir, 1000, 1000);
            console.log(`Set ownership for ${dir} to 1000:1000`);
          } catch (chownError) {
            console.warn(`Warning: Could not set ownership for ${dir}:`, chownError.message);
          }
        }
      } catch (mkdirError) {
        console.warn(`Warning: Could not create directory ${dir}:`, mkdirError.message);
      }
    }

    // Try to make directory writable
    try {
      fs.chmodSync(dir, 0o775);
      console.log(`Set permissions for ${dir} to 775`);
    } catch (chmodError) {
      console.warn(`Warning: Could not set permissions for ${dir}:`, chmodError.message);
    }

    // Check if directory is writable
    const testFile = path.join(dir, '.test-write');
    let isWritable = false;
    
    try {
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log(`Directory is writable: ${dir}`);
      isWritable = true;
    } catch (writeError) {
      console.warn(`Warning: Cannot write to log directory: ${dir}`);
      console.warn(`Error:`, writeError.message);
      
      // Try to fix permissions one more time
      try {
        if (process.getuid && process.getuid() === 0) {
          fs.chownSync(dir, 1000, 1000);
          fs.chmodSync(dir, 0o775);
          console.log(`Attempted to fix permissions for ${dir}`);
          
          // Test again
          try {
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
            console.log(`Successfully fixed permissions for ${dir}`);
            isWritable = true;
          } catch (retryError) {
            console.warn(`Still cannot write to ${dir} after permission fix`);
          }
        }
      } catch (fixError) {
        console.warn(`Failed to fix permissions for ${dir}:`, fixError.message);
      }
    }
    
    // If not writable and not already trying fallback, use /tmp
    if (!isWritable && !dir.startsWith('/tmp/')) {
      const fallbackDir = '/tmp/ffmbox-logs';
      console.warn(`Falling back to ${fallbackDir}`);
      return ensureLogDirectory(fallbackDir);
    }
    
    if (!isWritable) {
      console.error('FATAL: No writable log directory available');
      process.exit(1);
    }
    
    return dir;
  } catch (error) {
    console.error('FATAL: Error setting up log directory:', error);
    
    // If we're not already in the fallback directory, try it
    if (!dir.startsWith('/tmp/')) {
      console.warn('Attempting to use fallback directory...');
      return ensureLogDirectory('/tmp/ffmbox-logs');
    }
    
    process.exit(1);
  }
};

// Ensure both log directories exist and are writable
ensureLogDirectory(logDir);
ensureLogDirectory(serverLogDir);

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  // Sanitize sensitive information
  const sanitizedMeta = JSON.parse(JSON.stringify(meta, (key, value) => {
    // Redact sensitive fields
    const sensitiveFields = ['password', 'token', 'apiKey', 'authorization'];
    if (sensitiveFields.includes(key.toLowerCase())) {
      return '[REDACTED]';
    }
    return value;
  }));
  
  return `${timestamp} [${level}]: ${message} ${
    Object.keys(sanitizedMeta).length ? JSON.stringify(sanitizedMeta, null, 2) : ''
  }`;
});

// Create logger instance
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  defaultMeta: { service: 'ffmbox' },
  transports: [
    // Write all logs with level `error` and below to `error.log`
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true
    }),
    // Write all logs to `combined.log`
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true
    })
  ],
  exceptionHandlers: [
    new transports.File({ 
      filename: path.join(logDir, 'exceptions.log'),
      handleExceptions: true 
    })
  ],
  exitOnError: false
});

// Add console transport in non-production environments
if (process.env.NODE_ENV !== 'production') {
  logger.add(new transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      consoleFormat
    ),
    handleExceptions: true
  }));
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', { error: reason });
  // In production, you might want to restart the process here
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error });
  // In production, you might want to restart the process here
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Add request logging middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      contentLength: res.get('content-length') || 0
    };

    if (res.statusCode >= 500) {
      logger.error('Request error', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request warning', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
};

// Add security middleware
const securityMiddleware = (req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  next();
};

// In-memory store for rate limiting (replace with Redis in production)
const requestCounts = new Map();

// Interval to clean up old rate limit entries
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  
  for (const [ip, requests] of requestCounts.entries()) {
    const filtered = requests.filter(timestamp => (now - timestamp) < windowMs);
    if (filtered.length > 0) {
      requestCounts.set(ip, filtered);
    } else {
      requestCounts.delete(ip);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

// Don't keep the process alive just for this interval
if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

/**
 * Rate limiting middleware
 * Limits each IP to 100 requests per 15 minutes
 */
const rateLimiter = (req, res, next) => {
  const RATE_LIMIT = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
  };

  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const windowStart = now - RATE_LIMIT.windowMs;

  // Initialize or update request timestamps for this IP
  const requests = requestCounts.get(ip) || [];
  const recentRequests = requests.filter(timestamp => timestamp > windowStart);

  // Check if rate limit is exceeded
  if (recentRequests.length >= RATE_LIMIT.max) {
    const retryAfter = Math.ceil((recentRequests[0] + RATE_LIMIT.windowMs - now) / 1000);
    logger.warn('Rate limit exceeded', { 
      ip, 
      count: recentRequests.length,
      retryAfter: `${retryAfter}s`
    });
    
    return res.status(429).json({ 
      error: 'Too many requests',
      message: RATE_LIMIT.message,
      retryAfter
    });
  }

  // Add current request timestamp and save
  recentRequests.push(now);
  requestCounts.set(ip, recentRequests);
  
  // Set rate limit headers
  res.set({
    'X-RateLimit-Limit': RATE_LIMIT.max,
    'X-RateLimit-Remaining': Math.max(0, RATE_LIMIT.max - recentRequests.length),
    'X-RateLimit-Reset': Math.ceil((recentRequests[0] + RATE_LIMIT.windowMs) / 1000)
  });
  
  next();
};

export { logger as default, requestLogger, securityMiddleware, rateLimiter };
