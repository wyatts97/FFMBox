# Stage 1: Dependencies
FROM node:20.12.2-alpine3.18 as deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Stage 2: Builder with FFmpeg
FROM node:20.12.2-alpine3.18 as builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY --from=deps /app/package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY . .

# Stage 3: Production image
FROM node:20.12.2-alpine3.18
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    ffmpeg \
    libgcc \
    libstdc++ \
    ca-certificates \
    openssl \
    tzdata \
    wget \
    && rm -rf /var/cache/apk/*

# Copy built files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/ .

# Copy and set up start script
COPY start-server.sh /app/start-server.sh
RUN chmod +x /app/start-server.sh

# Create necessary directories with correct permissions
RUN mkdir -p /app/uploads /app/output \
    && chown -R node:node /app \
    && chmod -R 755 /app \
    && chmod -R 775 /app/uploads /app/output

# Create non-root user and set permissions
RUN addgroup -S nodejs && adduser -S node -G nodejs \
    && chown -R node:nodejs /app

# Healthcheck script (run as root to avoid permission issues)
RUN echo '#!/bin/sh\n\
    if wget --no-verbose --tries=1 --spider http://localhost:5500/api/health; then\
    exit 0\
    else\
    # Check if we can write to the directories\
    if [ ! -w /app/uploads ] || [ ! -w /app/output ]; then\
    echo "Error: Cannot write to uploads or output directory" >&2\
    exit 1\
    fi\
    exit 1\
    fi\
    ' > /healthcheck.sh \
    && chmod +x /healthcheck.sh

# Health check configuration
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD /healthcheck.sh

# Switch to non-root user
USER node

# Expose ports
EXPOSE 5500 9229

# Start the application using the start script
CMD ["/app/start-server.sh"]