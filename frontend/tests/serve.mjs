import { createServer, request } from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { extname, resolve, sep } from 'node:path';
mkdirSync('.test-output', { recursive: true });
const api = spawn(process.execPath, ['--env-file-if-exists=../backend/.env', resolve('../backend/server/api.ts')], {
  env: { ...process.env, PORT: '3102' },
  stdio: 'inherit',
});
const root = resolve('dist/enquiry-admin/browser');
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};
const server = createServer((req, res) => {
  if (req.url?.startsWith('/api/')) {
    const proxy = request(
      {
        hostname: '127.0.0.1',
        port: 3102,
        path: req.url,
        method: req.method,
        headers: req.headers,
      },
      (upstream) => {
        res.writeHead(upstream.statusCode || 502, upstream.headers);
        upstream.pipe(res);
      },
    );
    proxy.on('error', () => {
      res.writeHead(502);
      res.end();
    });
    req.pipe(proxy);
    return;
  }
  let path = resolve(root, '.' + new URL(req.url || '/', 'http://localhost').pathname);
  if (!path.startsWith(root + sep) || !extname(path) || !existsSync(path))
    path = resolve(root, 'index.html');
  res.writeHead(200, {
    'Content-Type': (mime[extname(path)] || 'application/octet-stream') + '; charset=utf-8',
  });
  res.end(readFileSync(path));
});
server.listen(4201, '127.0.0.1');
const stop = () => {
  api.kill();
  server.close();
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
process.on('exit', () => api.kill());
