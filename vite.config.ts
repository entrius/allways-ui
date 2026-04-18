import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

const ALLOWED_HOSTS = ['test.all-ways.io', 'all-ways.io'];

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
  preview: {
    port: 9080,
    strictPort: true,
    allowedHosts: ALLOWED_HOSTS,
  },
  server: {
    port: 9080,
    strictPort: true,
    host: true,
    origin: 'http://127.0.0.1:9080',
    allowedHosts: ALLOWED_HOSTS,
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
