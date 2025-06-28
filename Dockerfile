# ========================================
# Stage 1: Build the frontend (Vite/React)
# ========================================
FROM node:20.5.1-alpine AS frontend-builder

WORKDIR /app/client

COPY app/client/package*.json ./

RUN npm install --silent

COPY app/client/ ./

RUN npm run build && npm prune --production

# ========================================
# Stage 2: Build the backend (Node/Express)
# ========================================
FROM node:20.5.1-alpine AS backend-builder

WORKDIR /app/server

RUN apk add --no-cache ffmpeg

COPY app/server/package*.json ./

RUN npm install --production --silent

COPY app/server/ ./

# ========================================
# Stage 3: Final Production Image
# ========================================
FROM node:20.5.1-alpine AS ffmbox

# Install FFmpeg (again, for runtime usage)
RUN apk add --no-cache ffmpeg

# Create app directory and user
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup && \
    mkdir -p /app/uploads /app/output /app/logs && \
    chown -R appuser:appgroup /app

# Copy backend and node_modules from backend-builder
COPY --from=backend-builder /app/server /app/server
COPY --from=backend-builder /app/server/node_modules /app/node_modules
COPY --from=backend-builder /app/server/package*.json /app/

# Copy built frontend files
COPY --from=frontend-builder /app/client/dist /app/public

# Copy scripts and give proper ownership
COPY --chown=appuser:appgroup app/server/healthcheck.sh /app/healthcheck.sh
RUN chmod +x /app/healthcheck.sh

# Set ownership and permissions again for good measure
RUN chown -R appuser:appgroup /app && \
    chmod -R 775 /app/uploads /app/output /app/logs

# Set non-root user
USER appuser

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --spider -q http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["node", "server/index.js"]
