# =============================
# Stage 1: Builder
# =============================
FROM node:20.5.1-slim AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy pnpm related files and install dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY app/client/package.json app/client/
COPY app/server/package.json app/server/
COPY app/shared/package.json app/shared/

RUN pnpm install --frozen-lockfile

# Copy all application code
COPY app/client/ app/client/
COPY app/server/ app/server/
COPY app/shared/ app/shared/

# Build client and server
RUN pnpm --filter=ffmbox-client build
RUN pnpm --filter=ffmbox-server build

# =============================
# Stage 2: Final Runtime
# =============================
FROM node:20.5.1-slim

# Install ffmpeg
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN addgroup --system appgroup && adduser --system --ingroup appuser
RUN mkdir -p /app/uploads /app/output /app/logs && \
    chown -R appuser:appgroup /app

# Copy built client assets
COPY --from=builder /app/app/client/dist ./public

# Copy server production dependencies and built files
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/app/server /app/server
COPY --from=builder /app/app/shared /app/shared

# Copy healthcheck script
COPY --chown=appuser:appgroup app/server/healthcheck.sh /app/healthcheck.sh
RUN chmod +x /app/healthcheck.sh && \
    chown -R appuser:appgroup /app/uploads /app/output /app/logs && \
    chmod -R 775 /app/uploads /app/output /app/logs

USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --spider -q http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["node", "server/server.js"]
