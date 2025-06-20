#!/bin/bash

# Create required directories if they don't exist
mkdir -p uploads output

# Set proper permissions (775 for directories, 664 for files)
find uploads output -type d -exec chmod 775 {} \;
find uploads output -type f -exec chmod 664 {} \;

# Set ownership to the current user and docker group (if available)
if [ "$(uname -s)" = "Linux" ]; then
    sudo chown -R $USER:$(id -gn) uploads output
    # If docker group exists, add it to the directories
    if getent group docker >/dev/null; then
        sudo chown -R $USER:docker uploads output
    fi
else
    # For non-Linux systems (like macOS)
    chown -R $(id -u):$(id -g) uploads output
fi

echo "Setup complete. Directories created with proper permissions:"
echo "- uploads/: $(stat -c '%A %U:%G' uploads)"
echo "- output/: $(stat -c '%A %U:%G' output)" 2>/dev/null || \
  echo "- output/: $(stat -f '%Sp %u:%g' output 2>/dev/null || echo 'permissions set')"
