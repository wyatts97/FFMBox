import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

// Convert file URL to path and get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxImportSource: '@emotion/react',
    })
  ],
  
  css: {
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer,
      ],
    },
  },
  
  resolve: {
    alias: [
      {
        find: '@',
        replacement: resolve(__dirname, 'src')
      }
    ]
  },
  
  server: {
    host: '::',
    port: 8080,
    strictPort: true,
    open: !process.env.CI,
    proxy: {
      // Proxy API requests to the backend server
      [process.env.VITE_API_BASE_URL || '/api']: {
        target: process.env.VITE_API_BASE_URL?.startsWith('http')
          ? process.env.VITE_API_BASE_URL
          : 'http://localhost:5500',
        changeOrigin: true,
        rewrite: (path: string) => path.replace(new RegExp(`^${process.env.VITE_API_BASE_URL || '/api'}`), ''),
        secure: false,
      },
    },
  },
  
  // Preview server configuration
  preview: {
    port: 8080,
    strictPort: true,
  },
  
  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: process.env.NODE_ENV === 'production' ? false : 'inline',
    minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false,
    cssCodeSplit: true,
    cssMinify: process.env.NODE_ENV === 'production',
    reportCompressedSize: true,
    target: 'esnext',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ffmpeg: ['@ffmpeg/ffmpeg', '@ffmpeg/core']
        }
      }
    }
  },
  
  // ESBuild configuration
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : []
  },
  
  // Dependency optimization
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    esbuildOptions: {
      target: 'esnext'
    }
  }
});
