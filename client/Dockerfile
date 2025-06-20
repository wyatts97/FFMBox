# Stage 1: Dependencies
FROM node:20.12.2-alpine3.18 AS deps
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --no-audit --no-fund

# Stage 2: Builder
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

# Stage 3: Production
FROM nginx:stable-alpine

# Install curl for healthcheck and gzip for static file compression
RUN apk add --no-cache curl

# Remove default config
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy custom Nginx config with compression and security headers
COPY --chown=nginx:nginx nginx.conf /etc/nginx/nginx.conf

# Copy built assets from builder
COPY --chown=nginx:nginx --from=builder /app/dist /usr/share/nginx/html

# Set proper permissions
RUN chown -R nginx:nginx /var/cache/nginx /var/log/nginx /etc/nginx/conf.d /run/nginx.pid \
    && chmod -R 755 /var/cache/nginx /var/log/nginx /etc/nginx/conf.d /run/nginx.pid \
    && chmod -R 755 /usr/share/nginx/html

# Create a health check endpoint
RUN echo 'OK' > /usr/share/nginx/html/health

# Switch to nginx user for security
USER nginx

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]