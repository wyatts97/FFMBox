import { networkInterfaces } from 'os';
import { createHash } from 'crypto';
import logger from './logger.js';

/**
 * Get the client IP address from the request, considering proxy headers
 * @param {import('http').IncomingMessage} req - The HTTP request object
 * @returns {string} The client IP address
 */
function getClientIp(req) {
  // Check for forwarded header (common with proxies like Nginx, Cloudflare, etc.)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // x-forwarded-for may contain multiple IPs, the first one is the client IP
    const ips = forwarded.split(',').map(ip => ip.trim());
    return ips[0];
  }
  
  // Check for other common proxy headers
  const headers = [
    'cf-connecting-ip', // Cloudflare
    'x-real-ip', // Nginx
    'x-client-ip', // Apache
    'x-forwarded',
    'x-cluster-client-ip',
    'forwarded-for',
    'forwarded'
  ];
  
  for (const header of headers) {
    const value = req.headers[header];
    if (value) {
      return Array.isArray(value) ? value[0] : value.split(',')[0].trim();
    }
  }
  
  // Fall back to the direct connection remote address
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Get the server's local IP addresses
 * @returns {Object} Object with network interfaces and their IP addresses
 */
function getLocalIps() {
  const interfaces = networkInterfaces();
  const result = {};
  
  for (const [name, iface] of Object.entries(interfaces)) {
    if (!iface) continue;
    
    result[name] = iface
      .filter(details => details.family === 'IPv4' && !details.internal)
      .map(details => details.address);
  }
  
  return result;
}

/**
 * Generate a hash of the client IP for rate limiting
 * @param {string} ip - The IP address
 * @returns {string} Hashed IP address
 */
function hashIp(ip) {
  return createHash('sha256')
    .update(ip + (process.env.IP_HASH_SALT || 'default-salt-value'))
    .digest('hex');
}

/**
 * Check if an IP address is in the allowed list
 * @param {string} ip - The IP address to check
 * @param {string[]} allowedIps - Array of allowed IPs or CIDR ranges
 * @returns {boolean} True if the IP is allowed
 */
function isIpAllowed(ip, allowedIps = []) {
  if (!allowedIps || allowedIps.length === 0) return true;
  
  // Handle CIDR notation (e.g., 192.168.1.0/24)
  const isInRange = (ip, cidr) => {
    const [range, bits = '32'] = cidr.split('/');
    const mask = ~(0xFFFFFFFF >>> parseInt(bits, 10));
    const ipLong = ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
    const rangeLong = range.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0);
    return (ipLong & mask) === (rangeLong & mask);
  };
  
  return allowedIps.some(allowed => {
    if (allowed.includes('/')) {
      return isInRange(ip, allowed);
    }
    return ip === allowed;
  });
}

export {
  getClientIp,
  getLocalIps,
  hashIp,
  isIpAllowed
};
