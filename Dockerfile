# Stage 1: Build
FROM node:20 AS builder

WORKDIR /app

# 1. Copy dependency files first (better caching)
COPY package.json package-lock.json ./
COPY vite.config.ts tsconfig*.json ./
COPY tailwind.config.ts postcss.config.js ./

# 2. Install dependencies (including devDependencies for build)
RUN npm ci

# 3. Copy source code
COPY src ./src
COPY public ./public
COPY index.html index.css ./

# 4. Build production assets
RUN npm run build

# Verify build output
RUN ls -l /app/dist && \
    [ -f /app/dist/index.html ] && \
    [ -d /app/dist/assets ]

# Stage 2: Production
FROM nginx:alpine

# Remove default config
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
    CMD curl -f http://localhost/ || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]