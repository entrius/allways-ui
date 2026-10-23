import { existsSync, writeFileSync } from 'node:fs';
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

// scripts/prerender.mjs turns dist/index.html into the prerendered home page
// and keeps the plain SPA shell as dist/spa-shell.html. `vite preview`'s own
// SPA fallback would serve the home page's text and canonical for every
// client-side route (/swap/:id, /miners/:hotkey, /app, ...), so route those
// to the shell instead. Prerendered routes (dist/<route>.html) and real files
// are left to vite's own static and html middlewares.
const SPA_SHELL = 'spa-shell.html';
const serveSpaShell = (): Plugin => ({
  name: 'serve-spa-shell',
  configurePreviewServer(server) {
    const distDir = resolve(__dirname, server.config.build.outDir);
    server.middlewares.use((req, _res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      const [pathname, query] = (req.url ?? '/').split('?');
      if (pathname === '/' || pathname.includes('.')) return next();
      const route = pathname.replace(/\/+$/, '');
      if (route && existsSync(resolve(distDir, `.${route}.html`))) {
        // /market/ would otherwise fall back to the home page.
        if (route !== pathname) {
          req.url = `${route}.html${query ? `?${query}` : ''}`;
        }
        return next();
      }
      if (!existsSync(resolve(distDir, SPA_SHELL))) return next();
      req.url = `/${SPA_SHELL}${query ? `?${query}` : ''}`;
      next();
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), emitLlmsTxt(), serveSpaShell()],
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
