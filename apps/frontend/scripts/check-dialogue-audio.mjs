#!/usr/bin/env node
/**
 * Lists dialogue MP3 files expected by AwaDialogue vs files in public/audio.
 * Run: node apps/frontend/scripts/check-dialogue-audio.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const audioDir = path.join(scriptDir, '..', 'public', 'audio');
const dialogueTs = fs.readFileSync(
  path.join(scriptDir, '..', 'src', 'components', 'awa', 'AwaDialogue.tsx'),
  'utf8'
);

const customBlock = dialogueTs.match(
  /const AUDIO_BASENAME_BY_STEP[\s\S]*?^};/m
)?.[0];
const audioStepsBlock = dialogueTs.match(
  /const audioSteps = \[([\s\S]*?)\];/
)?.[1];

const customByStep = {};
const customFiles = new Set();
if (customBlock) {
  for (const stepBlock of customBlock.matchAll(
    /(\w+):\s*\{([^}]+)\}/g
  )) {
    const step = stepBlock[1];
    customByStep[step] = {};
    for (const m of stepBlock[2].matchAll(/(pl|en): '([^']+)'/g)) {
      customByStep[step][m[1]] = m[2];
      customFiles.add(`${m[2]}.mp3`);
    }
  }
}

const steps = [...(audioStepsBlock?.matchAll(/'([^']+)'/g) ?? [])].map((m) => m[1]);
const conventionFiles = new Set();
for (const step of steps) {
  const custom = customByStep[step];
  if (custom?.pl) conventionFiles.add(`${custom.pl}.mp3`);
  else conventionFiles.add(`${step}_pl.mp3`);
  if (custom?.en) conventionFiles.add(`${custom.en}.mp3`);
  else conventionFiles.add(`${step}_en.mp3`);
}

const expected = new Set([...customFiles, ...conventionFiles, 'ambient.mp3']);
const onDisk = new Set(
  fs
    .readdirSync(audioDir)
    .filter((f) => f.endsWith('.mp3'))
);

const missing = [...expected].filter((f) => !onDisk.has(f)).sort();
const extra = [...onDisk].filter((f) => !expected.has(f)).sort();

const missingEn = missing.filter((f) => f.endsWith('_en.mp3'));
const missingPl = missing.filter((f) => f.endsWith('_pl.mp3'));

console.log('=== Dialogue audio audit ===\n');
console.log(`Expected (from AwaDialogue): ${expected.size}`);
console.log(`On disk: ${onDisk.size}\n`);

console.log(`Missing total: ${missing.length}`);
console.log(`  missing *_en.mp3: ${missingEn.length}`);
console.log(`  missing *_pl.mp3: ${missingPl.length}\n`);

if (missingEn.length) {
  console.log('--- Missing English ---');
  for (const f of missingEn) console.log(`  ${f}`);
  console.log('');
}

if (missingPl.length) {
  console.log('--- Missing Polish ---');
  for (const f of missingPl) console.log(`  ${f}`);
  console.log('');
}

if (extra.length) {
  console.log('--- On disk but not in AwaDialogue map (OK if legacy) ---');
  for (const f of extra) console.log(`  ${f}`);
}

process.exit(missing.length > 0 ? 1 : 0);
