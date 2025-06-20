FROM node:20-slim

# Install latest FFmpeg from Debian repos
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

WORKDIR /app

# 2. Copy dependency files first (better caching)
COPY package.json package-lock.json ./

# 3. Install production dependencies + clean cache
RUN npm ci --omit=dev && npm cache clean --force

# 4. Create directories with correct permissions
RUN mkdir -p /app/uploads /app/output && \
    chmod -R 755 /app/uploads /app/output

# 5. Copy application files
COPY . .

# 6. Non-root user setup
RUN set -x ; \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs nodejs && \
    chown -R nodejs:nodejs /app

USER nodejs

# 7. Health check
HEALTHCHECK --interval=30s --timeout=3s \
    CMD curl -f http://localhost:6900/api/health || exit 1

EXPOSE 6900
CMD ["node", "server.js"]