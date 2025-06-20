
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

# ---- Backend stage ----
FROM node:20 AS backend

# Install ffmpeg (Debian-based for Node 20)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend dependencies and source
COPY server/package.json server/package-lock.json ./server/
WORKDIR /app/server
RUN npm install

# Copy built frontend
WORKDIR /app
COPY --from=frontend /app/dist ./dist

# Copy backend source
COPY server/. ./server/

# Ensure upload/output dirs exist
RUN mkdir -p /app/server/uploads /app/server/output

WORKDIR /app/server

EXPOSE 6900

CMD ["node", "server.js"]

