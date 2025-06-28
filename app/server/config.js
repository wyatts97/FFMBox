import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5500', 10),
  HOST: process.env.HOST || '0.0.0.0',
  
  // File Storage
  UPLOAD_DIR: process.env.UPLOAD_DIR || '/app/uploads',
  OUTPUT_DIR: process.env.OUTPUT_DIR || '/app/output',
  MAX_FILE_SIZE: process.env.MAX_FILE_SIZE || '500MB',
  
  // CORS
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  
  // FFmpeg
  FFMPEG_THREADS: process.env.FFMPEG_THREADS || '0', // 0 = auto
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Security
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10), // Max requests per window
  WS_MAX_CONNECTIONS_PER_IP: parseInt(process.env.WS_MAX_CONNECTIONS_PER_IP || '5', 10), // Max concurrent WS connections per IP
  
  // File retention (in hours)
  DEFAULT_RETENTION_HOURS: parseInt(process.env.DEFAULT_RETENTION_HOURS || '24', 10),
  
  // Paths
  DATA_DIR: path.join(__dirname, 'data'),
  CLIENT_PATH: path.join(__dirname, '../../public'),
  PUBLIC_PATH: path.join(__dirname, 'public'),
  SETTINGS_PATH: path.join(__dirname, 'data/settings.json'),
  HISTORY_PATH: path.join(__dirname, 'data/history.json')
};

export default config;
