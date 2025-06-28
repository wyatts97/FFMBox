import { Router } from 'express';
import fs from 'fs/promises';
import { readdir } from 'fs/promises'; // For font scanning
import config from '../../config.js'; // Import config
import { readJsonFile, writeJsonFile, cleanupOldFiles } from '../../utils/file.js'; // Import centralized helpers

const router = Router();

/**
 * Adds a new item to the conversion history.
 * Call this from your FFmpeg conversion logic when a job completes or fails.
 * @param {{id: string, filename: string, preset: string, timestamp: string, status: 'completed' | 'error', downloadUrl?: string}} item
 */
export const addHistoryItem = async (item) => {
  try {
    const history = await readJsonFile(config.HISTORY_PATH, []);
    history.unshift(item); // Add new items to the top
    const trimmedHistory = history.slice(0, 100); // Keep history to a reasonable size
    await writeJsonFile(config.HISTORY_PATH, trimmedHistory);
  } catch (error) {
    console.error('Failed to add item to history:', error);
  }
};

// --- Settings API ---

// GET /api/settings
router.get('/settings', async (req, res) => {
  try {
    const defaultSettings = { retentionPeriod: '24', outputDir: config.OUTPUT_DIR, autoDownload: false };
    const settings = await readJsonFile(config.SETTINGS_PATH, defaultSettings);
    res.json(settings);
  } catch (error) {
    console.error('Error reading settings:', error);
    res.status(500).json({ error: 'Failed to read settings' });
  }
});

// POST /api/settings
router.post('/settings', async (req, res) => {
  try {
    const defaultSettings = { retentionPeriod: '24', outputDir: config.OUTPUT_DIR, autoDownload: false };
    const currentSettings = await readJsonFile(config.SETTINGS_PATH, defaultSettings);
    const updatedSettings = { ...currentSettings, ...req.body };

    await writeJsonFile(config.SETTINGS_PATH, updatedSettings);
    res.json(updatedSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// --- History API ---

// GET /api/history
router.get('/history', async (req, res) => {
  try {
    const history = await readJsonFile(config.HISTORY_PATH, []);
    res.json(history);
  } catch (error) {
    console.error('Error reading history:', error);
    res.status(500).json({ error: 'Failed to read history' });
  }
});

// DELETE /api/history
router.delete('/history', async (req, res) => {
  try {
    await writeJsonFile(config.HISTORY_PATH, []);
    res.status(204).send(); // No Content
  } catch (error) {
    console.error('Error clearing history:', error);
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

// --- Cleanup API ---

// POST /api/cleanup
router.post('/cleanup', async (req, res) => {
  try {
    const defaultSettings = { retentionPeriod: '24' };
    const settings = await readJsonFile(config.SETTINGS_PATH, defaultSettings);
    const retentionHours = parseInt(settings.retentionPeriod, 10) || 0;

    if (retentionHours <= 0) {
      return res.status(200).json({ message: 'Cleanup not performed. Retention is set to "Never".' });
    }

    const maxAgeMs = retentionHours * 60 * 60 * 1000;
    console.log(`Cleanup job started. Deleting files older than ${retentionHours} hours...`);

    const [uploadsResult, outputsResult] = await Promise.all([
      cleanupOldFiles(config.UPLOAD_DIR, maxAgeMs),
      cleanupOldFiles(config.OUTPUT_DIR, maxAgeMs)
    ]);

    const totalDeleted = (uploadsResult.deletedCount || 0) + (outputsResult.deletedCount || 0);
    const message = `Cleanup completed. Deleted ${totalDeleted} file(s).`;
    console.log(message);
    res.status(200).json({ message, deletedCount: totalDeleted });
  } catch (error) {
    console.error('Error during cleanup:', error);
    res.status(500).json({ error: 'Failed to initiate cleanup job.' });
  }
});

// --- Font API ---

// GET /api/fonts
router.get('/fonts', async (req, res) => {
  const fontDirs = [
    '/usr/share/fonts/truetype', // Common path for TrueType fonts in Alpine
    '/usr/share/fonts/opentype', // Common path for OpenType fonts
    '/usr/local/share/fonts',    // Another common path
  ];
  let fonts = [];

  for (const dir of fontDirs) {
    try {
      const files = await readdir(dir);
      fonts = fonts.concat(files.filter(file => /\.(ttf|otf)$/i.test(file)));
    } catch (error) {
      // Directory might not exist, or no permission, just skip
    }
  }
  res.json({ fonts: [...new Set(fonts)] }); // Return unique font names
});

export default router;