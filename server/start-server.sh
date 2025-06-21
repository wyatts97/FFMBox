#!/bin/sh

# Create log directory if it doesn't exist
mkdir -p /app/logs

# Set log file path
LOG_FILE="/app/logs/server-$(date +%Y%m%d-%H%M%S).log"

echo "=== Starting FFMBox Server ===" | tee -a "$LOG_FILE"
echo "Date: $(date)" | tee -a "$LOG_FILE"
echo "User: $(whoami)" | tee -a "$LOG_FILE"

# Log environment variables (excluding sensitive ones)
echo -e "\n=== Environment ===" | tee -a "$LOG_FILE"
printenv | grep -v -E 'PASSWORD|SECRET|KEY|TOKEN' | sort | tee -a "$LOG_FILE"

# Log directory permissions
echo -e "\n=== Directory Permissions ===" | tee -a "$LOG_FILE"
ls -ld /app /app/uploads /app/output | tee -a "$LOG_FILE"

# Start the server with output to both console and log file
echo -e "\n=== Starting Node.js Server ===" | tee -a "$LOG_FILE"
exec node --inspect=0.0.0.0:9229 server.js 2>&1 | tee -a "$LOG_FILE"

# If we get here, the server has crashed
EXIT_CODE=${PIPESTATUS[0]}
echo -e "\n=== Server crashed with status $EXIT_CODE ===" | tee -a "$LOG_FILE"

# Keep container running for debugging
while true; do sleep 3600; done
