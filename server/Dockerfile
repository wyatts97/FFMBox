# Stage 1: Build FFmpeg and its dependencies
FROM debian:bookworm-slim as ffmpeg_builder
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    mkdir -p /ffmpeg-dist/usr/bin /ffmpeg-dist/usr/lib && \
    cp /usr/bin/ffmpeg /ffmpeg-dist/usr/bin/ && \
    cp -r /usr/lib/x86_64-linux-gnu/ /ffmpeg-dist/usr/lib/ && \
    rm -rf /var/lib/apt/lists/*

# Stage 2: Main application image
FROM node:20-slim

# Copy FFmpeg from builder
COPY --from=ffmpeg_builder /ffmpeg-dist /

# Set library path
ENV LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu

WORKDIR /app

# Copy dependency files first (better caching)
COPY package.json package-lock.json ./

# Install production dependencies
RUN npm ci --omit=dev && \
    npm cache clean --force

# Create directories
RUN mkdir -p /app/uploads /app/output && \
    chmod -R 755 /app/uploads /app/output

# Copy application files
COPY . .

# Non-root user setup
RUN set -x ; \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nodejs && \
    chown -R nodejs:nodejs /app

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
    CMD curl -f http://localhost:6900/api/health || exit 1

EXPOSE 6900
CMD ["node", "server.js"]