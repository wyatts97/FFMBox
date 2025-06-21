
export interface FileInfo {
  id: string;
  originalName: string;
  filename: string;
  size: number;
  path: string;
}

// Common options for all presets
export interface BasePresetOptions {
  // Quality (0-100 for images, 0-51 for video, higher is worse for video)
  quality?: number;
  // Target width in pixels (optional)
  width?: number;
  // Target height in pixels (optional)
  height?: number;
  // Target frames per second (video only)
  fps?: number;
  // Preset name (e.g., 'ultrafast', 'medium', 'slow')
  preset?: string;
  // Custom FFmpeg command (overrides other options if provided)
  customCommand?: string;
}

// Video-specific options
export interface VideoPresetOptions extends BasePresetOptions {
  // Video codec (e.g., 'libx264', 'libvpx', 'h264_nvenc')
  videoCodec?: string;
  // Video bitrate (e.g., '1000k' or '5M')
  videoBitrate?: string | number;
  // Pixel format (e.g., 'yuv420p')
  pixelFormat?: string;
  // Enable two-pass encoding
  twoPass?: boolean;
  // Constant Rate Factor (CRF) - lower is better quality, 18-28 is a good range
  crf?: number;
  // Group of Pictures size
  gopSize?: number;
  // Buffer size (e.g., '2000k')
  bufferSize?: string | number;
  // Maximum bitrate (for VBR)
  maxRate?: string | number;
  // Minimum bitrate (for VBR)
  minRate?: string | number;
  // Keyframe interval in frames
  keyintMin?: number;
  // Scene change threshold (0-100)
  scThreshold?: number;
}

// Audio-specific options
export interface AudioPresetOptions extends BasePresetOptions {
  // Audio codec (e.g., 'aac', 'libmp3lame', 'libvorbis')
  audioCodec?: string;
  // Audio bitrate (e.g., '128k' or '192k')
  audioBitrate?: string | number;
  // Number of audio channels
  audioChannels?: number;
  // Audio sample rate (e.g., 44100, 48000)
  sampleRate?: number;
  // Audio volume (0-1)
  volume?: number;
  // Audio quality (codec specific, usually 0-10)
  audioQuality?: number;
}

// Image-specific options
export interface ImagePresetOptions extends BasePresetOptions {
  // Lossless encoding (for formats that support it)
  lossless?: boolean;
  // Progressive encoding (for JPEG/PNG)
  progressive?: boolean;
  // Compression level (0-9, 0=fastest, 9=best compression)
  compressionLevel?: number;
  // Interlaced encoding
  interlaced?: boolean;
  // Quality (0-100, higher is better)
  quality: number;
  // Strip metadata
  strip?: boolean;
  // Color space (e.g., 'srgb', 'rgb', 'cmyk')
  colorSpace?: string;
}

// Union type for all preset options
export type PresetOptions = VideoPresetOptions | AudioPresetOptions | ImagePresetOptions | BasePresetOptions;

// Legacy interface for backward compatibility
export interface ConversionOptions extends BasePresetOptions {
  // Legacy video options
  videoBitrate?: number | string;
  videoCodec?: string;
  // Legacy audio options
  audioBitrate?: number | string;
  audioCodec?: string;
  // Legacy image options
  lossless?: boolean;
  progressive?: boolean;
  compressionLevel?: number;
  interlaced?: boolean;
  speed?: number;
  // Legacy time options
  startTime?: string;
  duration?: string;
}

export interface ConversionResponse {
  conversionId: string;
  status: string;
  outputFilename: string;
}

class ApiService {
  private baseUrl = '/api';

  async checkFFmpegStatus() {
    const response = await fetch(`${this.baseUrl}/ffmpeg-status`);
    return response.json();
  }

  async uploadFiles(files: FileList): Promise<{ files: FileInfo[] }> {
    const formData = new FormData();
    
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    const response = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed');
    }

    return response.json();
  }

  async convertFile(
    fileId: string,
    filename: string,
    preset: string,
    options: ConversionOptions = {}
  ): Promise<ConversionResponse> {
    const response = await fetch(`${this.baseUrl}/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId,
        filename,
        preset,
        options,
      }),
    });

    if (!response.ok) {
      throw new Error('Conversion failed');
    }

    return response.json();
  }

  async getConversionStatus(conversionId: string) {
    const response = await fetch(`${this.baseUrl}/conversion/${conversionId}`);
    return response.json();
  }
}

export const apiService = new ApiService();
