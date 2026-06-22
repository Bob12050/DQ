// Generates placeholder PNG app icons (no external deps) using zlib.
// Original artwork: a stylised "resonance" diamond on a deep-violet field.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function makePng(size, draw) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x, y, size);
      const p = rowStart + 1 + x * 4;
      raw[p] = r; raw[p + 1] = g; raw[p + 2] = b; raw[p + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function draw(x, y, size, { padding = 0 } = {}) {
  const cx = size / 2;
  const cy = size / 2;
  // Background gradient (violet -> dark).
  const t = y / size;
  const bg = [Math.round(27 + t * -16), Math.round(16 + t * -9), Math.round(51 + t * -36), 255];
  if (x < padding || y < padding || x >= size - padding || y >= size - padding) return bg;
  // Diamond.
  const d = Math.abs(x - cx) + Math.abs(y - cy);
  const r = size * 0.32;
  if (d < r) {
    const k = 1 - d / r;
    return [Math.round(205 + k * 50), Math.round(188 + k * 40), 255, 255];
  }
  if (d < r + size * 0.04) return [120, 90, 200, 255];
  return bg;
}

const targets = [
  { name: 'icon-192.png', size: 192, opts: {} },
  { name: 'icon-512.png', size: 512, opts: {} },
  { name: 'icon-512-maskable.png', size: 512, opts: { padding: 64 } },
  { name: 'apple-touch-icon.png', size: 180, opts: {} },
];
for (const t of targets) {
  writeFileSync(join(outDir, t.name), makePng(t.size, (x, y, s) => draw(x, y, s, t.opts)));
  console.log('wrote', t.name);
}

// Simple favicon SVG.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#1b1033"/>
  <path d="M32 12 L52 32 L32 52 L12 32 Z" fill="#cdbcff"/>
</svg>`;
writeFileSync(join(outDir, 'favicon.svg'), svg);
console.log('wrote favicon.svg');
