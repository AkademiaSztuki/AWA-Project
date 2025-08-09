import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import fs from 'fs';
import path from 'path';

type TinderImage = {
  id: number;
  url: string;
  filename: string;
  tags: string[];
  categories: {
    style: string | null;
    colors: string[];
    materials: string[];
    furniture: string[];
    lighting: string[];
    layout: string[];
    mood: string[];
  };
};

// Vocabularies for heuristic parsing
const COLOR_WORDS = new Set([
  'white','beige','grey','gray','black','charcoal','cream','sage','green','blue','ocean','navy','turquoise','teal','pink','blush','pastel','lavender','burgundy','gold','silver','chrome','copper','mustard','peach','coral','orange','yellow','red','brown','jewel','tones','mint'
]);

const MATERIAL_WORDS = new Set([
  'wood','oak','birch','bamboo','stone','marble','linen','cotton','wool','leather','metal','steel','brass','copper','rattan','jute','ceramic','glass','concrete'
]);

const FURNITURE_WORDS = new Set([
  'sofa','sectional','modular','chesterfield','wingback','armchair','table','coffee','console','bench','pouf','low','seating','poufs','cushions','low_seating','poufs_cushions'
]);

const LIGHTING_WORDS = new Set([
  'natural','daylight','pendant','spotlights','neon','led','strips','lamps','sconces','recessed','statement','chandelier','crystal','table_lamps','floor_lamps','paper','lanterns'
]);

const LAYOUT_WORDS = new Set([
  'open','plan','loft','style','zoned','areas','compact','efficient','indoor','outdoor','flow','spacious','cozy','intimate'
]);

const MOOD_WORDS = new Set([
  'cozy','warm','serene','peaceful','romantic','elegant','luxurious','dramatic','playful','fresh','relaxing','authentic','minimal','calm','refreshing','harmonious','bold'
]);

function stripExtensions(filename: string): string {
  return filename.replace(/\.(jpg|jpeg|png)(\.(jpg|jpeg|png))?$/i, '');
}

function parseFilenameToCategories(filename: string): TinderImage['categories'] & { tags: string[] } {
  const base = stripExtensions(filename);
  const parts = base.split('_');

  // Remove leading ["living","room"] if present
  const startIndex = parts[0] === 'living' && parts[1] === 'room' ? 2 : 0;
  const tokens = parts.slice(startIndex);

  // Remove trailing numeric id if present
  if (tokens.length > 0 && /^\d+$/.test(tokens[tokens.length - 1])) {
    tokens.pop();
  }

  const tags = [...tokens];

  let cursor = 0;

  // STYLE: tokens until first color word
  const styleTokens: string[] = [];
  while (cursor < tokens.length && !COLOR_WORDS.has(tokens[cursor])) {
    styleTokens.push(tokens[cursor]);
    cursor += 1;
  }
  const style = styleTokens.length > 0 ? styleTokens.join(' ') : null;

  // Helper to collect up to n tokens from a given vocabulary
  const collect = (vocab: Set<string>, max: number): string[] => {
    const collected: string[] = [];
    while (cursor < tokens.length && collected.length < max && vocab.has(tokens[cursor])) {
      collected.push(tokens[cursor]);
      cursor += 1;
    }
    return collected;
  };

  const colors = collect(COLOR_WORDS, 2);
  const materials = collect(MATERIAL_WORDS, 2);
  const furniture = collect(FURNITURE_WORDS, 2);
  const lighting = collect(LIGHTING_WORDS, 2);
  const layout = collect(LAYOUT_WORDS, 2);
  const mood = collect(MOOD_WORDS, 2);

  return {
    style,
    colors,
    materials,
    furniture,
    lighting,
    layout,
    mood,
    tags,
  };
}

export async function GET() {
  try {
    const dir = path.join(process.cwd(), 'public', 'Tinder', 'Livingroom');
    const all = await fs.promises.readdir(dir);
    const images = all
      .filter((f) => /\.(jpg|jpeg|png)(\.(jpg|jpeg|png))?$/i.test(f))
      .map((filename, index) => {
        const parsed = parseFilenameToCategories(filename);
        const item: TinderImage = {
          id: index + 1,
          url: `/Tinder/Livingroom/${filename}`,
          filename,
          tags: parsed.tags,
          categories: {
            style: parsed.style,
            colors: parsed.colors,
            materials: parsed.materials,
            furniture: parsed.furniture,
            lighting: parsed.lighting,
            layout: parsed.layout,
            mood: parsed.mood,
          },
        };
        return item;
      });

    // Shuffle to randomize order
    const shuffled = images.sort(() => Math.random() - 0.5).slice(0, 30);

    return NextResponse.json(shuffled);
  } catch (error) {
    console.error('Failed to read Livingroom images', error);
    return NextResponse.json({ error: 'Failed to list images' }, { status: 500 });
  }
}


