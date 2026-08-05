import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react-swc';

import { AGENT_MARKDOWN } from './src/components/agents/AgentMarkdown';

// public/llms.txt stays statically servable but is generated, never hand-mirrored:
// dev server and builds both rewrite it from the AGENT_MARKDOWN constant.
const emitLlmsTxt = (): Plugin => ({
  name: 'emit-llms-txt',
  buildStart() {
    writeFileSync(resolve(__dirname, 'public/llms.txt'), AGENT_MARKDOWN);
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), emitLlmsTxt()],
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
