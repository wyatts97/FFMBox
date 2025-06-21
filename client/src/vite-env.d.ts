/// <reference types="vite/client" />

// Declare modules for UI components
declare module '@/components/ui/*' {
  import { ComponentType, HTMLAttributes } from 'react';
  const component: ComponentType<HTMLAttributes<HTMLElement>>;
  export default component;
}

// Declare module for FFmpeg types
declare module '@/lib/ffmpeg' {
  import { BasePreset as FFMpegBasePreset, CustomPreset as FFMpegCustomPreset } from '@/types/presets';
  
  export const PRESETS: Array<FFMpegBasePreset | FFMpegCustomPreset>;
  export type BasePreset = FFMpegBasePreset;
  export type CustomPreset = FFMpegCustomPreset;
}

// For CSS modules
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

// For SCSS modules
declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}

// For image files
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.svg' {
  import React from 'react';
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

// For other file types
declare module '*.webp';
declare module '*.mp4';
declare module '*.webm';
