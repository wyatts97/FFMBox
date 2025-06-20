import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { visualizer } from 'rollup-plugin-visualizer';

// Convert file URL to path and get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  
  // Base plugins array with proper typing
  const plugins: PluginOption[] = [
    react({
      jsxImportSource: '@emotion/react',
    }) as PluginOption
  ];

  // Add visualizer in production
  if (isProduction) {
    plugins.push(
      visualizer({
        open: false,
        gzipSize: true,
        brotliSize: true,
        filename: 'dist/bundle-analyzer.html',
      }) as PluginOption
    );
  }
  
  return {
    base: '/',
    
    // Development server configuration
    server: {
      host: '::',
      port: 8080,
      strictPort: true,
      open: !process.env.CI,
    },
    
    // Preview server configuration
    preview: {
      port: 8080,
      strictPort: true,
    },
    
    // Plugins
    plugins,
    
    // Module resolution
    resolve: {
      alias: [
        {
          find: '@',
          replacement: resolve(__dirname, 'src')
        }
      ]
    },
    
    // Build configuration
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: isProduction ? 'hidden' : true,
      minify: isProduction ? 'esbuild' : false,
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            ffmpeg: ['@ffmpeg/ffmpeg', '@ffmpeg/core']
          }
        }
      },
      target: 'esnext',
      chunkSizeWarningLimit: 1000
    },
    
    // ESBuild configuration
    esbuild: {
      drop: isProduction ? ['console', 'debugger'] : []
    },
    
    // Dependency optimization
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
      esbuildOptions: {
        target: 'esnext'
      }
    }
  };
});
