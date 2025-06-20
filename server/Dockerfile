# Backend Dockerfile for ffmbox service
FROM node:20

# Install ffmpeg (Debian-based for Node 20)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend dependencies and source
COPY package.json package-lock.json ./
COPY . .

RUN npm install --production

# Ensure upload/output dirs exist
RUN mkdir -p /app/uploads /app/output

EXPOSE 6900

CMD ["node", "server.js"]
