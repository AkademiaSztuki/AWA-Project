/**
 * Marketing hero: interior photos under `/public/hero` (excluding `puste.webp`).
 * `HERO_INTERIOR_SLIDES_RAW` lists every interior WebP in that folder (same order as sorted filenames).
 * `HERO_INTERIOR_SLIDES` reorders to avoid the same `styleGroup` back-to-back when possible.
 */

export type HeroInteriorSlideCopy = {
  title: string;
  tagline: string;
  description: string;
};

export type HeroInteriorSlide = {
  /** Filename only, relative to `/hero/` */
  file: string;
  /** Stable bucket for ordering — no two consecutive slides share the same group. */
  styleGroup: string;
  pl: HeroInteriorSlideCopy;
  en: HeroInteriorSlideCopy;
};

export const HERO_EMPTY_ROOM_FILE = 'puste.webp';

export function heroInteriorImageSrc(file: string): string {
  return `/hero/${encodeURIComponent(file)}`;
}

/**
 * Reorders slides so the same `styleGroup` is not placed next to the previous one when possible.
 * When only one group remains, duplicates are unavoidable for a short run.
 */
export function orderSlidesAvoidingAdjacentStyle(slides: readonly HeroInteriorSlide[]): HeroInteriorSlide[] {
  const remaining = [...slides];
  const result: HeroInteriorSlide[] = [];
  let last: string | null = null;
  while (remaining.length) {
    const validIdx = remaining
      .map((s, i) => (s.styleGroup !== last ? i : -1))
      .filter((i) => i >= 0);
    let idx: number;
    if (validIdx.length) {
      const countByGroup = new Map<string, number>();
      for (const s of remaining) {
        countByGroup.set(s.styleGroup, (countByGroup.get(s.styleGroup) ?? 0) + 1);
      }
      idx = validIdx.reduce((best, i) => {
        const g = remaining[i].styleGroup;
        const bestG = remaining[best].styleGroup;
        const diff = (countByGroup.get(g) ?? 0) - (countByGroup.get(bestG) ?? 0);
        if (diff !== 0) return diff > 0 ? i : best;
        return i < best ? i : best;
      });
    } else {
      idx = 0;
    }
    const [next] = remaining.splice(idx, 1);
    result.push(next);
    last = next.styleGroup;
  }
  return fixHeroSlideRingAdjacent(result);
}

/** If first and last share a style group, rotate so the carousel wrap does not repeat. */
function fixHeroSlideRingAdjacent(slides: HeroInteriorSlide[]): HeroInteriorSlide[] {
  if (slides.length < 2) return slides;
  if (slides[0].styleGroup !== slides[slides.length - 1].styleGroup) return slides;
  for (let k = 1; k < slides.length; k += 1) {
    if (slides[k].styleGroup !== slides[k - 1].styleGroup) {
      return slides.slice(k).concat(slides.slice(0, k));
    }
  }
  return slides;
}

