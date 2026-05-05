import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import fs from 'fs';
import path from 'path';
import { parseLivingRoomTinderFilename } from '@/lib/tinder-livingroom-filename-parse';

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
    biophilia: number;
  };
};

export async function GET() {
  try {
    const dir = path.join(process.cwd(), 'public', 'Tinder', 'Livingroom');

    const all = await fs.promises.readdir(dir);

    const images = all
      .filter((f) => /\.(jpg|jpeg|png)(\.(jpg|jpeg|png))?$/i.test(f))
      .map((filename, index) => {
        const parsed = parseLivingRoomTinderFilename(filename);

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
            biophilia: parsed.biophilia,
          },
        };
        return item;
      });

    const shuffled = images.sort(() => Math.random() - 0.5).slice(0, 30);

    return NextResponse.json(shuffled);
  } catch (error) {
    console.error('Failed to read Livingroom images', error);
    return NextResponse.json({ error: 'Failed to list images' }, { status: 500 });
  }
}
