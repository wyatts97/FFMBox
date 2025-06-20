<div align="center">
  <img src="512x512.webp" alt="FFMBox Logo" width="200" height="200">
  
  # FFMBox

> 🚀 A modern, containerized FFmpeg Web UI for media conversion or compression with the ability for custom commands.

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg?style=flat-square)](https://www.gnu.org/licenses/gpl-3.0)  
[![GitHub stars](https://img.shields.io/github/stars/wyatts97/FFMBox?style=social)](https://github.com/wyatts97/FFMBox/stargazers)
</div>

## ✨ Features

- 🎥 **Video Conversion**: Convert between various video formats (MP4, MKV, WebM, etc.)
- 🖼️ **Image Processing**: Advanced image conversion and optimization (WebP, AVIF, JPEG, PNG)
- 🎵 **Audio Extraction**: Extract audio from video files
- ⚡ **Real-time Progress**: Live updates via WebSocket during conversion
- 🎨 **Modern UI**: Clean, responsive interface with dark/light theme support
- 🐳 **Docker First**: Fully containerized with multi-stage builds
- 🔄 **Batch Processing**: Convert multiple files simultaneously
- 📱 **Mobile Friendly**: Works on all device sizes

### 🖼️ Image Processing Capabilities

- **Format Conversion**: Convert between WebP, AVIF, JPEG, PNG, and more
- **Smart Compression**: Optimize images with quality controls
- **Resizing**: Scale images with aspect ratio preservation
- **Optimization**: Automatic format selection for web
- **Progressive Loading**: For faster perceived load times
- **Lossless Options**: Preserve maximum quality when needed

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- At least 2GB of free disk space for processing

### Using Docker Compose (Recommended)

```bash
git clone https://github.com/wyatts97/FFMBox.git
cd FFMBox
docker-compose up -d
```

The application will be available at: `http://localhost:6900`

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 6900 | Backend server port |
| `UPLOAD_DIR` | /app/uploads | Upload directory path |
| `OUTPUT_DIR` | /app/output | Output directory path |
| `MAX_FILE_SIZE` | 500MB | Maximum file size for uploads |
| `FFMPEG_THREADS` | 2 | Number of FFmpeg threads to use |

---

## 🛠️ Development

### Prerequisites
- Node.js 20+
- pnpm (recommended) or npm
- FFmpeg

### Setup

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev
```

This will start:
- Frontend: http://localhost:5173
- Backend: http://localhost:6900

### Building for Production

```bash
# Build the application
pnpm build

# Start in production mode
pnpm start
```

## 📂 Project Structure

```text
FFMBox/
├── client/              # React frontend
│   ├── public/          # Static files
│   ├── src/             # Source code
│   └── Dockerfile       # Frontend Dockerfile
├── server/              # Express backend
│   ├── src/             # Source code
│   └── Dockerfile       # Backend Dockerfile
├── docker-compose.yml   # Docker Compose configuration
└── README.md           # This file
```

## 🌐 API Documentation

### Authentication
All endpoints require a valid API key in the `X-API-Key` header.

### Image Processing Options

When converting images, you can use these options in your API requests:

```json
{
  "quality": 85,          // Image quality (1-100)
  "width": 800,          // Target width (maintains aspect ratio if height not specified)
  "height": 600,         // Target height
  "maintainAspect": true, // Maintain aspect ratio when resizing
  "padColor": "white",    // Background color when maintaining aspect ratio
  "compressionLevel": 6,  // Compression level (0-9)
  "lossless": false,     // Use lossless compression (WebP)
  "progressive": true,   // Use progressive encoding (JPEG)
  "subsample": 6,        // Chroma subsampling (1-6)
  "speed": 6             // Speed/quality tradeoff (0=best quality, 8=fastest)
}
```

### Presets

#### Video Presets
- `mp4`: Standard MP4 output (H.264)
- `webm`: WebM format (VP9)
- `gif`: Animated GIF
- `mute`: Video without audio

#### Image Presets
- `webp`: WebP format (modern, efficient)
- `avif`: AVIF format (next-gen, best compression)
- `jpeg`: Standard JPEG
- `png`: PNG format (lossless)
- `image-optimized`: Automatically selects best format for web
- `image-lossless`: Preserves maximum quality

### Endpoints

#### File Upload

```http
POST /api/upload
Content-Type: multipart/form-data
```

**Response:**

```json
{
  "files": [
    {
      "id": "unique-file-id",
      "originalName": "video.mp4",
      "filename": "abc123-video.mp4",
      "size": 1024000,
      "path": "/path/to/upload"
    }
  ]
}
```

#### Start Conversion

```http
POST /api/convert
Content-Type: application/json

{
  "fileId": "file-id",
  "preset": "webp",
  "options": {
    "quality": 85,
    "width": 1200,
    "maintainAspect": true
  }
}
```

Example for creating a thumbnail:

```json
{
  "fileId": "image-123",
  "preset": "jpeg",
  "options": {
    "width": 300,
    "height": 300,
    "maintainAspect": true,
    "padColor": "#ffffff"
  }
}
```

**Response:**

```json
{
  "conversionId": "conversion-123",
  "status": "queued"
}
```

#### Get Conversion Status

```http
GET /api/conversion/:id
```

**Response:**

```json
{
  "id": "conversion-123",
  "status": "processing|completed|error",
  "progress": 75,
  "downloadUrl": "/output/converted-file.mp4"
}
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [FFmpeg](https://ffmpeg.org/) - For the amazing media processing capabilities
- [Vite](https://vitejs.dev/) - For the lightning-fast build tooling
- [Shadcn UI](https://ui.shadcn.com/) - For the beautiful UI components
- [React](https://reactjs.org/) - For the awesome UI library

## ⚙️ Configuration

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

GNU General Public License v3.0 - see LICENSE file for details
