/**
 * Macro style modifications aligned with {@link STYLE_OPTIONS} (style-selection step).
 * Used by fast-generate, full generate, and modify flows.
 */

import { STYLE_OPTIONS } from '@/lib/questions/style-options';

export type MacroModificationCategory = 'macro';

/** Shared shape for macro style chips (matches existing ModificationOption in flow pages). */
export type MacroStyleModificationOption = {
  id: string;
  label: { pl: string; en: string };
  icon: null;
  category: MacroModificationCategory;
};

/** One button per style from style-selection — same order as STYLE_OPTIONS. */
export const MACRO_STYLE_MODIFICATIONS: MacroStyleModificationOption[] = STYLE_OPTIONS.map((s) => ({
  id: s.id,
  label: { pl: s.labelPl, en: s.labelEn },
  icon: null,
  category: 'macro',
}));

/** Short English cue for fast-track image-to-image macro prompts. */
const FAST_MACRO_TRANSFORM: Record<string, string> = {
  modern:
    'Transform the interior into Modern style: clean lines, neutral and refined palette, streamlined furniture, layered lighting, glass and metal accents, open readable layout',
  minimalist:
    'Transform the interior into minimalist style: uncluttered surfaces, geometric furniture, neutral whites and grays, hidden storage, strong negative space, refined simplicity, and serene balance',
  contemporary:
    'Transform the interior into Contemporary style: current editorial interiors, mixed materials, balanced neutrals with refined accents, sculptural lighting, tailored upholstery',
  scandinavian:
    'Transform the interior into Scandinavian style: light oak, airy neutrals, simple functional furniture, soft textiles, hygge atmosphere, clean lines, natural light, and a calm palette of whites, creams, and warm grays',
  japanese:
    'Transform the interior into Japanese-inspired style: natural wood, low-profile seating, shoji-like lightness, tatami or woven textures, restrained palette, quiet craftsmanship',
  zen:
    'Transform the interior into Zen style: meditative calm, minimal decor, soft daylight, natural stone and wood, balanced negative space, subtle organic accents',
  industrial:
    'Transform the interior into industrial style: raw concrete, metal accents, weathered leather, exposed structure, reclaimed wood, Edison-style lighting, muted grays and browns, and urban loft character',
  traditional:
    'Transform the interior into Traditional style: elegant classic furniture, symmetrical layouts, rich wood tones, refined upholstery, warm ambient light, timeless detailing',
  'mid-century':
    'Transform the interior into Mid-Century Modern style: iconic 1950s–60s silhouettes, walnut and teak, organic curves, tapered legs, bold yet warm palette, statement lighting',
  'art-deco':
    'Transform the interior into Art Deco style: geometric glamour, rich metals, lacquer and marble accents, bold symmetry, jewel tones, dramatic lighting',
  vintage:
    'Transform the interior into Vintage style: curated antiques, patina and character, warm layered textiles, classic patterns, nostalgic lighting',
  bohemian:
    'Transform the interior into bohemian style: layered rugs and textiles, woven textures, plants, warm earth tones, global patterns, relaxed vintage furniture, and cozy collected details',
  maximalist:
    'Transform the interior into Maximalist style: bold patterns, saturated color, layered art and decor, rich textiles, confident eclectic layering, statement lighting',
  eclectic:
    'Transform the interior into eclectic style: curated mix of vintage and modern pieces, layered textures, expressive art, confident color accents, varied patterns, and collected objects from different eras',
  gothic:
    'Transform the interior into Gothic-inspired style: deep moody palette, dramatic vertical lines, ornate metal and wood details, rich velvets, candle-like lighting, romantic darkness without horror clichés',
  rustic:
    'Transform the interior into rustic style: reclaimed wood, stone textures, linen, wrought iron, earth tones, handmade ceramics, baskets, and a warm farmhouse atmosphere',
  farmhouse:
    'Transform the interior into Farmhouse style: cozy country warmth, shiplap or beadboard feel, apron sink cues where appropriate, vintage wood, soft whites and sage, practical layered textiles',
  mediterranean:
    'Transform the interior into Mediterranean style: warm terracotta and plaster tones, natural stone and timber, arches where fitting, sun-washed textures, relaxed coastal elegance',
};

