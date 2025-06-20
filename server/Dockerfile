# Stage 1: FFmpeg builder using Alpine Linux
FROM alpine:3.19 as ffmpeg_builder
RUN apk add --no-cache ffmpeg

# Stage 2: Main application image
FROM node:20-alpine

# Copy FFmpeg and its dependencies from builder
COPY --from=ffmpeg_builder /usr/bin/ffmpeg /usr/bin/ffmpeg
COPY --from=ffmpeg_builder /usr/bin/ffprobe /usr/bin/ffprobe
COPY --from=ffmpeg_builder /usr/lib/ /usr/lib/

# Install runtime dependencies
RUN apk add --no-cache \
    libgcc \
    libstdc++ \
    ca-certificates \
    libcrypto3 \
    libssl3 \
    tzdata \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Install Node.js dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Create necessary directories with correct permissions
RUN mkdir -p /app/uploads /app/output && \
    chown -R node:node /app

# Copy application files
COPY --chown=node:node . .

# Switch to non-root user
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:6900/api/health || exit 1

EXPOSE 6900
CMD ["node", "server.js"]