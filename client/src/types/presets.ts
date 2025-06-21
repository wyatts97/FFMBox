import { ReactNode } from 'react';

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
  
  // Other options
  [key: string]: unknown;
}

export type PresetCategory = 'video' | 'audio' | 'image' | 'all' | 'custom' | 'conversion' | 'compression' | 'extraction' | 'utility';

export type GetOptionsFunction = (
  fileType: string,
  options: Partial<PresetOptions>,
  onChange: (key: string, value: unknown) => void
) => ReactNode;

// Base preset interface with common properties
export interface BasePreset {
  id: string;
  name: string;
  description: string;
  icon: string | ReactNode;
  category: PresetCategory;
  command?: string;
  options?: Partial<PresetOptions>;
  getOptions?: GetOptionsFunction;
  fileTypes?: string[];
  extension?: string;
  outputExtension?: string;
  recommended?: boolean;
  experimental?: boolean;
  tags?: string[];
}

// Custom preset interface with required command and custom category
export interface CustomPreset {
  id: string;
  name: string;
  description: string;
  icon: string | ReactNode;
  category: 'custom';
  command: string;
  options?: Partial<PresetOptions>;
  fileTypes?: string[];
  extension?: string;
  outputExtension?: string;
  recommended?: boolean;
  experimental?: boolean;
  tags?: string[];
  getOptions?: GetOptionsFunction;
}

export type AnyPreset = BasePreset | CustomPreset;

export interface PresetState {
  selected: AnyPreset | null;
  options: Partial<PresetOptions>;
  customCommand: string;
  saveAsPreset: boolean;
  presetName: string;
  presetDescription: string;
  activeTab: 'presets' | 'custom';
  selectedCategory: PresetCategory;
  customPresets: CustomPreset[];
  isDialogOpen: boolean;
  editingPreset: CustomPreset | null;
}

export interface FFmpegPresetsProps {
  onPresetSelect: (presetId: string, options: PresetOptions) => void;
  onCustomCommand: (command: string) => void;
  disabled?: boolean;
  fileType?: string;
  className?: string;
}

// Type guards
export function isCustomPreset(preset: AnyPreset | null): preset is CustomPreset {
  return preset?.category === 'custom';
}

export function isBasePreset(preset: AnyPreset | null): preset is BasePreset {
  return preset !== null && !isCustomPreset(preset);
}

export function isValidCustomPreset(preset: unknown): preset is Omit<CustomPreset, 'id' | 'category'> {
  return (
    typeof preset === 'object' &&
    preset !== null &&
    'command' in preset &&
    typeof preset.command === 'string' &&
    'name' in preset &&
    typeof preset.name === 'string' &&
    (!('options' in preset) || typeof preset.options === 'object')
  );
}
