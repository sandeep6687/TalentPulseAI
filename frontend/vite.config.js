import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function isBackendRunning() {
  try {
    const res = await fetch('http://127.0.0.1:5000/swagger', { signal: AbortSignal.timeout(1200) });
    return res.ok;
  } catch {
    return false;
  }
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'launch-backend',
      configureServer(server) {
        server.middlewares.use('/api/launch-backend', async (req, res, next) => {
          if (req.method !== 'GET' && req.method !== 'POST') {
            return next();
          }

          if (await isBackendRunning()) {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ status: 'already-running', url: 'http://127.0.0.1:5000/swagger' }));
            return;
          }

          const backendDir = path.resolve(__dirname, '..', 'backend');
          const child = spawn('dotnet', ['run', '--no-launch-profile', '--urls', 'http://127.0.0.1:5000'], {
            cwd: backendDir,
            detached: true,
            stdio: 'ignore',
            windowsHide: true,
          });

          child.unref();

          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 'launching', url: 'http://127.0.0.1:5000/swagger' }));
        });
      }
    }
  ],
  server: {
    port: 3000,
    open: true
  }
});
