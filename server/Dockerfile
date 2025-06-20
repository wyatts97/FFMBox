FROM node:20-slim  # Using slim variant for smaller image size

# Install ffmpeg and cleanup in single RUN layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy only necessary files (adjust as needed)
COPY server.js .
COPY uploads/. /app/uploads/
COPY output/. /app/output/

# Create non-root user and set permissions
RUN groupadd -r nodejs && \
    useradd -r -g nodejs -d /app nodejs && \
    chown -R nodejs:nodejs /app && \
    chmod -R 755 /app/uploads /app/output

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
    CMD curl -f http://localhost:6900/api/health || exit 1

EXPOSE 6900

CMD ["node", "server.js"]