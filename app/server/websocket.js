import { WebSocket, WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import logger from './utils/logger.js';

// --- Global State and Constants ---
// The 'clients' map is populated by server.js during the upgrade process
// and then used by websocket.js for client-specific data.
const clients = new Map();

// Track active conversions with TTL
const activeConversions = new Map();
const CONVERSION_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Rate limiting for subscribe attempts
const SUBSCRIBE_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute for subscribe rate limit
const SUBSCRIBE_RATE_LIMIT_MAX_MESSAGES = 100; // Max subscribe attempts per window
const subscribeRateLimitClients = new Map(); // Map<clientIp, { count: number, timestamp: number }> - For rate limiting subscribe attempts

// Constants
const HEARTBEAT_INTERVAL = 30000; // 30 seconds for WebSocket ping/pong

// WebSocket server instance and intervals
let wss = null;
let wsCleanupInterval = null;
let healthCheckInterval = null; // Renamed from wsHealthCheckInterval for consistency

/**
 * Initializes the cleanup interval for old conversion data and rate limit entries.
 * @returns {NodeJS.Timeout} The cleanup interval
 */
function initializeCleanupInterval() {
  if (wsCleanupInterval) {
    clearInterval(wsCleanupInterval);
  }
  
  wsCleanupInterval = setInterval(() => {
    const now = Date.now();
    let cleanedConversions = 0;
    
    // Clean up old conversions
    for (const [id, conversion] of activeConversions.entries()) {
      if (now - (conversion.startTime?.getTime() || 0) > CONVERSION_TTL) {
        // Notify subscribers before cleanup
        if (conversion.subscribers) {
          for (const ws of conversion.subscribers) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'conversion_expired',
                conversionId: id,
                message: 'Conversion data has expired'
              }));
            }
          }
        }
        activeConversions.delete(id);
        cleanedConversions++;
      }
    }
    
    // Clean up subscribe rate limiting entries
    let cleanedRateLimits = 0;
    for (const [ip, rateInfo] of subscribeRateLimitClients.entries()) {
      if (now - rateInfo.timestamp > SUBSCRIBE_RATE_LIMIT_WINDOW_MS) {
        subscribeRateLimitClients.delete(ip);
        cleanedRateLimits++;
      }
    }
    
    if (cleanedConversions > 0) {
      logger.info(`Cleaned up ${cleanedConversions} old conversions`);
    }
    if (cleanedRateLimits > 0) logger.debug(`Cleaned up ${cleanedRateLimits} old subscribe rate limit entries`);
  }, 60 * 60 * 1000); // Run hourly

  // Don't keep the process alive just for this interval
  if (wsCleanupInterval.unref) {
    wsCleanupInterval.unref();
  }
  
  return wsCleanupInterval;
}

/**
 * Cleans up resources associated with a disconnected WebSocket client.
 * @param {WebSocket} ws - The disconnected WebSocket connection.
 */
function cleanupClient(ws) {
  const clientInfo = clients.get(ws);
  if (!clientInfo) return;

  // Remove client from any active subscriptions
  if (clientInfo.subscriptions) {
    clientInfo.subscriptions.forEach(conversionId => {
      if (activeConversions.has(conversionId)) {
        const conversion = activeConversions.get(conversionId);
        if (conversion && conversion.subscribers) {
          conversion.subscribers.delete(ws);
          conversion.clientCount = Math.max(0, conversion.clientCount - 1); // Decrement and ensure non-negative

          // If no more subscribers, schedule conversion cleanup
          if (conversion.clientCount === 0) {
            logger.info(`No more subscribers for ${conversionId}, scheduling cleanup`);
            setTimeout(() => {
              if (activeConversions.has(conversionId) &&
                  activeConversions.get(conversionId).clientCount === 0) {
                activeConversions.delete(conversionId);
                logger.info(`Cleaned up conversion ${conversionId} after last subscriber left`);
              }
            }, 30000); // 30 second delay before cleanup
          }
        }
      }
    });
  }

  // Remove from main clients map
  clients.delete(ws);
}

