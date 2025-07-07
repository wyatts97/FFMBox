FROM node:18-slim

# Install ffmpeg
RUN apt-get update &&     apt-get install -y --no-install-recommends ffmpeg &&     rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Start the app
CMD [ "node", "src/server.js" ]
