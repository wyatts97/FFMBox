# Stage 1: Tiny FFmpeg builder
FROM alpine:3.19 as ffmpeg_builder
RUN apk add --no-cache wget tar xz && \
    wget https://johnvansickle.com/ffmpeg/builds/ffmpeg-git-amd64-static.tar.xz && \
    mkdir -p /ffmpeg-dist && \
    tar -xJf /tmp/ffmpeg.tar.xz -C /ffmpeg-dist --strip-components=1 && \
    rm /tmp/ffmpeg.tar.xz

# Stage 2: Main image
FROM node:20-slim

# Copy FFmpeg binary
COPY --from=ffmpeg_builder /ffmpeg-dist/ffmpeg /usr/local/bin/
COPY --from=ffmpeg_builder /ffmpeg-dist/ffprobe /usr/local/bin/

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

RUN mkdir -p /app/uploads /app/output && \
    chmod -R 755 /app/uploads /app/output

COPY . .

# Instant user setup
RUN echo "nodejs:x:999:999::/app:/bin/false" >> /etc/passwd && \
    echo "nodejs:x:999:" >> /etc/group && \
    chown -R 999:999 /app
USER 999

HEALTHCHECK --interval=30s --timeout=3s \
    CMD curl -f http://localhost:6900/api/health || exit 1

EXPOSE 6900
CMD ["node", "server.js"]