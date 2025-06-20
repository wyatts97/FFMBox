FROM node:20 AS frontend

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci --omit=dev  # Use npm ci for reproducible builds

# Copy remaining files
COPY vite.config.ts ./
COPY tsconfig*.json ./
COPY postcss.config.js tailwind.config.ts ./
COPY src ./src
COPY public ./public
COPY index.html ./
COPY index.css ./

# Build the app
RUN npm run build && \
    ls -l /app/dist && \
    [ -f /app/dist/index.html ] && \
    [ -d /app/dist/assets ]

# ---- NGINX stage ----
FROM nginx:alpine

# Remove default nginx config
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy built assets and custom config
COPY --from=frontend /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
    CMD curl -f http://localhost/ || exit 1

EXPOSE 80

