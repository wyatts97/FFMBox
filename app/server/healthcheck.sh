#!/bin/sh

# Check HTTP server health
HTTP_STATUS=$(wget --spider -S http://localhost:3000/health 2>&1 | grep "HTTP/" | awk '{print $2}')
if [ "$HTTP_STATUS" != "200" ]; then
  echo "HTTP health check failed with status: $HTTP_STATUS"
  exit 1
fi

# Check FFmpeg availability
FFMPEG_VERSION=$(ffmpeg -version 2>/dev/null | head -n1)
if [ -z "$FFMPEG_VERSION" ]; then
  echo "FFmpeg not found or not working"
  exit 1
fi

# Check disk space
DISK_SPACE=$(df /app | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_SPACE" -gt 90 ]; then
  echo "Disk space critically low: $DISK_SPACE% used"
  exit 1
fi

# Check directory permissions
for dir in /app/uploads /app/output /app/logs; do
  if [ ! -w "$dir" ]; then
    echo "Directory not writable: $dir"
    exit 1
  fi
done

exit 0
