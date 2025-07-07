const QueueManager = require('./queue-manager');
const { ChildProcess } = require('child_process');
const fs = require('fs');
const path = require('path');

class FFmpegWorker {
  constructor() {
    this.queueManager = QueueManager.getInstance();
    this.running = false;
  }

  async start() {
    this.running = true;
    this.log('info', 'FFmpeg worker started');
    
    while (this.running && this.queueManager.queue.size() > 0) {
      const task = this.queueManager.getNextTask();
      if (!task) break;

      try {
        this.log('debug', `Starting ffmpeg process for task: ${task.id}`);
        
        const cp = new ChildProcess(task.command);
        
        cp.stdout.on('data', (data) => {
          this.log('debug', `FFmpeg Output: ${data}`);
        });

        cp.stderr.on('data', (data) => {
          this.log('error', `FFmpeg Error: ${data}`);
        });

        cp.on('close', (code) => {
          if (code === 0) {
            this.log('info', `Task completed successfully: ${task.id}`);
            this.queueManager.taskComplete(task.id);
          } else {
            this.log('error', `Task failed with code ${code}: ${task.id}`);
            this.queueManager.taskFailed(task.id);
          }
        });
      } catch (error) {
        this.log('error', `Worker failed to process task: ${error.message}`);
        this.queueManager.taskFailed(task.id);
        break;
      }
    }
  }

  stop() {
    this.running = false;
    this.log('info', 'FFmpeg worker stopping');
  }

  log(level, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} [${level.toUpperCase()}] FFmpeg Worker: ${message}\n`;
    
    fs.appendFileSync(QueueManager.getInstance().logFile, logEntry);
  }
}

module.exports = FFmpegWorker;

// For standalone execution
if (require.main === module) {
  const worker = new FFmpegWorker();
  worker.start().catch(console.error);
}