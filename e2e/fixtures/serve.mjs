#!/usr/bin/env node
// Hermetic fixture server for the acceptance suite: serves the generated
// static site (gen-fixtures.mjs --out e2e/fixtures/site) on 127.0.0.1:8090
// with CORS + Range support, exactly like GitHub Pages does for the public
// demo. Nothing in a scenario may reach the network beyond this host.
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';

const ROOT = new URL('./site/', import.meta.url).pathname;
const PORT = Number(process.env.FIXTURE_PORT ?? 8090);
const TYPES = {
  '.m3u': 'audio/x-mpegurl',
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.xml': 'application/xml',
  '.gz': 'application/gzip',
  '.ts': 'video/mp2t',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.html': 'text/html',
};

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  const path = normalize(join(ROOT, decodeURIComponent(url.pathname)));
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  if (!path.startsWith(ROOT) || !existsSync(path) || statSync(path).isDirectory())
    return res.writeHead(404).end();
  const size = statSync(path).size;
  res.setHeader('Content-Type', TYPES[extname(path)] ?? 'application/octet-stream');
  res.setHeader('Accept-Ranges', 'bytes');
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': end - start + 1,
    });
    return createReadStream(path, { start, end }).pipe(res);
  }
  res.writeHead(200, { 'Content-Length': size });
  createReadStream(path).pipe(res);
}).listen(PORT, '127.0.0.1', () => console.info(`fixture server on http://127.0.0.1:${PORT}`));
