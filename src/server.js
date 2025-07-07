import 'dotenv/config';
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import ffmpeg from "fluent-ffmpeg";
import cors from "cors";
import { outputFormats } from "./config/presets.js";
import { v4 as uuidv4 } from 'uuid';
import archiver from 'archiver';

// Set ffmpeg path if provided in environment variables
if (process.env.FFMPEG_PATH) {
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 1073741824; // 1GB default
const tempUploadDir = process.env.TEMP_UPLOAD_DIR || path.join(__dirname, '../temp_uploads');
const tempOutputDir = process.env.TEMP_OUTPUT_DIR || path.join(__dirname, '../temp_outputs');

// Configure CORS
const corsOptions = {
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "./public")));

// Use JSON parser
app.use(express.json());

// Ensure temp directories exist
[tempUploadDir, tempOutputDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Multer setup for handling file uploads to a temp directory
const upload = multer({
  dest: tempUploadDir,
  limits: { fileSize: maxFileSize }
});

// Helper: remove file safely
function tryUnlinkFile(filePath) {
  fs.unlink(filePath, (err) => {
    if (err) {
      // silently ignore error
    }
  });
}

// Serve presets for frontend
app.get("/output-formats", (req, res) => {
  res.json(outputFormats);
});

const jobs = {};

app.post("/convert", upload.single("inputFile"), async (req, res) => {
  const jobId = uuidv4();
  jobs[jobId] = { progress: 0, status: "starting", error: null, outputFileName: null, convertedSize: 0 };

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    processConversion(jobId, req.file, req.body);
    res.json({ jobId });
  } catch (error) {
    console.error("Error in /convert endpoint:", error);
    jobs[jobId].status = "error";
    jobs[jobId].error = error.message;
    res.status(500).json({ error: "Conversion initiation failed." });
  }
});

function parseTime(timeString) {
  const parts = timeString.split(':');
  const hours = parseInt(parts[0] || '0', 10);
  const minutes = parseInt(parts[1] || '0', 10);
  const seconds = parseInt(parts[2] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

function getVideoDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(metadata.format.duration);
    });
  });
}

// List of valid speed presets for validation
async function processConversion(jobId, file, body) {
  const { outputExtension, outputType, customCommand, ...configurableOptions } = body;
  
  console.log(`[${new Date().toISOString()}] Starting conversion job ${jobId}`);
  console.log(`[${jobId}] Output Extension: ${outputExtension}`);
  console.log(`[${jobId}] Output Type: ${outputType}`);
  console.log(`[${jobId}] Configurable Options:`, configurableOptions);

  const inputFilePath = file.path;

  try {
    const videoDuration = await getVideoDuration(inputFilePath);
    let ffmpegCmd = ffmpeg(inputFilePath).outputOptions("-y");
    let outputFileName;

    if (customCommand && customCommand.trim().length > 0) {
      const customOpts = customCommand.trim().split(/\s+/);
      ffmpegCmd.outputOptions(customOpts);
      outputFileName = `${path.parse(file.originalname).name}_converted${path.extname(file.originalname)}`;
    } else if (outputExtension && outputType) {
      const format = outputFormats.find(f => f.extension === outputExtension && f.type === outputType);
      if (!format) throw new Error("Specified output format not found.");

      outputFileName = `${path.parse(file.originalname).name}_converted.${outputExtension}`;

      // Apply configurable options
      format.configurableOptions.forEach(option => {
        const value = configurableOptions[option.id];
        if (value !== undefined) {
          switch (option.id) {
            case "resolution":
              if (value !== "Original") {
                const resolutionMap = {
                  "480p": "-vf scale=-2:480",
                  "720p": "-vf scale=-2:720",
                  "1080p": "-vf scale=-2:1080"
                };
                if (resolutionMap[value]) {
                  ffmpegCmd.outputOptions(resolutionMap[value].split(' '));
                }
              }
              break;
            case "videoQuality": // CRF for video
              ffmpegCmd.outputOptions([`-crf`, value.toString()]);
              break;
            case "videoBitrate": // for WebM
              ffmpegCmd.outputOptions([`-b:v`, `${value}M`]);
              break;
            case "audioBitrate":
              ffmpegCmd.outputOptions([`-b:a`, `${value}k`]);
              break;
            case "speedPreset":
              ffmpegCmd.outputOptions([`-preset`, value]);
              break;
            case "fps":
              ffmpegCmd.outputOptions([`-r`, value.toString()]);
              break;
            case "startTime":
              ffmpegCmd.seekInput(value);
              break;
            case "endTime":
              // Calculate duration from start to end time
              const start = parseTime(configurableOptions["startTime"] || "00:00:00");
              let end = parseTime(value);
              if (end > videoDuration) {
                end = videoDuration;
              }
              const duration = end - start;
              if (duration > 0) {
                ffmpegCmd.duration(duration);
              }
              break;
            case "quality": // for image formats (JPG, WebP)
              ffmpegCmd.outputOptions([`-q:v`, value.toString()]);
              break;
            case "compressionLevel": // for PNG
              ffmpegCmd.outputOptions([`-compression_level`, value.toString()]);
              break;
            case "lossless": // for WebP
              if (value === "true") {
                ffmpegCmd.outputOptions([`-lossless`, `1`]);
              }
              break;
            default:
              // Handle other options if necessary
              break;
          }
        }
      });
    } else {
      throw new Error("No output format or custom ffmpeg command specified.");
    }

    const outputDir = path.join(__dirname, "../temp_outputs");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    const outputFilePath = path.join(outputDir, outputFileName);

    jobs[jobId].outputFileName = outputFileName;
    jobs[jobId].outputFilePath = outputFilePath;

    ffmpegCmd
      .on('progress', (progress) => {
        jobs[jobId].progress = progress.percent;
        jobs[jobId].status = 'processing';
      })
      .on('error', (err) => {
        jobs[jobId].status = 'error';
        jobs[jobId].error = err.message;
        tryUnlinkFile(inputFilePath);
        tryUnlinkFile(outputFilePath);
      })
      .on('end', () => {
        fs.stat(outputFilePath, (err, stats) => {
          if (!err) {
            jobs[jobId].convertedSize = stats.size;
          }
          jobs[jobId].progress = 100;
          jobs[jobId].status = 'completed';
          tryUnlinkFile(inputFilePath);
        });
      })
      .save(outputFilePath);

  } catch (err) {
    jobs[jobId].status = 'error';
    jobs[jobId].error = err.message;
    if (inputFilePath) tryUnlinkFile(inputFilePath);
  }
}

