import { defineConfig } from 'vite';
//import inject from '@rollup/plugin-inject';

export default defineConfig({
  server: {
    hmr: false,
    watch: {
      usePolling: false,
    },
    open: true, // Automatically open the browser
    allowedHosts: [ 
      'antibody-accountability-checks-spy.trycloudflare.com', 'http://localhost:3000' // Allow all hosts
    ], 
    host: '0.0.0.0', // Allow external connections
    port: 3000,
    proxy: {
      // Proxy API requests to backend
      '/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('🔄 Proxying:', req.method, req.url, '→ backend');
          });
        }
      },
      '/operations': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('🔄 Proxying:', req.method, req.url, '→ backend');
          });
        }
      },
      // Catch all other API routes
      '^/api/.*': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }  
  } 
})