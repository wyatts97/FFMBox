
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 6900;

// Create necessary directories
const uploadsDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'output');
const distDir = path.join(__dirname, '..', 'dist');

// Ensure frontend build exists before starting server
const distIndex = path.join(distDir, 'index.html');
if (!fs.existsSync(distIndex)) {
  console.error('\n[ERROR] Frontend build not found!\nPlease run "npm run build" in the project root before starting the backend.\nExpected file: ' + distIndex + '\n');
  process.exit(1);
}

fs.ensureDirSync(uploadsDir);
fs.ensureDirSync(outputDir);

// Middleware
app.use(cors());
app.use(express.json());
app.use('/output', express.static(outputDir));

// Serve React static files
app.use(express.static(distDir));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB limit
  }
});

// WebSocket server for real-time progress updates
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

const activeConversions = new Map();

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Broadcast progress to all connected clients
function broadcastProgress(conversionId, progress) {
  const message = JSON.stringify({
    type: 'progress',
    conversionId,
    progress
  });
  
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Check FFmpeg availability
app.get('/api/ffmpeg-status', (req, res) => {
  ffmpeg.getAvailableFormats((err, formats) => {
    if (err) {
      res.json({ available: false, error: err.message });
    } else {
      res.json({ available: true, formats: Object.keys(formats).slice(0, 10) });
    }
  });
});

// Upload endpoint
app.post('/api/upload', upload.array('files'), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const fileInfo = req.files.map(file => ({
    id: uuidv4(),
    originalName: file.originalname,
    filename: file.filename,
    size: file.size,
    path: file.path
  }));

  res.json({ files: fileInfo });
});

// Conversion endpoint
app.post('/api/convert', async (req, res) => {
  const { fileId, filename, preset, options = {} } = req.body;
  
  if (!fileId || !filename || !preset) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  const inputPath = path.join(uploadsDir, filename);
  const conversionId = uuidv4();
  const outputFilename = generateOutputFilename(filename, preset);
  const outputPath = path.join(outputDir, outputFilename);

  try {
    // Check if input file exists
    if (!await fs.pathExists(inputPath)) {
      return res.status(404).json({ error: 'Input file not found' });
    }

    activeConversions.set(conversionId, { status: 'starting' });

    const command = createFFmpegCommand(inputPath, outputPath, preset, options);
    
    command
      .on('start', (commandLine) => {
        console.log('Spawned FFmpeg with command: ' + commandLine);
        activeConversions.set(conversionId, { status: 'processing' });
        broadcastProgress(conversionId, { status: 'processing', percent: 0 });
      })
      .on('progress', (progress) => {
        const percent = Math.round(progress.percent || 0);
        broadcastProgress(conversionId, { 
          status: 'processing', 
          percent,
          timemark: progress.timemark 
        });
      })
      .on('end', () => {
        console.log('Processing finished successfully');
        activeConversions.set(conversionId, { status: 'completed' });
        broadcastProgress(conversionId, { 
          status: 'completed', 
          percent: 100,
          downloadUrl: `/output/${outputFilename}`
        });
      })
      .on('error', (err) => {
        console.error('An error occurred: ' + err.message);
        activeConversions.set(conversionId, { status: 'error', error: err.message });
        broadcastProgress(conversionId, { 
          status: 'error', 
          error: err.message 
        });
      })
      .run();

    res.json({ 
      conversionId, 
      status: 'started',
      outputFilename 
    });

  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to create FFmpeg command based on preset
function createFFmpegCommand(inputPath, outputPath, preset, options) {
  let command = ffmpeg(inputPath);

  switch (preset) {
    case 'mp4':
      command = command
        .videoCodec('libx264')
        .audioCodec('aac')
        .format('mp4');
      break;
    case 'webm':
      command = command
        .videoCodec('libvpx-vp9')
        .audioCodec('libvorbis')
        .format('webm');
      break;
    case 'gif':
      command = command
        .videoFilters('fps=15,scale=320:-1:flags=lanczos')
        .format('gif');
      break;
    case 'audio-extract':
      command = command
        .noVideo()
        .audioCodec('mp3')
        .format('mp3');
      break;
    case 'mute':
      command = command
        .noAudio()
        .videoCodec('libx264')
        .format('mp4');
      break;
    default:
      command = command.format('mp4');
  }

  // Apply trimming if specified
  if (options.startTime) {
    command = command.seekInput(options.startTime);
  }
  if (options.duration) {
    command = command.duration(options.duration);
  }

  // Apply quality settings
  if (options.quality && preset !== 'gif') {
    command = command.videoBitrate(options.quality);
  }

  return command.output(outputPath);
}

// Helper function to generate output filename
function generateOutputFilename(originalFilename, preset) {
  const baseName = path.parse(originalFilename).name;
  const timestamp = Date.now();
  
  const extensions = {
    mp4: 'mp4',
    webm: 'webm',
    gif: 'gif',
    'audio-extract': 'mp3',
    mute: 'mp4'
  };
  
  const ext = extensions[preset] || 'mp4';
  return `${baseName}-${preset}-${timestamp}.${ext}`;
}

// Get conversion status
app.get('/api/conversion/:id', (req, res) => {
  const conversionId = req.params.id;
  const conversion = activeConversions.get(conversionId);
  
  if (!conversion) {
    return res.status(404).json({ error: 'Conversion not found' });
  }
  
  res.json(conversion);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all: serve index.html for React SPA
app.get('*', (req, res) => {
  // Only handle non-API, non-output requests
  if (
    req.path.startsWith('/api') ||
    req.path.startsWith('/output')
  ) {
    return res.status(404).end();
  }
  res.sendFile(path.join(distDir, 'index.html'));
});

server.listen(PORT, () => {
  console.log(`FFMBox server running on port ${PORT}`);
});
