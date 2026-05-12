import path from 'path';
import fs from 'fs';
import http from 'http';
import type { Plugin } from 'vite';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function readDevApiPort(): number {
  const fromEnv = Number(process.env.VITE_API_PORT);
  if (Number.isInteger(fromEnv) && fromEnv > 0) return fromEnv;
  try {
    const file = path.join(__dirname, '.dev-api-port');
    const raw = fs.readFileSync(file, 'utf8').trim();
    const p = Number(raw);
    if (Number.isInteger(p) && p > 0) return p;
  } catch {
    /* use default */
  }
  return 3001;
}

function devApiProxyPlugin(): Plugin {
  return {
    name: 'dev-api-proxy-port',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api', (req, res) => {
        const port = readDevApiPort();
        const pathname = req.url ?? '';
        const proxyReq = http.request(
          {
            hostname: '127.0.0.1',
            port,
            path: pathname,
            method: req.method,
            headers: { ...req.headers, host: `127.0.0.1:${port}` },
          },
          (proxyRes) => {
            const code = proxyRes.statusCode ?? 502;
            const h = proxyRes.headers;
            // Node types: headers may contain undefined values; filter for writeHead
            const out: NodeJS.Dict<number | string | string[]> = {};
            for (const [k, v] of Object.entries(h)) {
              if (v === undefined) continue;
              out[k] = v;
            }
            res.writeHead(code, out);
            proxyRes.pipe(res);
          },
        );
        proxyReq.on('error', (err) => {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end(`API proxy (127.0.0.1:${port}): ${err.message}`);
        });
        req.pipe(proxyReq);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, __dirname, '');
    return {
      envDir: __dirname,
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), devApiProxyPlugin()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        },
        dedupe: ['react', 'react-dom'],
      }
    };
});
