# Stage 1: Dependencies
FROM node:20.12.2-alpine3.18 as deps
WORKDIR /app
COPY server/package*.json ./
# First try npm ci, if it fails, fall back to npm install
RUN npm ci --omit=dev || npm install --omit=dev

# Stage 2: Builder with FFmpeg
FROM node:20.12.2-alpine3.18 as builder
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files and install dependencies
COPY --from=deps /app/package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copy source files
COPY server/ .

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
    && rm -rf /var/cache/apk/*

# Copy built files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/ .

# Create necessary directories with correct permissions
RUN mkdir -p /app/uploads /app/output && \
    chown -R node:node /app && \
    chmod -R 777 /app/uploads /app/output

# Switch to non-root user
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:6900/api/health || exit 1

EXPOSE 6900
CMD ["node", "server.js"]