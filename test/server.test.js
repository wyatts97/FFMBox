import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import nock from 'nock';

// Mock the presets endpoint
const mockPresets = {
  videoPresets: [],
  audioPresets: [],
  imagePresets: []
};

// Setup nock to mock HTTP requests
nock('http://localhost:3000')
  .persist()
  .get('/presets')
  .reply(200, mockPresets);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set test environment
process.env.NODE_ENV = 'test';

// Test file setup
const testFilePath = join(__dirname, 'testfile.txt');
const testFileContent = 'This is a test file for FFMBox';

// Create a test file before tests run
before(() => {
  // Create a test file for upload tests
  if (!fs.existsSync(testFilePath)) {
    fs.writeFileSync(testFilePath, testFileContent);
  }
  return Promise.resolve();
});

// Clean up after tests
after(() => {
  // Remove test file
  if (fs.existsSync(testFilePath)) {
    fs.unlinkSync(testFilePath);
  }
  return Promise.resolve();
});

describe('Basic Tests', () => {
  test('Test file should exist', () => {
    assert.strictEqual(fs.existsSync(testFilePath), true);
  });

  test('Test file should have correct content', () => {
    const content = fs.readFileSync(testFilePath, 'utf8');
    assert.strictEqual(content, testFileContent);
  });
});

describe('API Tests', () => {
  test('GET /presets should return presets', async () => {
    const response = await fetch('http://localhost:3000/presets');
    const data = await response.json();
    
    assert.strictEqual(response.status, 200);
    assert.strictEqual(typeof data, 'object');
    assert.ok(Array.isArray(data.videoPresets));
    assert.ok(Array.isArray(data.audioPresets));
    assert.ok(Array.isArray(data.imagePresets));
  });
});
