# FFMBox

A full-stack media conversion tool built with FFmpeg, React, and Node.js. This project provides a user-friendly web interface for converting media files using FFmpeg in the browser and server-side.

## Features

- Upload and convert media files
- Real-time progress updates with WebSockets
- Responsive UI with dark/light mode
- Support for various media formats
- Docker support for easy deployment

## Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher) or yarn
- Docker (optional, for containerized deployment)
- FFmpeg (for server-side processing)

## Getting Started

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ffmbox.git
   cd fmbox
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your configuration.

4. Start the development servers:
   ```bash
   # Using npm workspaces (recommended)
   npm run dev
   
   # Or manually start both servers
   cd app/client && npm run dev
   # In a new terminal
   cd app/server && npm run dev
   ```
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3000/api

### Production Build

1. Build the application:
   ```bash
   # Build both client and server
   npm run build
   
   # Or build individually
   npm run build:client
   npm run build:server
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## Docker Deployment

### Development

```bash
docker-compose -f docker-compose.dev.yml up --build
```

### Production

```bash
docker-compose up --build -d
```

Access the application at http://localhost:3000

## Project Structure

```
FFMBox/
├── app/
│   ├── client/        # Vite/React frontend
│   └── server/        # Express/FFmpeg backend
├── public/            # Static files (built from client/dist)
├── .dockerignore
├── Dockerfile         # Production build
├── Dockerfile.dev     # Development build
├── docker-compose.yml
├── docker-compose.dev.yml
├── Makefile
└── README.md
```

## 🔧 Configuration

Environment variables can be set in `.env` file or directly in `docker-compose.yml`:

```env
NODE_ENV=development
PORT=3000
UPLOAD_DIR=/app/uploads
OUTPUT_DIR=/app/output
LOG_DIR=/app/logs
```

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
