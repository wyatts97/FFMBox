import 'dotenv/config';
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import ffmpeg from "fluent-ffmpeg";
import cors from "cors";
import { videoPresets, audioPresets, imagePresets } from "./config/presets.js";
import { v4 as uuidv4 } from 'uuid';
import archiver from 'archiver';

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
app.get("/presets", (req, res) => {
  res.json({ videoPresets, audioPresets, imagePresets });
});

const jobs = {}; // Store job progress

// POST /convert: receive uploaded file and conversion options, process and return converted file
// Use multipart/form-data: file, presetKey (optional), customCommand (optional)
app.post("/convert", upload.single("inputFile"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No input file uploaded." });
  }

  const jobId = uuidv4();
  jobs[jobId] = { progress: 0, status: 'starting' };

  res.json({ jobId });

  // Offload the conversion to a separate async function
  processConversion(jobId, req.file, req.body);
});

async function processConversion(jobId, file, body) {
  let preset = null;
  let useCustom = false;
  const { mediaType, presetName, customCommand, videoBitrate, frameRate, audioBitrate, metaTitle, metaAuthor, speedPreset } = body;
  const inputFilePath = file.path;

  try {
    // ... (rest of the logic from the original /convert endpoint)
    // Note: This is a simplified representation. The full logic would be moved here.
    // For brevity, we'll just focus on the ffmpeg command execution and progress handling.
    
    // Determine preset or custom ffmpeg command
    if (customCommand && customCommand.trim().length > 0) {
      useCustom = true;
    } else if (presetName && presetName.trim().length > 0) {
      const presetsMap = {
        video: videoPresets,
        audio: audioPresets,
        image: imagePresets
      };
      preset = presetsMap[mediaType].find((p) => p.name === presetName);
      if (!preset) throw new Error("Specified preset not found.");
    } else {
      throw new Error("No preset or custom ffmpeg command specified.");
    }

    const outputExtension = useCustom ? (path.extname(file.originalname).slice(1) || "out") : (preset.extension || "out");
    const outputName = path.parse(file.originalname).name;
    const outputFileName = `${outputName}_converted.${outputExtension}`;
    const outputDir = path.join(__dirname, "../temp_outputs");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    const outputFilePath = path.join(outputDir, outputFileName);

    jobs[jobId].outputFileName = outputFileName;
    jobs[jobId].outputFilePath = outputFilePath;

    const ffmpegCmd = ffmpeg(inputFilePath).outputOptions("-y");
    
    if (useCustom) {
      const customOpts = customCommand.trim().split(/\s+/);
      ffmpegCmd.outputOptions(customOpts);
    } else {
      let ffmpegOptions = [...preset.ffmpegOptions];
      if (videoBitrate) {
        const optionIndex = ffmpegOptions.indexOf('-b:v');
        if (optionIndex > -1) {
          ffmpegOptions[optionIndex + 1] = `${videoBitrate}k`;
        } else {
          ffmpegOptions.push('-b:v', `${videoBitrate}k`);
        }
      }
      if (frameRate) {
        const optionIndex = ffmpegOptions.indexOf('-r');
        if (optionIndex > -1) {
          ffmpegOptions[optionIndex + 1] = frameRate;
        } else {
          ffmpegOptions.push('-r', frameRate);
        }
      }
      if (audioBitrate) {
        const optionIndex = ffmpegOptions.indexOf('-b:a');
        if (optionIndex > -1) {
          ffmpegOptions[optionIndex + 1] = `${audioBitrate}k`;
        } else {
          ffmpegOptions.push('-b:a', `${audioBitrate}k`);
        }
      }
      if (speedPreset) {
        const optionIndex = ffmpegOptions.indexOf('-preset');
        if (optionIndex > -1) {
          ffmpegOptions[optionIndex + 1] = speedPreset;
        } else {
          ffmpegOptions.push('-preset', speedPreset);
        }
      }
      ffmpegCmd.outputOptions(ffmpegOptions);
      if (metaTitle) {
        ffmpegCmd.outputOptions(`-metadata`, `title=${metaTitle}`);
      }
      if (metaAuthor) {
        ffmpegCmd.outputOptions(`-metadata`, `author=${metaAuthor}`);
      }
    }

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

// Start server
app.listen(port, () => {
  console.log(`FFmpeg converter server listening at http://localhost:${port}`);
});
