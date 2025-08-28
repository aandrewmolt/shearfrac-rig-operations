import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8351,
    // Add CORS headers for development
    cors: true,
    // Configure headers to allow WebSocket connections
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize bundle size
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom'],
          
          // React ecosystem
          'react-libs': ['react-router-dom', '@tanstack/react-query'],
          
          // UI library
          'ui-libs': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-tabs', '@radix-ui/react-tooltip', '@radix-ui/react-popover'],
          
          // Flow diagram
          'flow-libs': ['@xyflow/react'],
          
          // Database & charts
          'data-libs': ['@libsql/client', 'uuid', 'recharts', 'html2canvas'],
          
          // Utilities
          'utils': ['clsx', 'tailwind-merge', 'class-variance-authority', 'lucide-react', 'sonner']
        }
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    
    // Enable source maps for debugging
    sourcemap: mode === 'development'
  }
}));