/**
 * Handles a 'subscribe' message from a client.
 * @param {WebSocket} ws - The WebSocket connection.
 * @param {object} clientInfo - The client's information object.
 * @param {string} conversionId - Conversion ID to subscribe to
 */
function handleSubscribe(ws, clientInfo, conversionId) {
  if (!conversionId) {
    throw new Error('conversionId is required for subscribe');
  }
  
  // Validate conversionId format
  if (typeof conversionId !== 'string' || !/^[a-f0-9-]{36}$/i.test(conversionId)) {
    throw new Error('Invalid conversionId format');
  }
  
  // Check rate limiting
  const now = Date.now();
  const clientRate = subscribeRateLimitClients.get(clientInfo.ip) || { count: 0, timestamp: now };
  
  if (now - clientRate.timestamp > SUBSCRIBE_RATE_LIMIT_WINDOW_MS) {
    // Reset counter if window has passed
    clientRate.count = 1;
    clientRate.timestamp = now;
  } else if (clientRate.count >= SUBSCRIBE_RATE_LIMIT_MAX_MESSAGES) {
    throw new Error('Rate limit exceeded for subscribe attempts. Please try again later.');
  } else {
    clientRate.count++;
  }
  
  subscribeRateLimitClients.set(clientInfo.ip, clientRate);
  
  logger.info(`Client ${clientInfo.id} (${clientInfo.ip}) subscribing to conversion ${conversionId}`, {
    clientId: clientInfo.id,
    conversionId,
    rateInfo: clientRate
  });
  
  console.log(`🔔 Client ${clientInfo.id} subscribing to conversion ${conversionId}`);
  
  // Add client to conversion's subscriber list
  if (!activeConversions.has(conversionId)) {
    activeConversions.set(conversionId, {
      subscribers: new Set(),
      startTime: new Date(),
      lastActivity: new Date(),
      clientCount: 0
    });
  }
  
  // Get the conversion object
  const conversion = activeConversions.get(conversionId);
  
  // Check if already subscribed (using the WebSocket object itself)
  if (conversion.subscribers.has(ws)) {
    logger.debug(`Client ${clientInfo.id} already subscribed to ${conversionId}`);
    
    // Still send confirmation in case client needs it
    ws.send(JSON.stringify({
      type: 'subscribe',
      conversionId,
      status: 'already_subscribed'
    }));
    return;
  }
  
  // Add to subscribers
  conversion.subscribers.add(ws);
  conversion.clientCount = (conversion.clientCount || 0) + 1;
  conversion.lastActivity = new Date();
  
  // Track subscription on the client's info
  if (!clientInfo.subscriptions) {
    clientInfo.subscriptions = new Set();
  }
  clientInfo.subscriptions.add(conversionId);
  
  // Send confirmation
  ws.send(JSON.stringify({
    type: 'subscribe',
    conversionId,
    status: 'subscribed',
    timestamp: new Date().toISOString(),
    clientCount: conversion.clientCount
  }));
  
  logger.debug(`Client ${clientInfo.id} successfully subscribed to ${conversionId} (${conversion.clientCount} total clients)`);
}

/**
 * Handles an 'unsubscribe' message from a client.
 * @param {WebSocket} ws - The WebSocket connection.
 * @param {object} clientInfo - The client's information object.
 * @param {string} conversionId - Conversion ID to unsubscribe from
 */
