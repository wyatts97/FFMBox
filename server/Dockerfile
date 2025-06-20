# Stage 1: FFmpeg builder using Alpine Linux
FROM alpine:3.19 as ffmpeg_builder
RUN apk add --no-cache ffmpeg

# Stage 2: Dependencies
FROM node:20-alpine as deps
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --omit=dev

# Stage 3: Builder
FROM node:20-alpine as builder
WORKDIR /app
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

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY server/ .

# Stage 4: Production image
FROM node:20-alpine
WORKDIR /app

# Copy FFmpeg and dependencies
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

# Copy built files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/ .

# Create necessary directories with correct permissions
RUN mkdir -p /app/uploads /app/output && \
    chown -R node:node /app

# Switch to non-root user
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:6900/api/health || exit 1

EXPOSE 6900
CMD ["node", "server.js"]