const HERO_INTERIOR_SLIDES_RAW: readonly HeroInteriorSlide[] = [
  {
    file: '1.webp',
    styleGroup: 'classic',
    pl: {
      title: 'Klasyczna elegancja',
      tagline: 'tradycja + luksus',
      description:
        'Salon w stylu neoklasycznym: damask na ścianach, kryształowy żyrandol i meble z ciemnego drewna. Ciepła, formalna atmosfera jak w dworku.',
    },
    en: {
      title: 'Classic elegance',
      tagline: 'tradition + luxury',
      description:
        'A neoclassical living room with damask walls, a crystal chandelier, and dark wood furniture — warm, formal, and timeless.',
    },
  },
  {
    file: '2.webp',
    styleGroup: 'contemporary',
    pl: {
      title: 'Nowoczesny minimal z akcentem',
      tagline: 'światło + głębokie kolory',
      description:
        'Modułowa sofa, szmaragdowy fotel, galeria nad szafką i duży obraz w granacie. Stonowana baza z wyraźnym, designerskim akcentem.',
    },
    en: {
      title: 'Modern minimal with a statement',
      tagline: 'light + deep color',
      description:
        'Modular sofa, emerald lounge chair, a curated gallery wall, and a bold navy artwork — a calm base with a sharp design accent.',
    },
  },
  {
    file: 'image (22).webp',
    styleGroup: 'japandi',
    pl: {
      title: 'Japandi w obłych kształtach',
      tagline: 'naturalne materiały + spokój',
      description:
        'Miękkie, modułowe sofy, juta na podłodze i duże przeszklenia do ogrodu. Połączenie skandynawskiej prostoty z japońską ciszą.',
    },
    en: {
      title: 'Japandi in soft curves',
      tagline: 'natural materials + calm',
      description:
        'Rounded modular sofas, a jute rug, and tall glazing to the garden — Scandinavian ease meets quiet Japanese restraint.',
    },
  },
  {
    file: 'image (23).webp',
    styleGroup: 'japandi',
    pl: {
      title: 'Organiczny minimal',
      tagline: 'krzywe linie + neutralne tony',
      description:
        'Łukowa sofa, marmurowy stolik i lekki panel na ścianie. Jasne zasłony filtrują dzienne światło — wnętrze jak oddech.',
    },
    en: {
      title: 'Organic minimal',
      tagline: 'curves + neutrals',
      description:
        'A curved sofa, marble coffee table, and soft abstract art. Sheer curtains diffuse daylight for a gentle, airy mood.',
    },
  },
  {
    file: 'image (25).webp',
    styleGroup: 'industrial',
    pl: {
      title: 'Loft industrialny',
      tagline: 'cegła + skóra',
      description:
        'Czerwona cegła, belki i zestaw chesterfield. Perski dywan i lampy Edisona domykają klimat surowego, ale przytulnego loftu.',
    },
    en: {
      title: 'Industrial loft',
      tagline: 'brick + leather',
      description:
        'Exposed brick, heavy beams, and Chesterfield leather. A Persian rug and Edison pendants finish the raw yet cozy loft mood.',
    },
  },
  {
    file: 'image (26).webp',
    styleGroup: 'industrial',
    pl: {
      title: 'Industrial z ogrodem',
      tagline: 'metal + skórzane fotele',
      description:
        'Regał na książki przy cegle, skórzana sofa koniakowa i widok na zieleń. Surowe tło, ciepłe siedziska i dużo światła.',
    },
    en: {
      title: 'Industrial with a garden view',
      tagline: 'metal + leather seats',
      description:
        'Open shelving on brick, a cognac leather sofa, and glass to greenery. Cool shell, warm seating, plenty of daylight.',
    },
  },
  {
    file: 'image (27).webp',
    styleGroup: 'boho',
    pl: {
      title: 'Ciepły boho',
      tagline: 'plecionki + zieleń',
      description:
        'Sofy w leniu, makramy, plecione lampy i perski dywan w rdzy. Salon pełen tekstur i roślin — naturalny i zapraszający.',
    },
    en: {
      title: 'Warm boho',
      tagline: 'woven layers + plants',
      description:
        'Linen sofas, macramé, woven pendants, and a rust-toned Persian rug. Textured, plant-filled, and naturally inviting.',
    },
  },
  {
    file: 'image (29).webp',
    styleGroup: 'japandi',
    pl: {
      title: 'Japandi z lampionem',
      tagline: 'zen + len',
      description:
        'Papierowy lampion, leniana sofa i trawa morska na podłodze. Proste formy i ciepłe światło jak w japońskim pensjonacie.',
    },
    en: {
      title: 'Japandi paper lantern',
      tagline: 'zen + linen',
      description:
        'A paper lantern, linen sofa, and sisal underfoot. Simple silhouettes and warm light with a quiet, meditative feel.',
    },
  },
  {
    file: 'image (30).webp',
    styleGroup: 'midcentury',
    pl: {
      title: 'Mid-century w oliwkach',
      tagline: 'ikony designu',
      description:
        'Zielona sofa na łuku, fotel z podnóżkiem i stolik Noguchi. Geometria dywanu i duże okna — retro, ale świeże.',
    },
    en: {
      title: 'Mid-century in olive',
      tagline: 'iconic pieces',
      description:
        'Curved olive sofa, lounge chair with ottoman, and a Noguchi table. Geometric rug and tall glass — retro yet fresh.',
    },
  },
  {
    file: 'image (31).webp',
    styleGroup: 'midcentury',
    pl: {
      title: 'Mid-century glamour',
      tagline: 'rdza + mosiądz',
      description:
        'Musztardowe Eamesy, sofa w rdzy i żyrandol Sputnik. Abstrakcja nad sofą i złote detale — salon jak z katalogu premium.',
    },
    en: {
      title: 'Mid-century glamour',
      tagline: 'rust + brass',
      description:
        'Mustard Eames chairs, a rust curved sofa, and a Sputnik chandelier. Bold abstract art and brass accents for a premium lounge.',
    },
  },
  {
    file: 'image (32).webp',
    styleGroup: 'artdeco',
    pl: {
      title: 'Art déco w granacie',
      tagline: 'geometria + aksamit',
      description:
        'Granatowy aksamit, złote ramy i tapeta w wachlarze. Marmur na stoliku i kryształowe żyrandole — teatralna elegancja.',
    },
    en: {
      title: 'Navy Art Deco',
      tagline: 'geometry + velvet',
      description:
        'Navy velvet, gold frames, and fan-pattern wallpaper. Marble coffee table and tiered chandeliers for theatrical glamour.',
    },
  },
  {
    file: 'image (34).webp',
    styleGroup: 'eclectic',
    pl: {
      title: 'Ekletyczna galeria',
      tagline: 'maksymalizm z gustem',
      description:
        'Turkusowa sofa, marmur ze złotem i ściana pełna obrazów. Skórzane fotele i zasłony z weluru — kolekcjonerski charakter.',
    },
    en: {
      title: 'Eclectic gallery wall',
      tagline: 'curated maximalism',
      description:
        'Teal velvet, marble with brass, and a dense art wall. Leather chairs and velvet drapes — collector energy, polished layout.',
    },
  },
  {
    file: 'image (35).webp',
    styleGroup: 'maximalist',
    pl: {
      title: 'Maksymalizm barwny',
      tagline: 'sztuka + aksamit',
      description:
        'Kolorowe sofy, gęsta galeria i orientalny dywan. Mnóstwo lamp, luster i tekstyliów — wnętrze jak salon artysty.',
    },
    en: {
      title: 'Colorful maximalism',
      tagline: 'art + velvet',
      description:
        'Multi-tone sofas, a packed gallery wall, and a rich oriental rug. Lamps, mirrors, textiles — an artist’s living salon.',
    },
  },
  {
    file: 'image (36).webp',
    styleGroup: 'rustic',
    pl: {
      title: 'Rustykalna oaza',
      tagline: 'kamień + kominek',
      description:
        'Sparowane belki, kamienna ściana i żywy ogień. Len, skóra i ceramika — śródziemnomorski spokój z domowym ciepłem.',
    },
    en: {
      title: 'Rustic hearth',
      tagline: 'stone + firelight',
      description:
        'Heavy beams, stone walls, and a live fire. Linen, leather, and ceramics — Mediterranean calm with homey warmth.',
    },
  },
  {
    file: 'image-1778252578996.webp',
    styleGroup: 'industrial',
    pl: {
      title: 'Loft z dziedzictwem',
      tagline: 'industrial + jadalnia',
      description:
        'Chesterfield, fotele aviator i długi stół z blatem live-edge. Regał z pamiątkami i beton na podłodze — loft na co dzień.',
    },
    en: {
      title: 'Heritage loft',
      tagline: 'industrial + dining',
      description:
        'Chesterfield, aviator chairs, and a live-edge dining table. Grid shelving, vintage finds, and polished concrete floors.',
    },
  },
  {
    file: 'image-1778252586664.webp',
    styleGroup: 'japandi',
    pl: {
      title: 'Japandi z oliwką',
      tagline: 'tryptyk + rattan',
      description:
        'Szara sofa modułowa, oliwkowy fotel i komoda z plecionką. Abstrakcja w tynku i okrągłe lustro — spokój premium.',
    },
    en: {
      title: 'Japandi olive accent',
      tagline: 'triptych + cane',
      description:
        'Grey modular sofa, olive velvet chair, and cane-front credenza. Plaster triptych and a round mirror for quiet luxury.',
    },
  },
  {
    file: 'image-1778601599152.webp',
    styleGroup: 'industrial',
    pl: {
      title: 'Loft na betonie',
      tagline: 'skóra + surowe ściany',
      description:
        'Szorstki beton, rury wentylacyjne i sofa w przeciągniętej skórze. Industrialna sztuka na ścianie i lampa na łańcuchu.',
    },
    en: {
      title: 'Concrete loft lounge',
      tagline: 'leather + raw walls',
      description:
        'Textured concrete, exposed ducting, and distressed leather seating. Industrial wall art and a chain-hung chandelier.',
    },
  },
  {
    file: 'image-1778601603837.webp',
    styleGroup: 'mediterranean',
    pl: {
      title: 'Ciepłe Morze',
      tagline: 'terakota + len',
      description:
        'Ściany w odcieniu gliny, mapa nad komodą i ceramiczne lampy. Dywan w stylu orientalnym i cytrusy na stole — wakacyjny klimat.',
    },
    en: {
      title: 'Warm Mediterranean',
      tagline: 'terracotta + linen',
      description:
        'Clay-toned walls, a framed map, and ceramic lamps. Oriental rug and lemons on the table — sun-soaked coastal calm.',
    },
  },
  {
    file: 'image-1778601611152.webp',
    styleGroup: 'artdeco',
    pl: {
      title: 'Art déco szmaragd',
      tagline: 'złoto + welur',
      description:
        'Zielona sofa na łuku, komoda ze słonecznym fornirem i żyrandol ze szkła. Ciemna tapeta i czarny blat — kinowy glamur.',
    },
    en: {
      title: 'Emerald Art Deco',
      tagline: 'gold + velvet',
      description:
        'Curved emerald sofa, sunburst wood buffet, and frosted-glass chandelier. Moody wallpaper and black accents for cinematic glam.',
    },
  },
  {
    file: 'image-1778601624564.webp',
    styleGroup: 'mediterranean',
    pl: {
      title: 'Mieszkanie nad Morzem',
      tagline: 'open space + turkus',
      description:
        'Turkusowa sofa, terakotowe fotele i stół dębowy z jadalnią w tle. Tapiseria, złoty żyrandol i widok na ogród z lawendą.',
    },
    en: {
      title: 'Mediterranean living',
      tagline: 'open plan + teal',
      description:
        'Teal sofa, terracotta chairs, and oak dining beyond. Tapestry, brass chandelier, and garden views with lavender rows.',
    },
  },
  {
    file: 'image-1778601632272.webp',
    styleGroup: 'midcentury',
    pl: {
      title: 'Retro mid-century',
      tagline: 'morski + musztarda',
      description:
        'Sofa w morskim kolorze, musztardowe aksamitne fotele i geometryczny dywan. Rzeźbiona komoda i mosiężny żyrandol.',
    },
    en: {
      title: 'Retro mid-century',
      tagline: 'teal + mustard',
      description:
        'Teal sofa, mustard velvet chairs, and a geometric rug. Carved credenza and brass globe lighting for a playful retro core.',
    },
  },
  {
    file: 'image-1778601676445.webp',
    styleGroup: 'japandi',
    pl: {
      title: 'Japandi open plan',
      tagline: 'cegła + wishbone',
      description:
        'Szara sofa, stół z krzesłami Wishbone i ceglany akcent za jadalnią. Lustra, drewno i rośliny — funkcja i spokój w jednym.',
    },
    en: {
      title: 'Japandi open plan',
      tagline: 'brick + wishbone',
      description:
        'Grey sofa, wishbone dining chairs, and a brick accent behind the table. Mirrors, oak, and plants — calm utility in one space.',
    },
  },
];

export const HERO_INTERIOR_SLIDES: readonly HeroInteriorSlide[] =
  orderSlidesAvoidingAdjacentStyle([...HERO_INTERIOR_SLIDES_RAW]);
