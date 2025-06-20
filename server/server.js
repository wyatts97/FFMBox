require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');
const path = require('path');

// Configuration
const app = express();
const PORT = process.env.PORT || 6900;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
const OUTPUT_DIR = process.env.OUTPUT_DIR || path.join(__dirname, 'output');
const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE || '500MB';
const FFMPEG_THREADS = process.env.FFMPEG_THREADS || 2;

// Ensure directories exist
fs.ensureDirSync(UPLOAD_DIR);
fs.ensureDirSync(OUTPUT_DIR);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*'
}));
app.use(express.json());
app.use('/output', express.static(OUTPUT_DIR));

// File upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${uuidv4()}-${file.originalname}`)
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(MAX_FILE_SIZE),
    files: 5
  }
});

// WebSocket server
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });
const activeConversions = new Map();

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('close', () => console.log('Client disconnected'));
});

function broadcastProgress(conversionId, progress) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ conversionId, ...progress }));
    }
  });
}

// FFmpeg Command Builder
function createFFmpegCommand(input, output, preset, options = {}) {
  let command = ffmpeg(input)
    .outputOptions([
      '-threads', FFMPEG_THREADS,
      '-preset', process.env.FFMPEG_PRESET || 'medium',
      '-movflags', '+faststart'
    ]);

  switch (preset) {
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
    default:
      command = command.format('mp4');
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
  const extensions = {
    mp4: 'mp4',
    webm: 'webm',
    gif: 'gif',
    'audio-extract': 'mp3',
    mute: 'mp4'
  };
  return `${baseName}-${preset}-${Date.now()}.${extensions[preset] || 'mp4'}`;
}

// API Endpoints
app.get('/api/ffmpeg-status', (req, res) => {
  ffmpeg.getAvailableFormats((err, formats) => {
    res.json({
      available: !err,
      version: err ? null : ffmpeg.version(),
      formats: err ? null : Object.keys(formats).slice(0, 20)
    });
  });
});

app.post('/api/upload', upload.array('files'), (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'No files uploaded' });
  
  res.json({
    files: req.files.map(file => ({
      id: uuidv4(),
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      path: file.path
    }))
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
    const command = createFFmpegCommand(inputPath, outputPath, preset, options);

    command
      .on('start', (cmd) => {
        console.log(`FFmpeg started: ${cmd}`);
        broadcastProgress(conversionId, { status: 'processing', percent: 0 });
      })
      .on('progress', (progress) => {
        const percent = Math.min(Math.round(progress.percent || 0), 99);
        broadcastProgress(conversionId, {
          status: 'processing',
          percent,
          timemark: progress.timemark
        });
      })
      .on('end', () => {
        activeConversions.set(conversionId, { status: 'completed' });
        broadcastProgress(conversionId, {
          status: 'completed',
          percent: 100,
          downloadUrl: `/output/${outputFilename}`
        });
        fs.unlink(inputPath).catch(console.error); // Cleanup source file
      })
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        activeConversions.set(conversionId, { status: 'failed', error: err.message });
        broadcastProgress(conversionId, { status: 'failed', error: err.message });
        fs.unlink(outputPath).catch(() => {}); // Cleanup failed output
      })
      .run();

    res.json({ 
      conversionId,
      status: 'started',
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

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    directories: {
      uploads: UPLOAD_DIR,
      output: OUTPUT_DIR
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`FFMBox Server running on port ${PORT}`);
  console.log(`Uploads directory: ${UPLOAD_DIR}`);
  console.log(`Outputs directory: ${OUTPUT_DIR}`);
  console.log(`WebSocket server active on port ${PORT}`);
});