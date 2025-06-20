# Stage 1: FFmpeg builder
FROM alpine:3.19 as ffmpeg_builder
RUN wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -O /tmp/ffmpeg.tar.xz && \
    tar xf /tmp/ffmpeg.tar.xz -C /tmp && \
    mv /tmp/ffmpeg-*/ffmpeg /ffmpeg-dist/ && \
    rm -rf /tmp/*

# Stage 2: Main image
FROM node:20-slim

# Copy FFmpeg binary
COPY --from=ffmpeg_builder /ffmpeg-dist/ffmpeg /usr/local/bin/

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

# Instant user setup
RUN echo "nodejs:x:999:999::/app:/bin/false" >> /etc/passwd && \
    echo "nodejs:x:999:" >> /etc/group && \
    chown -R 999:999 /app
USER 999

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
    CMD curl -f http://localhost:6900/api/health || exit 1

EXPOSE 6900
CMD ["node", "server.js"]