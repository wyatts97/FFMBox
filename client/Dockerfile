# Stage 1: Builder
FROM node:20.12.2-alpine3.18 AS builder
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --no-audit --no-fund

# Copy source files
COPY . .

# Build the application with production settings
ENV NODE_ENV=production
ENV GENERATE_SOURCEMAP=false
RUN npm run build

# Stage 2: Production
FROM nginx:stable-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

# Remove default config and create necessary directories
RUN rm -rf /etc/nginx/conf.d/default.conf \
    && mkdir -p /var/cache/nginx /var/log/nginx /etc/nginx/conf.d \
    && touch /var/run/nginx.pid

# Set permissions for nginx user
RUN chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d /var/run/nginx.pid \
    && chmod -R 755 /var/cache/nginx /var/log/nginx /etc/nginx/conf.d /var/run/nginx.pid

# Copy custom Nginx config
COPY --chown=nginx:nginx nginx.conf /etc/nginx/nginx.conf

# Copy built assets from builder
COPY --chown=nginx:nginx --from=builder /app/dist /usr/share/nginx/html

# Set permissions for web files
RUN chmod -R 755 /usr/share/nginx/html \
    && chown -R nginx:nginx /usr/share/nginx/html

# Create a health check endpoint
RUN echo 'OK' > /usr/share/nginx/html/health \
    && chmod 644 /usr/share/nginx/html/health

# Switch to nginx user for security
USER nginx

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]