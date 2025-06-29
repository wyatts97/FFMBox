# =============================
# Stage 1: Builder
# =============================
FROM node:20.5.1-slim AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.12.4

# Copy pnpm workspace files
COPY package.json pnpm-workspace.yaml ./
COPY app/client/package.json app/client/
COPY app/server/package.json app/server/
COPY app/shared/package.json app/shared/

RUN pnpm install

# Copy source files
COPY app/client/ app/client/
COPY app/server/ app/server/
COPY app/shared/ app/shared/

# Build client and server
RUN pnpm --filter=ffmbox-client build
RUN pnpm --filter=ffmbox-server build

# =============================
# Stage 2: Runtime
# =============================
FROM jrottenberg/ffmpeg:4.1-ubuntu

# Install Node.js manually
RUN apt-get update && \
    apt-get install -y curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    node -v && npm -v

WORKDIR /app

# Setup app user and folders
RUN groupadd --system appgroup && useradd --system --gid appgroup --create-home appuser
RUN mkdir -p /app/uploads /app/output /app/logs && \
    chown -R appuser:appgroup /app

# Copy frontend assets
COPY --from=builder /app/app/client/dist ./public

# Copy backend code and dependencies
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/app/server /app/server
COPY --from=builder /app/app/shared /app/shared

# Healthcheck script
COPY --chown=appuser:appgroup app/server/healthcheck.sh /app/healthcheck.sh
RUN chmod +x /app/healthcheck.sh && \
    chown -R appuser:appgroup /app/uploads /app/output /app/logs && \
    chmod -R 775 /app/uploads /app/output /app/logs

USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --spider -q http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["node", "server/server.js"]