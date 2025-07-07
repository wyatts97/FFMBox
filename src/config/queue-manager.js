const { Queue } = require('queue');
const { ChildProcess } = require('child_process');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

class QueueManager {
  constructor() {
    this.queue = new Queue();
    this.processingTasks = new Set();
    this.retryAttempts = 3;
    this.maxRetries = 5;
    this.logFile = path.join(__dirname, 'queue.log');
  }

  addTask(task, priority = 'medium') {
    if (!task.id) {
      throw new Error('Task must have an id');
    }
    
    if (!task.command) {
      throw new Error('Task must have an ffmpeg command');
    }

    task.priority = priority;
    task.attempts = 0;
    task.retries = 0;

    this.queue.add(task);
    this.log('info', `New task added with id: ${task.id}`);
  }

  start() {
    this.queue.process(async (task) => {
      const start = performance.now();
      const startTime = new Date().toISOString();

      try {
        this.processingTasks.add(task.id);
        this.log('debug', `Processing task: ${task.id}`);

        // Execute ffmpeg command
        const cp = new ChildProcess(task.command);
        
        cp.stdout.on('data', (data) => {
          this.log('debug', `FFmpeg Output: ${data}`);
        });

        cp.stderr.on('data', (data) => {
          this.log('error', `FFmpeg Error: ${data}`);
        });

        cp.on('close', (code) => {
          const endTime = new Date().toISOString();
          const duration = performance.now() - start;

          if (code === 0) {
            this.log('info', `Task completed successfully: ${task.id}`);
            this.processingTasks.delete(task.id);
          } else {
            task.retries++;
            if (task.retries < this.maxRetries) {
              const delay = 1000 * Math.pow(2, task.retries);
              this.log('warning', `Retrying task ${task.id} in ${delay}ms`);
              setTimeout(() => this.addTask(task), delay);
            } else {
              this.log('error', `Failed after ${this.maxRetries} attempts: ${task.id}`);
              this.processingTasks.delete(task.id);
            }
          }

          // Record performance metrics
          this.recordMetrics({
            id: task.id,
            duration,
            startTime,
            endTime,
            exitCode: code,
            retries: task.retries
          });
        });
      } catch (error) {
        this.log('error', `Unexpected error processing task: ${error.message}`);
        this.processingTasks.delete(task.id);
        throw error;
      }
    });
  }

  log(level, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} [${level.toUpperCase()}] ${message}\n`;
    
    fs.appendFileSync(this.logFile, logEntry);
  }

  recordMetrics(data) {
    // Implementation for recording metrics
    console.log('Record metrics:', data);
  }

  static getInstance() {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }
}

module.exports = QueueManager;