function handleUnsubscribe(ws, clientInfo, conversionId) {
  if (!conversionId) {
    throw new Error('conversionId is required for unsubscribe');
  }
  
  console.log(`🔕 Client ${clientInfo.id} unsubscribing from conversion ${conversionId}`);
  
  // Remove client from conversion's subscriber list
  if (activeConversions.has(conversionId)) {
    const conversion = activeConversions.get(conversionId);
    if (conversion.subscribers.delete(ws)) {
      conversion.clientCount = Math.max(0, conversion.clientCount - 1);
    }
    
    // Clean up conversion if no more subscribers after a delay
    if (conversion.subscribers.size === 0) { // Use .size for Set
      logger.info(`No more subscribers for ${conversionId}, scheduling cleanup`);
      setTimeout(() => {
        if (activeConversions.has(conversionId) && 
            activeConversions.get(conversionId).subscribers.size === 0) {
          activeConversions.delete(conversionId);
          logger.info(`Cleaned up conversion ${conversionId} after last subscriber left`);
        }
      }, 30000); // 30 second delay before cleanup
    }

    // Remove from client's subscriptions
    if (clientInfo.subscriptions) {
      clientInfo.subscriptions.delete(conversionId);
    }
    
    // Send confirmation
    ws.send(JSON.stringify({
      type: 'unsubscribe',
      conversionId,
      status: 'unsubscribed'
    }));
    logger.debug(`Client ${clientInfo.id} successfully unsubscribed from ${conversionId}`);
  } else {
    logger.warn(`Unsubscribe request for non-existent conversion: ${conversionId}`);
    ws.send(JSON.stringify({
      type: 'error',
      error: `Conversion ${conversionId} not found`
    }));
  }
}

// --- Main WebSocket Setup Function ---

/**
 * Sets up the WebSocket server and its event handlers.
 * @param {import('http').Server} server - The HTTP server instance to attach the WebSocket server to.
 * @returns {object} An object containing the WebSocketServer instance and a close function.
 */
