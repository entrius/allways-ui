import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  preview: {
    port: 9080,
    strictPort: true,
    allowedHosts: ['test.all-ways.io', 'all-ways.io'],
  },
  server: {
    port: 9080,
    strictPort: true,
    host: true,
    origin: 'http://127.0.0.1:9080',
    allowedHosts: ['test.all-ways.io', 'all-ways.io'],
    proxy: {
      '/api': {
        target: 'https://test-api.all-ways.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        secure: true,
      },
    },
  },
});
