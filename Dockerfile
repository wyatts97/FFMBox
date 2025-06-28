# ========================================
# Stage 1: Build the frontend (Vite/React)
# ========================================
FROM node:20.5.1-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY app/client/package*.json ./app/client/

# Install frontend dependencies
RUN cd app/client && \
    npm ci --only=production --silent

# Copy frontend source
COPY app/client/ ./app/client/

# Build the frontend
RUN cd app/client && \
    npm run build

# ========================================
# Stage 2: Build the backend (Node/Express)
# ========================================
FROM node:20.5.1-alpine AS backend-builder

WORKDIR /app

# Install system dependencies (FFmpeg)
RUN apk add --no-cache ffmpeg

# Copy package files
COPY app/server/package*.json ./app/server/

# Install backend dependencies
RUN cd app/server && \
    npm ci --only=production --silent

# ========================================
# Stage 3: Production Image
# ========================================
FROM node:20.5.1-alpine

# Install runtime dependencies and remove client-side FFmpeg WASM to avoid conflicts
RUN apk add --no-cache ffmpeg && \
    rm -rf /app/node_modules/@ffmpeg

WORKDIR /app

# Create non-root user and set up directories
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    mkdir -p /app/uploads /app/output /app/logs && \
    chown -R appuser:appgroup /app

# Copy built frontend from frontend-builder
COPY --from=frontend-builder /app/client/dist ./public

# Copy backend from backend-builder
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/package*.json ./
COPY --from=backend-builder /app/app/server ./server

# Copy necessary files
COPY --chown=appuser:appgroup app/server/package*.json ./

# Create necessary directories
RUN mkdir -p /app/uploads /app/output /app/logs && \
    chown -R appuser:appgroup /app/uploads /app/output /app/logs && \
    chmod -R 775 /app/uploads /app/output /app/logs

# Copy and make healthcheck executable
COPY --chown=appuser:appgroup app/server/healthcheck.sh /app/healthcheck.sh
RUN chmod +x /app/healthcheck.sh

# Switch to non-root user
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --spider -q http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server/index.js"]
