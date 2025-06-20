# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --no-audit --no-fund

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source files
COPY . .


# Build the application
RUN npm run build

# Stage 3: Production
FROM nginx:stable-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Remove default config
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy custom Nginx config
COPY --chown=nginx:nginx nginx.conf /etc/nginx/nginx.conf

# Copy built assets from builder
COPY --chown=nginx:nginx --from=builder /app/dist /usr/share/nginx/html

# Create a non-root user and set permissions
RUN chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d /run/nginx.pid \
    && chmod -R 755 /var/cache/nginx /var/log/nginx /etc/nginx/conf.d /run/nginx.pid \
    && chmod -R 755 /usr/share/nginx/html

# Switch to nginx user
USER nginx

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]