import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const port = Number(process.env.PORT || 4173);
const root = join(process.cwd(), 'dist');
const basePath = '/creamytuner';
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

createServer((request, response) => {
  const requestPath = new URL(request.url || '/', 'http://localhost').pathname;
  const relative = requestPath.startsWith(basePath) ? requestPath.slice(basePath.length) : requestPath;
  let candidate = normalize(join(root, decodeURIComponent(relative)));
  if (!candidate.startsWith(root)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  if (candidate === root || candidate.endsWith('\\') || candidate.endsWith('/')) candidate = join(candidate, 'index.html');
  if (!existsSync(candidate) && !extname(candidate)) candidate = `${candidate}.html`;
  if (!existsSync(candidate) || !statSync(candidate).isFile()) candidate = join(root, '+not-found.html');
  response.writeHead(candidate.endsWith('+not-found.html') ? 404 : 200, {
    'Content-Type': contentTypes[extname(candidate)] || 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  createReadStream(candidate).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`CreamyTuner preview: http://127.0.0.1:${port}${basePath}/`);
});
