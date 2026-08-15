import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SIZE = 256;

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
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function inRoundedRect(x, y, radius) {
  const margin = 8;
  const x0 = margin;
  const y0 = margin;
  const x1 = SIZE - margin;
  const y1 = SIZE - margin;
  const cx = Math.max(x0 + radius, Math.min(x, x1 - radius));
  const cy = Math.max(y0 + radius, Math.min(y, y1 - radius));
  const dx = x - cx;
  const dy = y - cy;
  const r = radius - 2;
  if (dx * dx + dy * dy > r * r) return false;
  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function inTriangle(px, py, a, b, c) {
  const sign = (p1, p2, p3) => (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
  const d1 = sign([px, py], a, b);
  const d2 = sign([px, py], b, c);
  const d3 = sign([px, py], c, a);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function pixel(x, y) {
  if (!inRoundedRect(x, y, 56)) {
    return [0, 0, 0, 0];
  }
  const onBorder =
    x < 12 || x > SIZE - 12 || y < 12 || y > SIZE - 12;
  if (onBorder) return [56, 189, 248, 255];
  if (inTriangle(x, y, [94, 66], [198, 128], [94, 190])) {
    const t = y / SIZE;
    const r = Math.round(56 + (14 - 56) * t);
    const g = Math.round(189 + (165 - 189) * t);
    const b = 248;
    return [r, g, b, 255];
  }
  const glow = Math.round(30 + 15 * Math.sin((x + y) / 26));
  return [15, 23, 42, 255];
}

const stride = SIZE * 4 + 1;
const raw = Buffer.alloc(SIZE * stride);
for (let y = 0; y < SIZE; y++) {
  raw[y * stride] = 0;
  for (let x = 0; x < SIZE; x++) {
    const [r, g, b, a] = pixel(x, y);
    const offset = y * stride + 1 + x * 4;
    raw[offset] = r;
    raw[offset + 1] = g;
    raw[offset + 2] = b;
    raw[offset + 3] = a;
  }
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;
ihdr[9] = 6;
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw)),
  chunk("IEND", Buffer.alloc(0)),
]);

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);

const entry = Buffer.alloc(16);
entry[0] = 0;
entry[1] = 0;
entry[2] = 0;
entry[3] = 0;
entry.writeUInt16LE(1, 4);
entry.writeUInt16LE(32, 6);
entry.writeUInt32LE(png.length, 8);
entry.writeUInt32LE(22, 12);

const ico = Buffer.concat([header, entry, png]);

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "assets");
mkdirSync(outDir, { recursive: true });
const outFile = resolve(outDir, "icon.ico");
writeFileSync(outFile, ico);
console.log(`icon written: ${outFile} (${ico.length} bytes)`);
