import React, { ChangeEvent, ReactNode } from 'react';
import type { PresetCategory } from '@/types/presets';

// Re-export the PresetCategory type for backward compatibility
export type { PresetCategory };

// Define our preset options type
export interface PresetOptions {
  // Common options
  quality?: number;
  width?: number;
  height?: number;
  fps?: number;
  preset?: string;
  customCommand?: string;
  
  // Video options
  videoCodec?: string;
  videoBitrate?: string | number;
  pixelFormat?: string;
  crf?: number;
  
  // Audio options
  audioCodec?: string;
  audioBitrate?: string | number;
  audioSampleRate?: number;
  audioChannels?: number;
  audioQuality?: number;
  audioVolume?: number;
  
  // Image options
  lossless?: boolean;
  progressive?: boolean;
  compressionLevel?: number;
  interlaced?: boolean;
  
  // Other options
  aspectRatio?: string;
  crop?: string;
  scale?: string;
  filters?: string[];
  mapMetadata?: Record<string, string>;
  metadata?: Record<string, string>;
  outputOptions?: string[];
  inputOptions?: string[];
  extra?: string[];
  
  // Allow any other string key
  [key: string]: unknown;
}

// Base preset interface
export interface BasePreset {
  id: string;
  name: string;
  description: string;
  icon: string | ReactNode;
  category: PresetCategory;
  command?: string;
  options?: Partial<PresetOptions>;
  getOptions?: (
    fileType: string,
    options: Partial<PresetOptions>,
    onChange: (key: string, value: unknown) => void
  ) => ReactNode;
}

// Custom preset interface
export interface CustomPreset extends BasePreset {
  command: string;
  category: 'custom';
}

// Type guard for custom presets
export function isCustomPreset(preset: BasePreset): preset is CustomPreset {
  return preset.category === 'custom';
}

// Type guard for regular presets
export type AnyPreset = BasePreset | CustomPreset;
export function isPreset(preset: AnyPreset | null): preset is BasePreset {
  return preset !== null && !isCustomPreset(preset);
}

// Helper function to create change handlers
export const createChangeHandler = (
  key: string,
  onChange: (key: string, value: unknown) => void,
  transform: (value: string) => unknown = (v) => v
) => {
  return (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    onChange(key, transform(e.target.value));
  };
};