/** Long-form “replace all” prompts for full-flow generate/modify (richer than fast-track). */
const FULL_MACRO_REPLACE: Record<string, string> = {
  modern:
    'Replace ALL furniture and accessories with Modern style: clean-lined sofas and tables, neutral refined palette, layered ambient and accent lighting, metal and glass details, open editorial layout, minimal visual noise',
  minimalist:
    'Replace ALL furniture and accessories with minimalist style: clean white or soft gray planes, sleek geometric seating, hidden storage, restrained accessories, single focal art where appropriate, polished concrete or pale wood floors feel, zen-like calm',
  contemporary:
    'Replace ALL furniture and accessories with Contemporary style: up-to-date editorial pieces, mixed textures (wood, metal, stone), balanced neutrals with one accent thread, sculptural lighting, tailored upholstery',
  scandinavian:
    'Replace ALL furniture and accessories with Scandinavian style: white walls, light oak floors feel, cozy beige sofa with cream pillows, minimalist coffee table, hygge textiles, natural light, whites and warm grays, potted greens, functional calm',
  japanese:
    'Replace ALL furniture and accessories with Japanese-inspired style: natural wood, low seating, light paper-like luminosity, tatami or woven textures, restrained palette, craftsmanship-led minimal decor',
  zen:
    'Replace ALL furniture and accessories with Zen style: meditative simplicity, natural stone and timber, soft daylight, very sparse decor, balanced space, organic accents only where meaningful',
  industrial:
    'Replace ALL furniture and accessories with industrial loft style: exposed brick feel, raw concrete, steel beams or metal shelving, leather and reclaimed wood, Edison lighting, muted grays and browns, urban loft mood',
  traditional:
    'Replace ALL furniture and accessories with Traditional style: elegant classic seating, rich wood casegoods, symmetrical arrangement, refined upholstery, warm ambient lighting, ornamental moldings where visible, timeless European or American classic cues',
  'mid-century':
    'Replace ALL furniture and accessories with Mid-Century Modern style: walnut or teak furniture, organic curves, tapered legs, iconic lounge chairs, sunburst or atomic lighting cues, warm optimistic palette',
  'art-deco':
    'Replace ALL furniture and accessories with Art Deco style: geometric patterns, lacquer and marble, brass or chrome accents, symmetrical glamour, jewel tones, dramatic statement lighting',
  vintage:
    'Replace ALL furniture and accessories with Vintage style: curated period pieces, warm patina, layered rugs and textiles, classic patterns, brass or ceramic lighting, nostalgic character',
  bohemian:
    'Replace ALL furniture and accessories with bohemian style: layered Persian and Moroccan rugs, macrame or textile wall interest, plants, warm earth and jewel tones, vintage wood, eclectic collected decor',
  maximalist:
    'Replace ALL furniture and accessories with maximalist style: bold wallpaper or art walls, saturated colors, layered cushions and throws, rich patterns, gallery clusters, confident eclectic abundance',
  eclectic:
    'Replace ALL furniture and accessories with eclectic style: mix of vintage and modern seating, colorful rug, gallery wall, varied patterns and textures, curated objects from different eras, bold but cohesive',
  gothic:
    'Replace ALL furniture and accessories with Gothic-inspired romantic interior style: deep jewel or charcoal palette, velvet upholstery, ornate wood or iron details, dramatic drapery, warm candle-like lighting — elegant and moody, not horror-themed',
  rustic:
    'Replace ALL furniture and accessories with rustic country style: exposed beams feel, stone or brick hearth cues, reclaimed wood furniture, natural linen, earth tones, wrought iron, handcrafted ceramics, warm farmhouse mood',
  farmhouse:
    'Replace ALL furniture and accessories with Farmhouse style: cozy slipcovered seating, shiplap or paneled wall feel, apron-front kitchen cues if kitchen visible, vintage wood dining, soft whites and sage, practical textiles',
  mediterranean:
    'Replace ALL furniture and accessories with Mediterranean style: warm plaster tones, terracotta accents, natural stone and timber, arched details where fitting, sun-washed textures, relaxed coastal-meets-old-world elegance',
};

export function buildFastMacroModificationPrompt(modification: {
  id: string;
  label: { en: string };
}): string {
  const styleChange =
    FAST_MACRO_TRANSFORM[modification.id] ||
    `Transform the interior into ${modification.label.en}-inspired interior design: cohesive furniture, materials, lighting, and decor aligned with this aesthetic`;
  return `SYSTEM INSTRUCTION: Image-to-image style transformation. KEEP: walls, windows, doors, ceiling, camera angle, and architectural structure - IDENTICAL. CHANGE: ${styleChange}. Update furniture, colors, decorations, flooring, lighting fixtures, and accessories to match the style while preserving the room perspective and architectural layout.`;
}

/** Same closing sentence as previous generate/modify implementation. */
export function buildFullFlowMacroModificationPrompt(modification: {
  id: string;
  label: { en: string };
}): string {
  const styleChange =
    FULL_MACRO_REPLACE[modification.id] ||
    `Replace ALL furniture and accessories with ${modification.label.en} style: cohesive full-room redesign — furniture, textiles, lighting, and decor matching this aesthetic`;
  return `${styleChange}. Keep walls, doors, windows, ceiling, stairs exactly in same positions. Transform colors, furniture, decorations, flooring, and accessories to match the style completely.`;
}
