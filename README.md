
# FFMBox - Web Version

A web-based FFmpeg video converter that runs in Docker containers, providing a modern UI for media file conversion.

## Features

- 🎬 **Multiple Format Support**: Convert between MP4, WebM, GIF, and audio formats
- 🎯 **Batch Processing**: Upload and convert multiple files simultaneously
- 📊 **Real-time Progress**: WebSocket-powered live conversion updates
- 🎨 **Modern UI**: YouTube-inspired dark/light theme interface
- ⚡ **Fast Processing**: FFmpeg-powered backend for efficient conversion
- 🐳 **Docker Ready**: Fully containerized for easy deployment

## Quick Start with Docker

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/wyatts97/FFMBox.git
cd FFMBox

# Start the application
docker-compose up -d

# Access the app at http://localhost:6900
```

### Option 2: Docker Build

```bash
# Build the image
docker build -t ffmbox .

# Run the container
docker run -p 6900:6900 -v $(pwd)/uploads:/app/server/uploads -v $(pwd)/output:/app/server/output ffmbox

# Access the app at http://localhost:6900
```

## Development Setup

### Prerequisites
- Node.js 18+
- FFmpeg installed on your system

### Local Development

```bash
# Install dependencies
npm install
cd server && npm install && cd ..

# Start the backend server
cd server && npm run dev &

# Start the React development server
npm run dev

# Access the app at http://localhost:5173
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │  Express API    │    │     FFmpeg      │
│   (Port 80/5173) │────│  (Port 6900)    │────│   Processing    │
│                 │    │                 │    │                 │
│ • File Upload   │    │ • File Handling │    │ • Video Convert │
│ • Progress UI   │    │ • WebSocket     │    │ • Audio Extract │
│ • Download      │    │ • Conversion    │    │ • Format Change │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## API Endpoints

### File Management
- `POST /api/upload` - Upload media files
- `GET /api/ffmpeg-status` - Check FFmpeg availability

### Conversion
- `POST /api/convert` - Start file conversion
- `GET /api/conversion/:id` - Get conversion status
- `GET /output/:filename` - Download converted files

### WebSocket
- `/ws` - Real-time progress updates

## Supported Conversions

| Preset | Description | Output Format |
|--------|-------------|---------------|
| MP4 | Standard video format | .mp4 |
| WebM | Web-optimized video | .webm |
| GIF | Animated GIF | .gif |
| Audio Extract | Extract audio only | .mp3 |
| Mute | Remove audio track | .mp4 |

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=6900
NODE_ENV=production

# File Upload Limits
MAX_FILE_SIZE=500MB
```

### Docker Volumes

- `./uploads:/app/server/uploads` - Temporary upload storage
- `./output:/app/server/output` - Converted file output

## File Structure

```
├── server/                 # Node.js backend
│   ├── server.js          # Express server
│   └── package.json       # Backend dependencies
├── src/                   # React frontend
│   ├── components/        # UI components
│   ├── services/          # API services
│   └── hooks/            # Custom React hooks
├── Dockerfile            # Container definition
├── docker-compose.yml    # Multi-container setup
├── nginx.conf           # Reverse proxy config
└── README.md            # This file
```

## Deployment

### Production Deployment

1. **Using Docker Compose**:
   ```bash
   docker-compose up -d
   ```

2. **Using Docker Swarm**:
   ```bash
   docker stack deploy -c docker-compose.yml ffmbox
   ```

3. **Using Kubernetes**: See `k8s/` directory for manifests

### Scaling

The application can be scaled horizontally by running multiple backend containers:

```yaml
services:
  ffmbox:
    deploy:
      replicas: 3
```

## Troubleshooting

### Common Issues

1. **FFmpeg not found**: Ensure FFmpeg is installed in the container
2. **Upload failures**: Check file size limits and available disk space
3. **WebSocket disconnections**: Verify nginx proxy configuration
4. **Slow conversions**: Consider allocating more CPU/memory to containers

### Logs

```bash
# View application logs
docker-compose logs -f ffmbox

# View nginx logs
docker-compose logs -f nginx
```

## Security Considerations

- File uploads are limited to video/audio formats
- Temporary files are cleaned up automatically
- No execution of user-provided commands
- Rate limiting recommended for production use

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
