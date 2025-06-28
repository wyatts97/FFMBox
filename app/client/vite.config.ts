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
  
  base: process.env.NODE_ENV === 'production' ? '/' : '/',
  
  build: {
    outDir: '../../public',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV === 'production' ? false : 'inline',
    minify: 'terser',
    cssCodeSplit: true,
    cssMinify: process.env.NODE_ENV === 'production',
    reportCompressedSize: true,
    target: 'esnext',
    chunkSizeWarningLimit: 1000,
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: process.env.NODE_ENV === 'production',
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-toast'],
          ffmpeg: ['@ffmpeg/ffmpeg', '@ffmpeg/core']
        }
      }
    }
  },
  
  server: process.env.NODE_ENV === 'production' ? undefined : {
    host: '::',
    port: 6900,
    strictPort: true,
    open: !process.env.CI,
    proxy: {
      '/api': {
        target: 'http://localhost:5500',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'http://localhost:5500',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  
  preview: {
    port: 8080,
    strictPort: true,
  },
  
  resolve: {
    alias: [
      {
        find: '@',
        replacement: resolve(__dirname, 'src')
      }
    ]
  },
  
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    legalComments: 'none' as const
  },
  
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    esbuildOptions: {
      target: 'esnext'
    }
  }
});
