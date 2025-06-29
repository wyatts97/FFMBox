# =============================
# Stage 1: Frontend Builder
# =============================
FROM node:20.5.1-slim AS frontend-builder

WORKDIR /app

COPY app/client/package*.json ./app/client/
RUN cd app/client && npm install --silent

COPY app/client/ ./app/client/
RUN cd app/client && npm run build

# =============================
# Stage 2: Backend Builder
# =============================
FROM node:20.5.1-slim AS backend-builder

WORKDIR /app

COPY app/server/package*.json ./server/
RUN cd server && npm install --only=production --silent
COPY app/server/ ./server/

# =============================
# Stage 3: Final Runtime
# =============================
FROM node:20.5.1-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
RUN mkdir -p /app/uploads /app/output /app/logs && \
    chown -R appuser:appgroup /app

COPY --from=frontend-builder /app/app/client/dist ./public
COPY --from=backend-builder /app/server /app/server
COPY --from=backend-builder /app/server/node_modules /app/server/node_modules
COPY --from=backend-builder /app/server/package*.json /app/server/

COPY --chown=appuser:appgroup app/server/healthcheck.sh /app/healthcheck.sh
RUN chmod +x /app/healthcheck.sh && \
    chown -R appuser:appgroup /app/uploads /app/output /app/logs && \
    chmod -R 775 /app/uploads /app/output /app/logs

USER appuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --spider -q http://localhost:3000/health || exit 1

EXPOSE 3000

CMD ["node", "server/server.js"]