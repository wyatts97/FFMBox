# =============================
# Stage 1: Builder
# =============================
FROM node:20.5.1-slim AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.12.4

# Copy workspace root files
COPY package.json pnpm-workspace.yaml ./

# Copy app-specific package.json files
COPY app/client/package.json app/client/
COPY app/server/package.json app/server/
COPY app/shared/package.json app/shared/

# Install all workspace dependencies
RUN pnpm install

# Copy full source code
COPY app/client/ app/client/
COPY app/server/ app/server/
COPY app/shared/ app/shared/

# Build client and server
RUN pnpm --filter=ffmbox-client build
RUN pnpm --filter=ffmbox-server build

# =============================
# Stage 2: Final Runtime
# =============================
FROM jrottenberg/ffmpeg:4.1-ubuntu

# Install Node.js runtime (since base image doesn't include it)
RUN apt-get update && \
    apt-get install -y curl ca-certificates gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    npm install -g pnpm@10.12.4 && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create app user and directories
RUN groupadd --system appgroup && useradd --system --gid appgroup --create-home appuser
RUN mkdir -p /app/uploads /app/output /app/logs && \
    chown -R appuser:appgroup /app

# Copy client build
COPY --from=builder /app/app/client/dist ./public

# Copy built server and shared code
COPY --from=builder /app/app/server /app/server
COPY --from=builder /app/app/shared /app/shared

# Copy server's package
COPY app/server/package.json ./server/
COPY pnpm-lock.yaml ./

# Install server dependencies only
RUN cd server && pnpm install --prod

# Copy healthcheck script
COPY --chown=appuser:appgroup app/server/healthcheck.sh /app/healthcheck.sh
RUN chmod +x /app/healthcheck.sh && \
    chown -R appuser:appgroup /app/uploads /app/output /app/logs && \
    chmod -R 775 /app/uploads /app/output /app/logs

USER appuser

# Healthcheck config
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --spider -q http://localhost:3000/health || exit 1

EXPOSE 3000

# Launch server
CMD ["node", "server/server.js"]