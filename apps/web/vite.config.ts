import path from 'path';
import fs from 'fs';
import http from 'http';
import net from 'node:net';
import type { Plugin } from 'vite';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const API_DEV_PORT = 3001;

function isPortFree(port: number, host = '0.0.0.0'): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createServer();
    tester.once('error', () => resolve(false));
    tester.listen(port, host, () => {
      tester.close(() => resolve(true));
    });
  });
}

/** Web dev port: prefer 3000, never use 3001 (API). */
async function resolveWebDevPort(): Promise<number> {
  const fromEnv = Number(process.env.VITE_DEV_PORT);
  if (Number.isInteger(fromEnv) && fromEnv > 0 && fromEnv !== API_DEV_PORT) {
    return fromEnv;
  }
  const candidates = [3000, 3002, 3003, 3004, 3005, 3006];
  for (const port of candidates) {
    if (port === API_DEV_PORT) continue;
    if (await isPortFree(port)) return port;
  }
  return 3000;
}

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
        // Connect strips the `/api` mount prefix; backend routes are `/api/...`.
        const backendPath = pathname.startsWith('/api')
          ? pathname
          : `/api${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
        const proxyReq = http.request(
          {
            hostname: '127.0.0.1',
            port,
            path: backendPath,
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

export default defineConfig(async ({ mode }) => {
    const env = loadEnv(mode, __dirname, '');
    const webPort = await resolveWebDevPort();
    return {
      envDir: __dirname,
      server: {
        port: webPort,
        host: '0.0.0.0',
        strictPort: true,
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
