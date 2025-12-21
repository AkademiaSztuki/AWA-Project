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
    biophilia: number; // 0-3 based on keyword count
  };
};

// Vocabularies for heuristic parsing

// STYLE WORDS - explicit interior design styles
const STYLE_WORDS = new Set([
  'modern', 'scandinavian', 'minimalist', 'industrial', 'rustic', 'bohemian',
  'contemporary', 'traditional', 'mid_century', 'japandi', 'wabi_sabi', 'wabi', 'sabi',
  'art_deco', 'art_nouveau', 'coastal', 'mediterranean', 'tropical',
  'hollywood_regency', 'french_provincial', 'english_country', 'nordic_hygge', 'nordic',
  'brutalist', 'maximalist', 'eclectic', 'zen', 'moroccan', 'southwestern',
  'california_casual', 'brooklyn_loft', 'parisian_chic', 'memphis_postmodern', 'memphis',
  'biophilic', 'vintage', 'retro', 'classic', 'luxury', 'glam',
  // Added missing styles from STYLE_OPTIONS
  'farmhouse', 'gothic', 'japanese', 'transitional'
]);

// COLOR WORDS - expanded with earth tones and missing colors
const COLOR_WORDS = new Set([
  'white','beige','grey','gray','black','charcoal','cream','sage','green','blue','ocean','navy','turquoise','teal','pink','blush','pastel','lavender','burgundy','gold','silver','chrome','copper','mustard','peach','coral','orange','yellow','red','brown','jewel','tones','mint',
  // Earth tones and missing colors
  'earth','clay','muted','sand','terracotta','forest','neutral','natural','warm','cool',
  'adobe','turquoise','coral','avocado','rainbow','jewel_tones','deep','rich'
]);

// MATERIAL WORDS - expanded with missing materials
const MATERIAL_WORDS = new Set([
  'wood','oak','birch','bamboo','stone','marble','linen','cotton','wool','leather','metal','steel','brass','copper','rattan','jute','ceramic','glass','concrete',
  // Missing materials
  'velvet','silk','chrome','plastic','adobe','driftwood','wicker','live_edge','raw','unfinished'
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
  'cozy','warm','serene','peaceful','romantic','elegant','luxurious','dramatic','playful','fresh','relaxing','authentic','minimal','calm','refreshing','harmonious','bold',
  // Missing mood words
  'hygge','zen','groovy','nostalgic','tropical','urban','edgy','imperfect','contemplative','graceful','flowing','sophisticated','refined','mystical','homey','comfortable','laid_back','sunny','relaxed','breezy','nostalgic','groovy','fun','playful','unconventional','energetic','80s'
]);

// BIOPHILIA WORDS - nature and plant-related keywords
const BIOPHILIA_WORDS = new Set([
  'plants','nature','forest','greenery','biophilic','organic','botanical','garden',
  'natural','live_edge','indoor_outdoor','flowing','refreshing','harmonious'
]);

function stripExtensions(filename: string): string {
  return filename.replace(/\.(jpg|jpeg|png)(\.(jpg|jpeg|png))?$/i, '');
}

