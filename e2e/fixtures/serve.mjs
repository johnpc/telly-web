#!/usr/bin/env node
// Hermetic fixture server for the acceptance suite: serves the generated
// static site (gen-fixtures.mjs --out e2e/fixtures/site) on 127.0.0.1:8090
// with CORS + Range support, exactly like GitHub Pages does for the public
// demo. Nothing in a scenario may reach the network beyond this host.
//
// FIXTURE_THROTTLE=realtime paces every `*.ts` stream body at the stream's own
// bitrate (size ÷ PCR span), in 188-byte-aligned chunks every 100 ms, so the
// buffer gate is exercised on a ~1× pipe like a real provider's instead of a
// disk-speed burst. FIXTURE_PREROLL_SEC=N (default 0) sends the first N
// seconds of media at once, imitating a provider's pre-roll burst. Ranges
// still work (the container sniff reads the first 1504 bytes); playlists, EPG,
// logos and MP4 are never paced. The mode is announced on every `.ts` response
// as `X-Fixture-Throttle: realtime; preroll=N` so a leg can prove its server.
import { createServer } from 'node:http';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';

const ROOT = new URL('./site/', import.meta.url).pathname;
const PORT = Number(process.env.FIXTURE_PORT ?? 8090);
const THROTTLED = process.env.FIXTURE_THROTTLE === 'realtime';
const PREROLL_SEC = Number(process.env.FIXTURE_PREROLL_SEC ?? 0);
const TS_PACKET = 188;
const TICK_MS = 100;
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

// ---- real-time pacing -------------------------------------------------------
/** Seconds between the first and last PCR of the stream's PCR PID (what the muxer clocked the file at). */
function pcrSpanSec(buf) {
  let pid = -1;
  let first = -1;
  let last = -1;
  for (let i = 0; i + TS_PACKET <= buf.length; i += TS_PACKET) {
    if (buf[i] !== 0x47) break;
    const hasAdaptation = (buf[i + 3] & 0x20) !== 0;
    if (!hasAdaptation || buf[i + 4] === 0 || (buf[i + 5] & 0x10) === 0) continue;
    const thisPid = ((buf[i + 1] & 0x1f) << 8) | buf[i + 2];
    // 33-bit PCR base: multiply, never shift, past bit 31.
    const base =
      buf[i + 6] * 2 ** 25 + buf[i + 7] * 2 ** 17 + buf[i + 8] * 2 ** 9 + buf[i + 9] * 2 + (buf[i + 10] >> 7);
    if (pid < 0) {
      pid = thisPid;
      first = base;
    }
    if (thisPid === pid) last = base;
  }
  return pid < 0 ? null : (last - first) / 90_000;
}

const rates = new Map();
/** Bytes per second of a `.ts` fixture, computed once from its PCR span. */
function bytesPerSecond(path) {
  const known = rates.get(path);
  if (known !== undefined) return known;
  const buf = readFileSync(path);
  const span = pcrSpanSec(buf);
  if (span === null || span <= 0) throw new Error(`${path}: no PCR; cannot pace at real-time rate`);
  const rate = buf.length / span;
  rates.set(path, rate);
  console.info(`paced ${path.slice(ROOT.length)}: ${span.toFixed(1)} s, ${(rate / 1024).toFixed(1)} KB/s`);
  return rate;
}

/** Largest offset ≤ `n` that ends on a TS packet boundary of the file (`fileStart` is the slice's offset). */
const alignDown = (n, fileStart) => n - ((fileStart + n) % TS_PACKET);

/** Writes `buf` (bytes `fileStart..` of the file) at `rate` B/s after an instant pre-roll; stops when the client goes. */
function pace(res, buf, fileStart, rate) {
  const preroll = Math.round(rate * PREROLL_SEC);
  const t0 = Date.now();
  let sent = 0;
  let timer = null;
  res.on('close', () => clearTimeout(timer));
  res.on('error', () => clearTimeout(timer));
  const tick = () => {
    if (res.destroyed) return;
    const due = Math.min(buf.length, preroll + Math.floor((rate * (Date.now() - t0)) / 1000));
    const upto = due === buf.length ? due : alignDown(due, fileStart);
    if (upto > sent) {
      res.write(buf.subarray(sent, upto));
      sent = upto;
    }
    if (sent >= buf.length) return res.end();
    timer = setTimeout(tick, TICK_MS);
  };
  tick();
}

/** Sends the body: paced for a `.ts` in throttle mode, streamed from disk otherwise. */
function sendBody(res, path, start, end) {
  if (!THROTTLED || extname(path) !== '.ts') return createReadStream(path, { start, end }).pipe(res);
  pace(res, readFileSync(path).subarray(start, end + 1), start, bytesPerSecond(path));
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://x');
  const path = normalize(join(ROOT, decodeURIComponent(url.pathname)));
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader(
    'Access-Control-Expose-Headers',
    'Content-Length, Content-Range, Accept-Ranges, X-Fixture-Throttle',
  );
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  if (!path.startsWith(ROOT) || !existsSync(path) || statSync(path).isDirectory())
    return res.writeHead(404).end();
  const size = statSync(path).size;
  res.setHeader('Content-Type', TYPES[extname(path)] ?? 'application/octet-stream');
  res.setHeader('Accept-Ranges', 'bytes');
  if (THROTTLED && extname(path) === '.ts') {
    res.setHeader('X-Fixture-Throttle', `realtime; preroll=${PREROLL_SEC}`);
  }
  const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': end - start + 1,
    });
    return sendBody(res, path, start, end);
  }
  res.writeHead(200, { 'Content-Length': size });
  sendBody(res, path, 0, size - 1);
}).listen(PORT, '127.0.0.1', () =>
  console.info(
    `fixture server on http://127.0.0.1:${PORT}${THROTTLED ? ` (streams paced at real-time rate, pre-roll ${PREROLL_SEC} s)` : ''}`,
  ),
);
