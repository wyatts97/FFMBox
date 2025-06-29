import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config: UserConfig = {
  plugins: [
    react({
      jsxImportSource: '@emotion/react',
    })
  ],

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV !== 'production',
    minify: 'terser',
    cssCodeSplit: true,
    target: 'esnext',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          ui: [
            '@radix-ui/react-dialog', 
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-toast'
          ],
          ffmpeg: ['@ffmpeg/ffmpeg', '@ffmpeg/core']
        }
      }
    }
  },

  server: {
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
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    esbuildOptions: {
      target: 'esnext'
    }
  }
};

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  return {
    ...config,
    base: isProduction ? '/' : '/',
    esbuild: {
      drop: isProduction ? ['console', 'debugger'] : [],
      legalComments: 'none' as const
    },
    build: {
      ...config.build,
      cssMinify: isProduction,
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction,
        },
      },
    },
    server: isProduction ? undefined : config.server
  };
});
