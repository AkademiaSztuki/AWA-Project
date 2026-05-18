/**
 * Resize hero marketing images and emit WebP for smaller deploy + faster LCP.
 * Reads every *.png in public/hero, writes matching *.webp, then deletes the PNG.
 *
 * Usage (from apps/frontend): pnpm optimize:hero
 */
import { readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HERO_DIR = path.join(__dirname, '..', 'public', 'hero');
/** Enough for full-bleed hero at ~2× on common laptop widths; avoids shipping 4K+ sources. */
const MAX_WIDTH = 2560;
const WEBP_QUALITY = 82;

async function main() {
  const files = await readdir(HERO_DIR);
  const pngs = files.filter((f) => f.toLowerCase().endsWith('.png'));
  if (pngs.length === 0) {
    console.log('No PNG files in public/hero — nothing to do.');
    return;
  }

  for (const file of pngs) {
    const inputPath = path.join(HERO_DIR, file);
    const base = file.slice(0, -'.png'.length);
    const outputPath = path.join(HERO_DIR, `${base}.webp`);

    await sharp(inputPath)
      .rotate()
      .resize({
        width: MAX_WIDTH,
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY, effort: 6 })
      .toFile(outputPath);

    await unlink(inputPath);
    console.log(`OK  ${file} → ${base}.webp`);
  }

  console.log(`Done. Converted ${pngs.length} file(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
