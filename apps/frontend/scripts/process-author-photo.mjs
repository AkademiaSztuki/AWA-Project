/**
 * Remove cream/near-white background from author portrait and emit optimized WebP with alpha.
 * Uses edge flood-fill so subject pixels are preserved while studio backdrop is removed.
 *
 * Usage (from apps/frontend): node scripts/process-author-photo.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTHOR_DIR = path.join(__dirname, '..', 'public', 'author');
const INPUT = path.join(AUTHOR_DIR, 'jakub-palka.webp.bak');
const OUTPUT = path.join(AUTHOR_DIR, 'jakub-palka.webp');

/** Studio backdrop — permissive so flood reaches all background regions. */
function isBackdropCandidate(r, g, b, a) {
  if (a < 8) return true;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lum = (r + g + b) / 3;
  const sat = max === 0 ? 0 : (max - min) / max;

  if (lum >= 140 && sat <= 0.35) return true;
  if (r >= 175 && g >= 160 && b >= 135 && lum >= 150 && sat <= 0.3) return true;
  if (r >= 195 && g >= 188 && b >= 170) return true;

  return false;
}

function floodFillBackdrop(data, width, height, channels) {
  const total = width * height;
  const visited = new Uint8Array(total);
  const remove = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;

  const idx = (x, y) => y * width + x;
  const pixelOffset = (i) => i * channels;

  const tryEnqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = idx(x, y);
    if (visited[i]) return;
    visited[i] = 1;

    const o = pixelOffset(i);
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const a = data[o + 3];

    if (!isBackdropCandidate(r, g, b, a)) return;

    remove[i] = 1;
    queue[tail++] = i;
  };

  for (let x = 0; x < width; x++) {
    tryEnqueue(x, 0);
    tryEnqueue(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    tryEnqueue(0, y);
    tryEnqueue(width - 1, y);
  }

  while (head < tail) {
    const i = queue[head++];
    const x = i % width;
    const y = (i - x) / width;
    tryEnqueue(x - 1, y);
    tryEnqueue(x + 1, y);
    tryEnqueue(x, y - 1);
    tryEnqueue(x, y + 1);
  }

  let removed = 0;
  for (let i = 0; i < total; i++) {
    if (!remove[i]) continue;
    const o = pixelOffset(i);
    data[o + 3] = 0;
    removed++;
  }

  return removed;
}

/** Strict cream-only pass — removes studio backdrop pockets not reached by edge flood. */
function removeStrictCream(data, width, height, channels) {
  let removed = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * channels;
      const a = data[o + 3];
      if (a === 0) continue;

      const r = data[o];
      const g = data[o + 1];
      const b = data[o + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const lum = (r + g + b) / 3;
      const sat = max === 0 ? 0 : (max - min) / max;

      if (lum >= 152 && sat <= 0.16) {
        data[o + 3] = 0;
        removed++;
      } else if (lum >= 170 && sat <= 0.2) {
        data[o + 3] = 0;
        removed++;
      } else if (r >= 200 && g >= 190 && b >= 175) {
        data[o + 3] = 0;
        removed++;
      }
    }
  }
  return removed;
}

function softenFringe(data, width, height, channels) {
  let softened = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * channels;
      const r = data[o];
      const g = data[o + 1];
      const b = data[o + 2];
      let a = data[o + 3];
      if (a === 0 || a === 255) continue;

      const lum = (r + g + b) / 3;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;

      if (lum >= 130 && sat <= 0.28) {
        const next = Math.round(a * 0.55);
        if (next !== a) {
          data[o + 3] = next;
          softened++;
        }
      }
    }
  }
  return softened;
}

async function main() {
  const { data, info } = await sharp(INPUT)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const removed = floodFillBackdrop(data, width, height, channels);
  const strictRemoved = removeStrictCream(data, width, height, channels);
  const softened = softenFringe(data, width, height, channels);

  const webpBuffer = await sharp(data, { raw: { width, height, channels } })
    .webp({ quality: 88, effort: 6, alphaQuality: 100 })
    .toBuffer();

  await writeFile(OUTPUT, webpBuffer);

  const verify = await sharp(OUTPUT)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let lightOpaque = 0;
  let transparent = 0;
  for (let i = 0; i < verify.data.length; i += verify.info.channels) {
    const r = verify.data[i];
    const g = verify.data[i + 1];
    const b = verify.data[i + 2];
    const a = verify.data[i + 3];
    if (a < 10) transparent++;
    else if (r > 180 && g > 175 && b > 160) lightOpaque++;
  }

  console.log(`Processed ${width}x${height} → ${OUTPUT}`);
  console.log(
    `Flood-removed ${removed} px, strict cream ${strictRemoved} px, softened fringe ${softened} px`,
  );
  console.log(`Verify: transparent=${transparent}, remaining light opaque=${lightOpaque}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
