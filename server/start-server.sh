#!/bin/sh

# Create log directory if it doesn't exist
mkdir -p /app/logs

# Set log file path
LOG_FILE="/app/logs/server-$(date +%Y%m%d-%H%M%S).log"

echo "=== Starting FFMBox Server ===" | tee -a "$LOG_FILE"
echo "Date: $(date)" | tee -a "$LOG_FILE"
echo "User: $(whoami)" | tee -a "$LOG_FILE"

# Log environment variables (excluding sensitive ones)
printf "\n=== Environment ===\n" | tee -a "$LOG_FILE"
printenv | grep -v -E 'PASSWORD|SECRET|KEY|TOKEN' | sort | tee -a "$LOG_FILE"

# Log directory permissions
printf "\n=== Directory Permissions ===\n" | tee -a "$LOG_FILE"
ls -ld /app /app/uploads /app/output | tee -a "$LOG_FILE"

# Start the server with output to both console and log file
printf "\n=== Starting Node.js Server ===\n" | tee -a "$LOG_FILE"
(
  node --inspect=0.0.0.0:9229 server.js 2>&1
  echo $? > /tmp/exitcode
) | tee -a "$LOG_FILE"
EXIT_CODE=$(cat /tmp/exitcode)

printf "\n=== Server crashed with status $EXIT_CODE ===\n" | tee -a "$LOG_FILE"

# Keep container running for debugging
while true; do sleep 3600; done