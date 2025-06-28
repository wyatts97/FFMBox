#!/bin/sh
set -e

# Set default values if not provided
UPLOAD_DIR="${UPLOAD_DIR:-/app/uploads}"
OUTPUT_DIR="${OUTPUT_DIR:-/app/output}"
LOG_DIR="${LOG_DIR:-/app/logs}"

# Validate required environment variables
for var in UPLOAD_DIR OUTPUT_DIR LOG_DIR; do
  eval "value=\$$var"
  if [ -z "$value" ]; then
    echo "Error: $var is not set" >&2
    exit 1
  fi
done

# Create directories with proper permissions
echo "Creating directories..."
for dir in "$UPLOAD_DIR" "$OUTPUT_DIR" "$LOG_DIR"; do
  # Create directory if it doesn't exist
  mkdir -p "$dir"
  
  # Only run chown if we're root (user ID 0)
  if [ "$(id -u)" = "0" ]; then
    chown -R node:node "$dir" || echo "Warning: Could not change ownership of $dir - running as non-root user" >&2
  fi
  
  # Set directory permissions
  chmod 755 "$dir"
  
  # Test if we can write to the directory
  if ! touch "$dir/.test" 2>/dev/null || ! rm -f "$dir/.test" 2>/dev/null; then
    echo "Error: Cannot write to $dir" >&2
    exit 1
  fi
done

# Verify required commands are available
for cmd in ffmpeg ffprobe; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: $cmd is not installed or not in PATH" >&2
    exit 1
  fi
done

# Verify FFmpeg version and required codecs
echo "=== System Information ==="
echo "FFmpeg version: $(ffmpeg -version | head -n1)"
echo "FFprobe version: $(ffprobe -version | head -n1)"

printf "Checking FFmpeg codecs... "
if ! ffmpeg -codecs >/dev/null 2>&1; then
  echo "Error: FFmpeg codec check failed" >&2
  exit 1
fi
echo "OK"

# Check directory permissions
printf "Checking directory permissions... "
for dir in "$UPLOAD_DIR" "$OUTPUT_DIR" "$LOG_DIR"; do
  if [ ! -w "$dir" ]; then
    echo "Error: Directory $dir is not writable"
    exit 1
  fi
done

echo "Initialization complete."