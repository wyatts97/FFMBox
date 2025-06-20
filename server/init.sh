#!/bin/sh
set -e

# Create directories if they don't exist
mkdir -p ${UPLOAD_DIR} ${OUTPUT_DIR}
chmod -R 755 ${UPLOAD_DIR} ${OUTPUT_DIR}

# Wait for any dependent services
while ! curl -s http://dependent-service:port >/dev/null; do
  echo "Waiting for dependent service..."
  sleep 2
done

# Start application
exec node server.js