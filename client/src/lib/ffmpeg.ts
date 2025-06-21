import React from 'react';

// Define all types first
type BasePresetCategory = 'video' | 'audio' | 'image' | 'conversion' | 'custom';
type ExtendedPresetCategory = BasePresetCategory | 'all';

interface BasePresetOptions {
  quality?: number;
  width?: number;
  height?: number;
  fps?: number;
  audioBitrate?: number;
  videoBitrate?: number;
  audioCodec?: string;
  videoCodec?: string;
  preset?: string;
  crf?: number;
  tune?: string;
  profile?: string;
  level?: string;
  pixelFormat?: string;
  audioChannels?: number;
  audioSampleRate?: number;
  audioQuality?: number;
  audioVolume?: number;
  startTime?: string;
  duration?: string;
  aspectRatio?: string;
  crop?: string;
  scale?: string;
  filters?: string[];
  mapMetadata?: Record<string, string>;
  metadata?: Record<string, string>;
  outputOptions?: string[];
  inputOptions?: string[];
  extra?: string[];
  lossless?: boolean;
  progressive?: boolean;
  compressionLevel?: number;
  speed?: number;
  [key: string]: unknown;
}

interface BasePreset {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: BasePresetCategory;
  options?: BasePresetOptions;
  getOptions?: (fileType: string) => React.ReactNode;
}

interface BaseCustomPreset {
  id: string;
  name: string;
  command: string;
  description: string;
  icon?: React.ReactNode;
  category: 'custom';
}

// Export the final types
export type PresetCategory = ExtendedPresetCategory;
export type PresetOptions = BasePresetOptions;
export type Preset = BasePreset;
export type CustomPreset = BaseCustomPreset;

// Export type guards
export function isPreset(preset: Preset | CustomPreset | null): preset is Preset {
  return preset !== null && preset.category !== 'custom';
}
