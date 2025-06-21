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
          className="w-full p-2 border rounded"
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

// Define presets
export const PRESETS: BasePreset[] = [
  // Video presets
  {
    id: 'mp4',
    name: 'MP4 (H.264)',
    description: 'Standard MP4 video with H.264 codec',
    icon: '🎥',
    category: 'video',
    options: {
      videoCodec: 'libx264',
      audioCodec: 'aac',
      crf: 23,
      preset: 'medium',
      pixelFormat: 'yuv420p',
    },
    getOptions: (fileType, options, onChange) => 
      renderVideoOptions(options, onChange)
  },
  // Audio presets
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
  // Image presets
  {
    id: 'jpeg',
    name: 'JPEG',
    description: 'Standard JPEG image',
    icon: '🖼️',
    category: 'image',
    options: {
      quality: 90,
      progressive: true,
    },
  },
];