app.get('/progress/:jobId', (req, res) => {
  const { jobId } = req.params;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const interval = setInterval(() => {
    const job = jobs[jobId];
    if (job) {
      res.write(`data: ${JSON.stringify(job)}\n\n`);
      if (job.status === 'completed' || job.status === 'error') {
        clearInterval(interval);
        res.end();
      }
    } else {
      clearInterval(interval);
      res.end();
    }
  }, 1000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

app.get('/download/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs[jobId];
  if (job && job.status === 'completed') {
    res.download(job.outputFilePath, job.outputFileName, (err) => {
      if (err) {
        console.error("Download error:", err);
      }
      tryUnlinkFile(job.outputFilePath);
      delete jobs[jobId];
    });
  } else {
    res.status(404).send('File not found or not ready.');
  }
});

app.get('/check-file/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(__dirname, "../temp_outputs", filename);
  if (fs.existsSync(filePath)) {
    res.status(200).send('File exists');
  } else {
    res.status(404).send('File not found');
  }
});

app.get('/download-all', (req, res) => {
  const { jobIds, outputFilenames } = req.query;
  const ids = jobIds.split(',');
  const filenames = outputFilenames.split(',');
  const archive = archiver('zip');

  res.attachment('converted_files.zip');
  archive.pipe(res);

  ids.forEach((jobId, index) => {
    const filename = filenames[index];
    const filePath = path.join(__dirname, "../temp_outputs", filename);
    // Check if the file exists before adding to archive
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: filename });
    } else {
      console.warn(`File not found for jobId ${jobId}: ${filePath}`);
    }
  });

  archive.finalize();

  // Clean up files after the archive has been sent
  archive.on('end', () => {
    ids.forEach((jobId, index) => {
      const filename = filenames[index];
      const filePath = path.join(__dirname, "../temp_outputs", filename);
      tryUnlinkFile(filePath);
    });
  });
});

// Create server instance
let server;

// Only start the server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  try {
    server = app.listen(port, 'localhost', () => {
      console.log(`FFmpeg converter server listening at http://localhost:${port}`);
      console.log(`Temporary upload directory: ${tempUploadDir}`);
      console.log(`Temporary output directory: ${tempOutputDir}`);
      
      // Create temp directories if they don't exist
      if (!fs.existsSync(tempUploadDir)) {
        fs.mkdirSync(tempUploadDir, { recursive: true });
      }
      if (!fs.existsSync(tempOutputDir)) {
        fs.mkdirSync(tempOutputDir, { recursive: true });
      }
    });
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Please close the other application or use a different port.`);
      console.error('You can change the port by setting the PORT environment variable.');
      process.exit(1);
    } else {
      throw error;
    }
  }
} else {
  // In test environment, create the temp directories if they don't exist
  if (!fs.existsSync(tempUploadDir)) {
    fs.mkdirSync(tempUploadDir, { recursive: true });
  }
  if (!fs.existsSync(tempOutputDir)) {
    fs.mkdirSync(tempOutputDir, { recursive: true });
  }
}

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Please close the other application or use a different port.`);
    console.error('You can change the port by setting the PORT environment variable.');
    process.exit(1);
  } else {
    console.error('Server error:', error);
    process.exit(1);
  }
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Export the app and server for testing
if (process.env.NODE_ENV !== 'test') {
  // Only start the server if not in test environment
  // In test environment, the test file will handle server creation
  server.on('listening', () => {
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

export { app, server };