function parseFilenameToCategories(filename: string): TinderImage['categories'] & { tags: string[] } {
  const base = stripExtensions(filename);
  const parts = base.split('_');
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:parseFilename-entry',message:'Starting filename parsing',data:{filename,base,partsCount:parts.length,firstParts:parts.slice(0,5)},timestamp:Date.now(),sessionId:'debug-session',runId:'tinder-images-check',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion

  // Remove leading ["living","room"] if present
  const startIndex = parts[0] === 'living' && parts[1] === 'room' ? 2 : 0;
  const tokens = parts.slice(startIndex);

  // Remove trailing numeric id if present
  if (tokens.length > 0 && /^\d+$/.test(tokens[tokens.length - 1])) {
    tokens.pop();
  }

  const tags = [...tokens];
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:parseFilename-tokens',message:'Tokens extracted from filename',data:{filename,tokensCount:tokens.length,tokens:tokens.slice(0,10)},timestamp:Date.now(),sessionId:'debug-session',runId:'tinder-images-check',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion

  // NEW APPROACH: Scan ALL tokens and categorize each one (not sequential)
  // FIRST: Try to reconstruct multi-word styles (art_deco, mid_century, etc.)
  const reconstructedTokens: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const nextToken = tokens[i + 1];
    
    // Try two-word combinations for styles
    if (nextToken) {
      const twoWordStyle = `${token}_${nextToken}`;
      if (STYLE_WORDS.has(twoWordStyle)) {
        reconstructedTokens.push(twoWordStyle);
        i++; // Skip next token since we used it
        continue;
      }
    }
    
    // Single token
    reconstructedTokens.push(token);
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:parseFilename-reconstructed',message:'Reconstructed tokens for multi-word styles',data:{filename,originalTokens:tokens.slice(0,5),reconstructedTokens:reconstructedTokens.slice(0,5)},timestamp:Date.now(),sessionId:'debug-session',runId:'tinder-images-check',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion

  const styleTokens: string[] = [];
  const colors: string[] = [];
  const materials: string[] = [];
  const furniture: string[] = [];
  const lighting: string[] = [];
  const layout: string[] = [];
  const mood: string[] = [];
  let biophiliaCount = 0;

  // Priority order: style > biophilia > colors > materials > furniture > lighting > layout > mood
  // This ensures style words are recognized first, then other categories
  for (const token of reconstructedTokens) {
    if (STYLE_WORDS.has(token)) {
      styleTokens.push(token);
    } else if (BIOPHILIA_WORDS.has(token)) {
      biophiliaCount++;
    } else if (COLOR_WORDS.has(token) && colors.length < 2) {
      colors.push(token);
    } else if (MATERIAL_WORDS.has(token) && materials.length < 2) {
      materials.push(token);
    } else if (FURNITURE_WORDS.has(token) && furniture.length < 2) {
      furniture.push(token);
    } else if (LIGHTING_WORDS.has(token) && lighting.length < 2) {
      lighting.push(token);
    } else if (LAYOUT_WORDS.has(token) && layout.length < 2) {
      layout.push(token);
    } else if (MOOD_WORDS.has(token) && mood.length < 2) {
      mood.push(token);
    }
  }

  // Convert biophilia count to 0-3 scale
  // 0 = no biophilia words, 1 = 1-2 words, 2 = 3-4 words, 3 = 5+ words
  const biophilia = biophiliaCount === 0 ? 0 : 
                    biophiliaCount <= 2 ? 1 :
                    biophiliaCount <= 4 ? 2 : 3;
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:parseFilename-categorization',message:'Categorization results',data:{filename,styleTokens,colors,materials,biophiliaCount,biophilia,lighting,mood},timestamp:Date.now(),sessionId:'debug-session',runId:'tinder-images-check',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion

  // Style: join recognized style words, or use first style word if multiple
  const style = styleTokens.length > 0 
    ? (styleTokens.length === 1 ? styleTokens[0] : styleTokens[0]) // Use first style word for consistency
    : null;

  const result = {
    style,
    colors,
    materials,
    furniture,
    lighting,
    layout,
    mood,
    biophilia,
    tags,
  };
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:parseFilename-result',message:'Final parsing result',data:{filename,result},timestamp:Date.now(),sessionId:'debug-session',runId:'tinder-images-check',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion
  return result;
}

export async function GET() {
  try {
    const dir = path.join(process.cwd(), 'public', 'Tinder', 'Livingroom');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:GET-entry',message:'Starting Tinder images load',data:{directory:dir},timestamp:Date.now(),sessionId:'debug-session',runId:'tinder-images-check',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    
    const all = await fs.promises.readdir(dir);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:GET-after-readdir',message:'All files found in directory',data:{totalFiles:all.length,allFiles:all.slice(0,10)},timestamp:Date.now(),sessionId:'debug-session',runId:'tinder-images-check',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    
    const images = all
      .filter((f) => /\.(jpg|jpeg|png)(\.(jpg|jpeg|png))?$/i.test(f))
      .map((filename, index) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:GET-parsing',message:'Parsing filename to categories',data:{filename,index},timestamp:Date.now(),sessionId:'debug-session',runId:'tinder-images-check',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        
        const parsed = parseFilenameToCategories(filename);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:GET-parsed',message:'Parsed categories from filename',data:{filename,parsed:{style:parsed.style,colors:parsed.colors,materials:parsed.materials,biophilia:parsed.biophilia,lighting:parsed.lighting,mood:parsed.mood},allTags:parsed.tags},timestamp:Date.now(),sessionId:'debug-session',runId:'tinder-images-check',hypothesisId:'H2'})}).catch(()=>{});
        // #endregion
        
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
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:GET-after-filter',message:'Images after filtering',data:{totalImages:images.length,imageFilenames:images.slice(0,5).map(i=>i.filename),stylesFound:images.map(i=>i.categories.style).filter(Boolean),biophiliaRange:{min:Math.min(...images.map(i=>i.categories.biophilia)),max:Math.max(...images.map(i=>i.categories.biophilia))}},timestamp:Date.now(),sessionId:'debug-session',runId:'tinder-images-check',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    // Shuffle to randomize order
    const shuffled = images.sort(() => Math.random() - 0.5).slice(0, 30);
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:GET-after-shuffle',message:'Final shuffled images selected',data:{selectedCount:shuffled.length,selectedFilenames:shuffled.slice(0,5).map(i=>i.filename),selectedStyles:shuffled.map(i=>i.categories.style).filter(Boolean),categoriesCoverage:{hasStyle:shuffled.filter(i=>i.categories.style).length,hasColors:shuffled.filter(i=>i.categories.colors.length>0).length,hasMaterials:shuffled.filter(i=>i.categories.materials.length>0).length,hasBiophilia:shuffled.filter(i=>i.categories.biophilia>0).length}},timestamp:Date.now(),sessionId:'debug-session',runId:'tinder-images-check',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion

    return NextResponse.json(shuffled);
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:GET-error',message:'Error loading images',data:{error:error instanceof Error?error.message:String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'tinder-images-check',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    console.error('Failed to read Livingroom images', error);
    return NextResponse.json({ error: 'Failed to list images' }, { status: 500 });
  }
}


