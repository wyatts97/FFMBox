# Stage 1: Build the client application
FROM node:lts-alpine AS builder
WORKDIR /app/client

# Copy package files first for better caching
COPY package*.json ./


# Install dependencies with cache and clean cache
RUN npm install --no-audit --no-fund && \
    npm cache clean --force

# Copy source code
COPY . .

# Build the application with error handling
RUN echo "Building client application..." && \
    npm run build || (echo "Build failed" && exit 1) && \
    # Verify build output exists
    if [ ! -d "dist" ]; then \
    echo "Error: Build output 'dist' directory not found" && \
    ls -la && \
    exit 1; \
    fi && \
    echo "Build completed successfully" && \
    # Clean up dev dependencies
    rm -rf node_modules && \
    npm install --production && \
    ls -la dist/

# Stage 2: Production image with Nginx
FROM nginx:stable-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Create directory for static files
RUN mkdir -p /usr/share/nginx/html

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --spider -q http://localhost || exit 1

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]