const setupWebSocket = (server) => {
  logger.info('Initializing WebSocket Server...');
  
  // Initialize cleanup interval for old conversions
  initializeCleanupInterval();
  
  // Declare variables in the function scope
  let healthCheckInterval;
  let wss;
  
  try {
    // Create WebSocket server with secure defaults
    wss = new WebSocketServer({ noServer: true });
    
    // Set up ping/pong for connection health (global interval)
    healthCheckInterval = setInterval(() => {
      wss.clients.forEach((ws) => {
      // ws.isAlive is set by the pong handler
      if (ws.isAlive === false) {
        logger.warn(`Terminating stale WebSocket connection from ${clients.get(ws)?.ip || 'unknown'}`);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, HEARTBEAT_INTERVAL);

  // Handle new WebSocket connections
  wss.on('connection', (ws) => { // eslint-disable-line no-shadow
    // clientInfo is already attached to ws in server.js upgrade handler
    const clientInfo = clients.get(ws);
    if (!clientInfo) {
      logger.error('WebSocket connection without clientInfo. Terminating.');
      return ws.terminate();
    }

    logger.info('New WebSocket connection established', {
      clientId: clientInfo.id,
      ip: clientInfo.ip,
      userAgent: clientInfo.userAgent,
      protocol: ws.protocol,
      connectionTime: `${(Date.now() - clientInfo.connectedAt.getTime())}ms`
    });
    
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    
    // Handle client messages
    ws.on('message', (data) => {
      // Limit message size to 1MB
      if (data.length > 1024 * 1024) {
        logger.warn('Oversized WebSocket message', { clientId: clientInfo.id });
        return ws.close(1009, 'Message too large');
      }

      try {
        const message = JSON.parse(data.toString());
        
        // Validate message structure
        if (!message || typeof message !== 'object') {
          throw new Error('Invalid message format');
        }

        // Require authentication token for non-ping messages
        if (message.type !== 'ping' && (!message.token || typeof message.token !== 'string')) {
          throw new Error('Authentication required');
        }

        // Verify JWT token if present
        if (message.token) {
          clientInfo.user = verifyToken(message.token); // Implement this function
          if (!clientInfo.user) {
            throw new Error('Invalid authentication token');
          }
        }

        // Handle different message types
        if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        } else if (message.type === 'subscribe' && message.conversionId) {
          if (typeof message.conversionId !== 'string' || !/^[a-f0-9-]{36}$/i.test(message.conversionId)) {
            throw new Error('Invalid conversion ID format');
          }
          handleSubscribe(ws, clientInfo, message.conversionId);
        } else if (message.type === 'unsubscribe' && message.conversionId) {
          handleUnsubscribe(ws, clientInfo, message.conversionId);
        } else {
          throw new Error('Unsupported message type');
        }
      } catch (error) {
        logger.error('Error processing WebSocket message:', error);
      }
    });
    
    // Handle client disconnection
    ws.on('close', (code, reason) => {
      logger.info('WebSocket connection closed', { clientId: clientInfo.id, ip: clientInfo.ip, code, reason: reason.toString() });
      cleanupClient(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error('WebSocket error', { clientId: clientInfo.id, ip: clientInfo.ip, error: error.message, stack: error.stack });
      cleanupClient(ws);
    });
  });

  } catch (error) {
    logger.error('Failed to initialize WebSocket server:', error);
    // Clean up any resources that might have been created before the error
    if (healthCheckInterval) clearInterval(healthCheckInterval);
    if (wsCleanupInterval) clearInterval(wsCleanupInterval);
    throw error; // Re-throw to allow handling by the caller
  }
  
  logger.info('WebSocket Server instance created with secure defaults');
  
  // Track server metrics
  const metrics = {
    connections: 0,
    messages: 0,
    errors: 0,
    conversions: 0,
    startTime: new Date()
  }; // eslint-disable-line no-unused-vars
  
  // Monitor server health
  const monitorInterval = setInterval(() => {
    const { rss, heapUsed, heapTotal } = process.memoryUsage();
    const memoryUsage = (heapUsed / heapTotal) * 100;
    
    logger.info('WebSocket Server Health Check', {
      connections: metrics.connections,
      activeConversions: activeConversions.size,
      memoryUsage: `${memoryUsage.toFixed(2)}%`,
      uptime: `${process.uptime().toFixed(2)}s`,
      heapUsed: `${(heapUsed / 1024 / 1024).toFixed(2)}MB`,
      heapTotal: `${(heapTotal / 1024 / 1024).toFixed(2)}MB`,
      rss: `${(rss / 1024 / 1024).toFixed(2)}MB`
    });
    
    // Check for memory leaks
    if (memoryUsage > 90) {
      logger.warn('High memory usage detected!', { memoryUsage: `${memoryUsage.toFixed(2)}%` });
    }
  }, 60000); // Check every minute

  return {
    wss: wss,
    clients: clients, // Expose clients map for server.js to populate
    activeConversions: activeConversions, // Expose for broadcastProgress
    close: () => {
      logger.info('Closing WebSocket server...');
      clearInterval(healthCheckInterval);
      clearInterval(monitorInterval);

      const closePromises = [];
      for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
          const closePromise = new Promise(resolve => {
            client.on('close', resolve);
            client.close(1001, 'Server is shutting down');
          });
          closePromises.push(closePromise);
        }
      }

      return Promise.all(closePromises).then(() => {
        return new Promise(resolve => {
          wss.close(() => {
            logger.info('WebSocket server fully closed.');
            resolve();
          });
        });
      });
    },
  };
}

/**
 * Broadcasts progress data to all subscribed clients for a given conversion.
 * @param {string} conversionId - The ID of the conversion.
 * @param {object} data - The progress data to send.
 * @param {object} [options] - Additional options.
 * @param {boolean} [options.retryOnError=false] - Whether to retry failed sends.
 * @param {number} [options.maxRetries=1] - Maximum number of retry attempts.
 * @returns {Promise<object>} Statistics about the broadcast.
 */
async function broadcastProgress(conversionId, data, options = {}) { // eslint-disable-line no-shadow
  const startTime = Date.now();
  const stats = {
    sent: 0,
    failed: 0,
    skipped: 0,
    total: 0,
    duration: 0,
    conversionId,
    timestamp: new Date().toISOString()
  };
  
  // Validate inputs
  if (!conversionId) {
    const error = new Error('conversionId is required');
    logger.error('Broadcast failed: conversionId is required');
    throw error;
  }
  
  if (!activeConversions.has(conversionId)) {
    logger.warn(`No active conversion found for ID: ${conversionId}`);
    return { ...stats, error: 'No active conversion found' };
  }
  
  const conversion = activeConversions.get(conversionId);
  if (!conversion || !conversion.subscribers) {
    logger.warn(`Invalid conversion object for ID: ${conversionId}`);
    return { ...stats, error: 'Invalid conversion object' };
  }
  
  // Prepare message with additional metadata
  const message = JSON.stringify({
    type: 'progress',
    conversionId,
    data,
    timestamp: Date.now(),
    sequence: conversion.sequence = (conversion.sequence || 0) + 1
  });
  
  // Track message size
  const messageSize = Buffer.byteLength(message, 'utf8');
  stats.messageSize = messageSize;
  
  // Log broadcast start
  logger.debug('Broadcasting progress', {
    conversionId,
    subscriberCount: conversion.subscribers.size,
    messageSize: `${(messageSize / 1024).toFixed(2)}KB`,
    dataKeys: Object.keys(data)
  });
  
  // Send to all subscribers with error handling and optional retries
  const sendPromises = [];
  const clientErrors = [];
  let index = 0; // Initialize index counter
  
  for (const client of conversion.subscribers) { // Correct iteration for Set
    const currentIndex = index++; // Capture the current index for this iteration
    stats.total++;
    
    // Skip if client is not ready
    if (client.readyState !== WebSocket.OPEN) {
      stats.skipped++;
      logger.debug('Skipping client - not ready', {
        clientIndex: currentIndex,
        clientId: clients.get(client)?.id || 'unknown',
        conversionId
      });
      continue;
    }
    
    // Send message with retry logic
    const sendWithRetry = async (attempt = 1) => {
      const { maxRetries = 1, retryOnError = false } = options;
      const maxAttempts = maxRetries;
      const baseDelay = 100; // 100ms initial delay
      
      try {
        // Send the message
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Send operation timed out'));
          }, 5000); // 5-second timeout

          client.send(message, (error) => {
            clearTimeout(timeout);
            if (error) {
              return reject(error);
            }
            resolve();
          });
        });
        
        stats.sent++;
        return true;
        
      } catch (error) {
        if (attempt < maxAttempts && retryOnError) {
          // Exponential backoff
          const delay = baseDelay * Math.pow(2, attempt - 1);
          logger.debug(`Retry attempt ${attempt}/${maxAttempts} for client`, {
            clientIndex: currentIndex,
            conversionId,
            delay,
            error: error.message
          });
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return sendWithRetry(attempt + 1);
        }
        
        // Log the error
        const errorInfo = {
          clientId: clients.get(client)?.id || 'unknown',
          conversionId,
          attempt,
          error: error.message,
          code: error.code
        };
        
        clientErrors.push(errorInfo);
        logger.error('Failed to send progress to client', errorInfo);
        
        stats.failed++;
        return false;
      }
    };
    
    sendPromises.push(sendWithRetry().catch(error => {
      logger.error('Error in sendWithRetry', { error: error.message });
      return false;
    }));
  }
  
  // Wait for all sends to complete
  try {
    await Promise.all(sendPromises);
  } catch (error) {
    // Individual errors are handled in sendWithRetry
    logger.error('Error during broadcast', {
      conversionId,
      error: error.message,
      stack: error.stack
    });
  }
  
  // Calculate duration
  stats.duration = Date.now() - startTime;
  
  // Log broadcast completion
  const logData = {
    ...stats,
    duration: `${stats.duration}ms`,
    messageSize: `${(messageSize / 1024).toFixed(2)}KB`,
    successRate: stats.total > 0 ? 
      `${((stats.sent / stats.total) * 100).toFixed(1)}%` : 'N/A'
  };
  
  if (stats.failed > 0) {
    logger.warn('Broadcast completed with errors', logData);
  } else {
    logger.debug('Broadcast completed successfully', logData);
  }
  
  // Clean up if no more subscribers
  if (conversion.subscribers.size === 0) {
    logger.info(`No more subscribers for conversion ${conversionId}, cleaning up`);
    activeConversions.delete(conversionId);
  }
  
  return stats;
}

export { setupWebSocket, broadcastProgress };
