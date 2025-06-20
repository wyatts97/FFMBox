# Stage 1: FFmpeg builder using official Debian packages
FROM debian:bookworm-slim as ffmpeg_builder
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    mkdir -p /ffmpeg-dist/usr/bin /ffmpeg-dist/usr/lib && \
    cp /usr/bin/ffmpeg /usr/bin/ffprobe /ffmpeg-dist/usr/bin/ && \
    ldd /usr/bin/ffmpeg | awk '/=>/ {print $3}' | xargs -I{} cp --parents {} /ffmpeg-dist/ && \
    rm -rf /var/lib/apt/lists/*

# Stage 2: Main application image
FROM node:20-slim

# Copy FFmpeg and its dependencies
COPY --from=ffmpeg_builder /ffmpeg-dist/ /

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

RUN mkdir -p /app/uploads /app/output && \
    chmod -R 755 /app/uploads /app/output

COPY . .

# User setup
RUN echo "nodejs:x:999:999::/app:/bin/false" >> /etc/passwd && \
    echo "nodejs:x:999:" >> /etc/group && \
    chown -R 999:999 /app
USER 999

HEALTHCHECK --interval=30s --timeout=3s \
    CMD curl -f http://localhost:6900/api/health || exit 1

EXPOSE 6900
CMD ["node", "server.js"]