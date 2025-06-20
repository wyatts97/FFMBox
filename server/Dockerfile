# Stage 1: Dependencies
FROM node:20.12.2-alpine3.18 as deps
WORKDIR /app
COPY server/package*.json ./
# First try npm ci, if it fails, fall back to npm install
RUN npm ci --omit=dev || npm install --omit=dev

# Stage 2: Builder with FFmpeg
FROM node:20.12.2-alpine3.18 as builder
WORKDIR /app

# Update and install dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
    ffmpeg \
    libgcc \
    libstdc++ \
    ca-certificates \
    openssl \
    tzdata \
    && rm -rf /var/cache/apk/*

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY server/ .

# Stage 3: Production image
FROM node:20.12.2-alpine3.18
WORKDIR /app

# Install runtime dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
    ffmpeg \
    libgcc \
    libstdc++ \
    ca-certificates \
    openssl \
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