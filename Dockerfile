
# ---- Frontend build stage ----
FROM node:20 AS frontend

WORKDIR /app

# Copy frontend dependencies and source
COPY package.json package-lock.json ./
COPY vite.config.ts ./
COPY tsconfig*.json ./
COPY src ./src
COPY public ./public
COPY index.html ./

RUN npm install
RUN npm run build && ls -l /app/dist && [ -f /app/dist/index.html ]

# ---- NGINX stage ----
FROM nginx:alpine AS nginx
COPY --from=frontend /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf


