#!/bin/bash

# This script checks the directory structure inside the container

echo "Current directory: $(pwd)"
echo "Contents of /app:"
ls -la /app
echo -e "\nContents of /app/src:"
ls -la /app/src
echo -e "\nContents of /app/src/routes:"
ls -la /app/src/routes 2>/dev/null || echo "Routes directory not found"

echo -e "\nChecking if api.js exists:"
if [ -f "/app/src/routes/api.js" ]; then
    echo "✅ /app/src/routes/api.js exists"
else
    echo "❌ /app/src/routes/api.js not found"
fi
