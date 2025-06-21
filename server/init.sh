#!/bin/sh
set -e

# Validate required environment variables
for var in UPLOAD_DIR OUTPUT_DIR; do
  eval "value=\$$var"
  if [ -z "$value" ]; then
    echo "Error: $var is not set"
    exit 1
  fi
done

# Create directories with proper permissions
echo "Creating directories..."
mkdir -p "$UPLOAD_DIR" "$OUTPUT_DIR"
chown -R node:node "$UPLOAD_DIR" "$OUTPUT_DIR"
chmod -R 755 "$UPLOAD_DIR" "$OUTPUT_DIR"

# Check if FFmpeg is available
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "Error: FFmpeg is not installed or not in PATH"
  exit 1
fi

# Verify FFmpeg version
echo "FFmpeg version: $(ffmpeg -version | head -n1)"

# Check if directories are writable
for dir in "$UPLOAD_DIR" "$OUTPUT_DIR"; do
  if [ ! -w "$dir" ]; then
    echo "Error: Directory $dir is not writable"
    exit 1
  fi
done

echo "Initialization complete."