// Helper function to render options for video presets
const renderVideoOptions = (
  options: Partial<PresetOptions>,
  onChange: (key: string, value: unknown) => void
): ReactNode => {
  const handleChange = (key: string, value: unknown) => {
    onChange(key, value);
  };

  const crfValue = options.crf ?? 23;
  const presetValue = options.preset || 'medium';

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Quality (CRF)</label>
        <input
          type="range"
          min="0"
          max="51"
          value={crfValue as number}
          onChange={createChangeHandler('crf', (k, v) => handleChange(k, Number(v)))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Best Quality (0)</span>
          <span>Smaller File (51)</span>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Preset</label>
        <select
          value={presetValue as string}
          onChange={createChangeHandler('preset', handleChange)}
          className="w-full p-2 border rounded text-black dark:text-black"
        >
          {['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow'].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

import { WatermarkOptions } from './WatermarkOptions';

// Define presets
export const PRESETS: BasePreset[] = [
  // Video presets
  {
    id: 'mp4',
    name: 'MP4 (H.264)',
    description: 'Standard MP4 with H.264 video and AAC audio',
    icon: '🎥',
    category: 'video',
    options: {
      videoCodec: 'libx264',
      audioCodec: 'aac',
      crf: 23,
      preset: 'medium',
      pixelFormat: 'yuv420p',
    },
    getOptions: (fileType, options, onChange) => renderVideoOptions(options, onChange)
  },
  {
    id: 'mp4-hq',
    name: 'MP4 High Quality',
    description: 'High quality MP4 with better compression (larger file size)',
    icon: '🎬',
    category: 'video',
    options: {
      videoCodec: 'libx264',
      audioCodec: 'aac',
      crf: 18,
      preset: 'slower',
      pixelFormat: 'yuv420p',
    },
    getOptions: (fileType, options, onChange) => renderVideoOptions(options, onChange)
  },
  {
    id: 'mp4-fast',
    name: 'MP4 Fast',
    description: 'MP4 with H.264, lower quality but much faster encoding',
    icon: '⚡',
    category: 'video',
    options: {
      videoCodec: 'libx264',
      audioCodec: 'aac',
      crf: 28,
      preset: 'ultrafast',
      pixelFormat: 'yuv420p',
    },
    getOptions: (fileType, options, onChange) => renderVideoOptions(options, onChange)
  },
  {
    id: 'mp4-mobile',
    name: 'MP4 Mobile',
    description: 'MP4 optimized for mobile (lower resolution, lower bitrate)',
    icon: '📱',
    category: 'video',
    options: {
      videoCodec: 'libx264',
      audioCodec: 'aac',
      crf: 28,
      preset: 'veryfast',
      pixelFormat: 'yuv420p',
      width: 640,
      height: 360,
    },
    getOptions: (fileType, options, onChange) => renderVideoOptions(options, onChange)
  },
  {
    id: 'hevc',
    name: 'MP4 (H.265/HEVC)',
    description: 'MP4 with H.265/HEVC video',
    icon: '🦾',
    category: 'video',
    options: {
      videoCodec: 'libx265',
      audioCodec: 'aac',
      crf: 28,
      preset: 'medium',
      pixelFormat: 'yuv420p',
    },
    getOptions: (fileType, options, onChange) => renderVideoOptions(options, onChange)
  },
  {
    id: 'prores',
    name: 'MOV (ProRes)',
    description: 'MOV with Apple ProRes codec (for professional editing workflows)',
    icon: '🎞️',
    category: 'video',
    options: {
      videoCodec: 'prores_ks',
      audioCodec: 'pcm_s16le',
    },
  },
  {
    id: 'webm-vp8',
    name: 'WebM (VP8)',
    description: 'WebM with VP8 video and Vorbis audio',
    icon: '🌐',
    category: 'video',
    options: {
      videoCodec: 'libvpx',
      audioCodec: 'libvorbis',
      crf: 10,
    },
  },
  {
    id: 'mov',
    name: 'MOV (H.264)',
    description: 'MOV container with H.264 (for Apple compatibility)',
    icon: '🍏',
    category: 'video',
    options: {
      videoCodec: 'libx264',
      audioCodec: 'aac',
      crf: 23,
      preset: 'medium',
      pixelFormat: 'yuv420p',
    },
    getOptions: (fileType, options, onChange) => renderVideoOptions(options, onChange)
  },
  {
    id: 'mkv',
    name: 'MKV (H.264)',
    description: 'MKV container with H.264',
    icon: '📦',
    category: 'video',
    options: {
      videoCodec: 'libx264',
      audioCodec: 'aac',
      crf: 23,
      preset: 'medium',
      pixelFormat: 'yuv420p',
    },
    getOptions: (fileType, options, onChange) => renderVideoOptions(options, onChange)
  },
  {
    id: '4k-hq',
    name: '4K High Quality',
    description: '4K high quality MP4',
    icon: '🖥️',
    category: 'video',
    options: {
      videoCodec: 'libx264',
      audioCodec: 'aac',
      crf: 18,
      preset: 'slow',
      pixelFormat: 'yuv420p',
      width: 3840,
      height: 2160,
    },
    getOptions: (fileType, options, onChange) => renderVideoOptions(options, onChange)
  },
  {
    id: 'gif',
    name: 'GIF',
    description: 'Animated GIF with optimized palette',
    icon: '🖼️',
    category: 'video',
    options: {},
  },
  {
    id: 'mute',
    name: 'Mute Video',
    description: 'Video with audio removed',
    icon: '🔇',
    category: 'video',
    options: {
      videoCodec: 'libx264',
      crf: 23,
      preset: 'medium',
      pixelFormat: 'yuv420p',
    },
    getOptions: (fileType, options, onChange) => renderVideoOptions(options, onChange)
  },
  // Audio presets
  {
    id: 'audio-extract',
    name: 'Extract Audio (MP3)',
    description: 'Extract audio as MP3',
    icon: '🎵',
    category: 'audio',
    options: {
      audioCodec: 'libmp3lame',
      audioQuality: 3,
    },
  },
  {
    id: 'mp3',
    name: 'MP3',
    description: 'Standard MP3 audio',
    icon: '🎵',
    category: 'audio',
    options: {
      audioCodec: 'libmp3lame',
      audioBitrate: '192k',
    },
  },
  {
    id: 'aac',
    name: 'AAC',
    description: 'AAC audio (for MP4/M4A compatibility)',
    icon: '🔊',
    category: 'audio',
    options: {
      audioCodec: 'aac',
      audioBitrate: '128k',
    },
  },
  {
    id: 'flac',
    name: 'FLAC',
    description: 'FLAC lossless audio',
    icon: '💽',
    category: 'audio',
    options: {
      audioCodec: 'flac',
    },
  },
  {
    id: 'wav',
    name: 'WAV',
    description: 'Uncompressed WAV audio',
    icon: '🎚️',
    category: 'audio',
    options: {
      audioCodec: 'pcm_s16le',
    },
  },
  {
    id: 'ogg',
    name: 'OGG Vorbis',
    description: 'OGG Vorbis audio',
    icon: '🦉',
    category: 'audio',
    options: {
      audioCodec: 'libvorbis',
    },
  },
  {
    id: 'opus',
    name: 'Opus',
    description: 'Opus audio (for web and streaming)',
    icon: '🎤',
    category: 'audio',
    options: {
      audioCodec: 'libopus',
    },
  },
  // Image presets
  {
    id: 'webp',
    name: 'WebP',
    description: 'WebP image format',
    icon: '🖼️',
    category: 'image',
    options: {
      quality: 85,
      compressionLevel: 6,
    },
  },
  {
    id: 'jpeg',
    name: 'JPEG',
    description: 'JPEG image format',
    icon: '🖼️',
    category: 'image',
    options: {
      quality: 85,
      progressive: true,
    },
  },
  {
    id: 'png',
    name: 'PNG',
    description: 'PNG image format',
    icon: '🖼️',
    category: 'image',
    options: {
      compressionLevel: 9,
    },
  },
  {
    id: 'avif',
    name: 'AVIF',
    description: 'AVIF image format',
    icon: '🖼️',
    category: 'image',
    options: {
      quality: 23,
      compressionLevel: 6,
    },
  },
  {
    id: 'tiff',
    name: 'TIFF',
    description: 'TIFF image format (lossless)',
    icon: '🖨️',
    category: 'image',
    options: {},
  },
  {
    id: 'bmp',
    name: 'BMP',
    description: 'BMP image format (legacy compatibility)',
    icon: '🖌️',
    category: 'image',
    options: {},
  },
  {
    id: 'gif-optimized',
    name: 'GIF Optimized',
    description: 'GIF with lower frame rate and palette optimization for smaller file size',
    icon: '🖼️',
    category: 'image',
    options: {},
  },
  {
    id: 'png-lossless',
    name: 'PNG Lossless',
    description: 'PNG with maximum compression, no quality loss',
    icon: '🖼️',
    category: 'image',
    options: {},
  },
  {
    id: 'jpeg-low',
    name: 'JPEG Low Quality',
    description: 'JPEG with lower quality (for web thumbnails)',
    icon: '🖼️',
    category: 'image',
    options: {},
  },
  // Utility presets
  {
    id: 'extract-frames',
    name: 'Extract Frames',
    description: 'Extract frames from video as images (PNG or JPEG sequence)',
    icon: '🖼️',
    category: 'utility',
    options: {},
    getOptions: (fileType, options, onChange) => (
      <div>
        <label className="block text-sm font-medium mb-1">Frame Count</label>
        <input
          type="number"
          min={1}
          max={100}
          value={options.count as number || 9}
          onChange={createChangeHandler('count', onChange, v => Number(v))}
          className="w-full p-2 border rounded mb-2"
        />
        <label className="block text-sm font-medium mb-1">Image Format</label>
        <select
          value={options.ext as string || 'png'}
          onChange={createChangeHandler('ext', onChange)}
          className="w-full p-2 border rounded"
        >
          <option value="png">PNG</option>
          <option value="jpg">JPG</option>
          <option value="webp">WebP</option>
        </select>
      </div>
    )
  },
  {
    id: 'thumbnail',
    name: 'Thumbnail',
    description: 'Generate a single thumbnail image from a video (at a specific timestamp)',
    icon: '🖼️',
    category: 'utility',
    options: {},
    getOptions: (fileType, options, onChange) => (
      <div>
        <label className="block text-sm font-medium mb-1">Timestamp (e.g. 00:00:05)</label>
        <input
          type="text"
          value={options.timestamp as string || '00:00:01'}
          onChange={createChangeHandler('timestamp', onChange)}
          className="w-full p-2 border rounded mb-2"
        />
        <label className="block text-sm font-medium mb-1">Image Format</label>
        <select
          value={options.ext as string || 'png'}
          onChange={createChangeHandler('ext', onChange)}
          className="w-full p-2 border rounded"
        >
          <option value="png">PNG</option>
          <option value="jpg">JPG</option>
          <option value="webp">WebP</option>
        </select>
      </div>
    )
  },
  {
    id: 'trim',
    name: 'Trim Video',
    description: 'Trim/cut video to a specific time range',
    icon: '✂️',
    category: 'utility',
    options: {},
    getOptions: (fileType, options, onChange) => (
      <div>
        <label className="block text-sm font-medium mb-1">Start Time (e.g. 00:00:05)</label>
        <input
          type="text"
          value={options.start as string || '00:00:00'}
          onChange={createChangeHandler('start', onChange)}
          className="w-full p-2 border rounded mb-2"
        />
        <label className="block text-sm font-medium mb-1">Duration (e.g. 00:00:10)</label>
        <input
          type="text"
          value={options.duration as string || ''}
          onChange={createChangeHandler('duration', onChange)}
          className="w-full p-2 border rounded"
        />
      </div>
    )
  },
  {
    id: 'resize',
    name: 'Resize Video',
    description: 'Resize video to a specific resolution',
    icon: '📏',
    category: 'utility',
    options: {},
    getOptions: (fileType, options, onChange) => (
      <div>
        <label className="block text-sm font-medium mb-1">Width</label>
        <input
          type="number"
          min={1}
          value={options.width as number || 1280}
          onChange={createChangeHandler('width', onChange, v => Number(v))}
          className="w-full p-2 border rounded mb-2"
        />
        <label className="block text-sm font-medium mb-1">Height</label>
        <input
          type="number"
          min={1}
          value={options.height as number || 720}
          onChange={createChangeHandler('height', onChange, v => Number(v))}
          className="w-full p-2 border rounded"
        />
      </div>
    )
  },
  {
    id: 'watermark',
    name: 'Watermark',
    description: 'Add a watermark image, text, or scrolling text overlay to video',
    icon: '💧',
    category: 'utility',
    options: {},
    getOptions: (fileType, options, onChange) => <WatermarkOptions options={options} onChange={onChange} />
  },
  {
    id: 'thumbnail-collage',
    name: 'Thumbnail Collage',
    description: 'Grab 9 frames from a video and display them in a singular square image (user chooses output type)',
    icon: '🖼️',
    category: 'utility',
    options: {},
    getOptions: (fileType, options, onChange) => (
      <div>
        <label className="block text-sm font-medium mb-1">Image Format</label>
        <select
          value={options.ext as string || 'png'}
          onChange={createChangeHandler('ext', onChange)}
          className="w-full p-2 border rounded"
        >
          <option value="png">PNG</option>
          <option value="jpg">JPG</option>
          <option value="webp">WebP</option>
        </select>
      </div>
    )
  },
];

