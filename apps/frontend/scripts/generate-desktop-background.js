#!/usr/bin/env node

/**
 * Generuje tło desktop z mobilnego JPG: obrót 90° CW → landscape.
 * Wyjście: background-desktop-1920.jpg, background-desktop-1920.webp
 *
 * Użycie: node scripts/generate-desktop-background.js
 * Wymaga: sharp (devDependency)
 */

const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const IMAGES = path.join(ROOT, 'public', 'images');
const INPUT = path.join(IMAGES, 'background-mobile-1080.jpg');
const OUTPUT_JPG = path.join(IMAGES, 'background-desktop-1920.jpg');
const OUTPUT_WEBP = path.join(IMAGES, 'background-desktop-1920.webp');

async function main() {
  try {
    await sharp(INPUT)
      .rotate(90)
      .jpeg({ quality: 85 })
      .toFile(OUTPUT_JPG);
    console.log('Written:', OUTPUT_JPG);

    await sharp(INPUT)
      .rotate(90)
      .webp({ quality: 85 })
      .toFile(OUTPUT_WEBP);
    console.log('Written:', OUTPUT_WEBP);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
