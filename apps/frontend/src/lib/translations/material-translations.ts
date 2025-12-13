// Material name translations for dashboard display

export const MATERIAL_TRANSLATIONS: Record<string, { pl: string; en: string }> = {
  // Basic materials
  'wood': { pl: 'Drewno', en: 'Wood' },
  'oak': { pl: 'Dąb', en: 'Oak' },
  'birch': { pl: 'Brzoza', en: 'Birch' },
  'bamboo': { pl: 'Bambus', en: 'Bamboo' },
  'stone': { pl: 'Kamień', en: 'Stone' },
  'marble': { pl: 'Marmur', en: 'Marble' },
  'concrete': { pl: 'Beton', en: 'Concrete' },
  'metal': { pl: 'Metal', en: 'Metal' },
  'steel': { pl: 'Stal', en: 'Steel' },
  'brass': { pl: 'Mosiądz', en: 'Brass' },
  'copper': { pl: 'Miedź', en: 'Copper' },
  'chrome': { pl: 'Chrom', en: 'Chrome' },
  
  // Textiles
  'linen': { pl: 'Len', en: 'Linen' },
  'cotton': { pl: 'Bawełna', en: 'Cotton' },
  'wool': { pl: 'Wełna', en: 'Wool' },
  'leather': { pl: 'Skóra', en: 'Leather' },
  'velvet': { pl: 'Aksamit', en: 'Velvet' },
  'silk': { pl: 'Jedwab', en: 'Silk' },
  
  // Natural materials
  'rattan': { pl: 'Rattan', en: 'Rattan' },
  'jute': { pl: 'Juta', en: 'Jute' },
  'wicker': { pl: 'Wiklinowe', en: 'Wicker' },
  'driftwood': { pl: 'Dryfujące drewno', en: 'Driftwood' },
  
  // Other
  'glass': { pl: 'Szkło', en: 'Glass' },
  'ceramic': { pl: 'Ceramika', en: 'Ceramic' },
  'plastic': { pl: 'Plastik', en: 'Plastic' },
  'adobe': { pl: 'Gliniane', en: 'Adobe' },
  'live_edge': { pl: 'Drewno surowe', en: 'Live edge' },
  'raw': { pl: 'Surowy', en: 'Raw' },
  'unfinished': { pl: 'Niefinirowany', en: 'Unfinished' },
};

// Color name translations for dashboard display
export const COLOR_TRANSLATIONS: Record<string, { pl: string; en: string }> = {
  // Basic colors
  'white': { pl: 'Biały', en: 'White' },
  'beige': { pl: 'Beżowy', en: 'Beige' },
  'grey': { pl: 'Szary', en: 'Grey' },
  'gray': { pl: 'Szary', en: 'Gray' },
  'black': { pl: 'Czarny', en: 'Black' },
  'charcoal': { pl: 'Węglowy', en: 'Charcoal' },
  'cream': { pl: 'Kremowy', en: 'Cream' },
  
  // Greens
  'green': { pl: 'Zielony', en: 'Green' },
  'sage': { pl: 'Szałwiowy', en: 'Sage' },
  'mint': { pl: 'Miętowy', en: 'Mint' },
  'forest': { pl: 'Leśny', en: 'Forest' },
  'avocado': { pl: 'Awokado', en: 'Avocado' },
  
  // Blues
  'blue': { pl: 'Niebieski', en: 'Blue' },
  'ocean': { pl: 'Oceaniczny', en: 'Ocean' },
  'navy': { pl: 'Granatowy', en: 'Navy' },
  'turquoise': { pl: 'Turkusowy', en: 'Turquoise' },
  'teal': { pl: 'Morski', en: 'Teal' },
  
  // Pinks/Red
  'pink': { pl: 'Różowy', en: 'Pink' },
  'blush': { pl: 'Różowy pudrowy', en: 'Blush' },
  'red': { pl: 'Czerwony', en: 'Red' },
  'burgundy': { pl: 'Bordowy', en: 'Burgundy' },
  'coral': { pl: 'Koralowy', en: 'Coral' },
  
  // Yellows/Oranges
  'yellow': { pl: 'Żółty', en: 'Yellow' },
  'gold': { pl: 'Złoty', en: 'Gold' },
  'mustard': { pl: 'Musztardowy', en: 'Mustard' },
  'orange': { pl: 'Pomarańczowy', en: 'Orange' },
  'peach': { pl: 'Brzoskwiniowy', en: 'Peach' },
  
  // Purples
  'lavender': { pl: 'Lawendowy', en: 'Lavender' },
  'purple': { pl: 'Fioletowy', en: 'Purple' },
  
  // Browns
  'brown': { pl: 'Brązowy', en: 'Brown' },
  'tan': { pl: 'Opalony', en: 'Tan' },
  
  // Metallic/Special
  'silver': { pl: 'Srebrny', en: 'Silver' },
  
  // Descriptive
  'pastel': { pl: 'Pastelowy', en: 'Pastel' },
  'jewel': { pl: 'Szlachetny', en: 'Jewel' },
  'tones': { pl: 'Tonalności', en: 'Tones' },
  'jewel_tones': { pl: 'Tonalności szlachetne', en: 'Jewel tones' },
  'earth': { pl: 'Ziemisty', en: 'Earth' },
  'clay': { pl: 'Gliniany', en: 'Clay' },
  'muted': { pl: 'Stonowany', en: 'Muted' },
  'sand': { pl: 'Piaskowy', en: 'Sand' },
  'terracotta': { pl: 'Terakota', en: 'Terracotta' },
  'neutral': { pl: 'Neutralny', en: 'Neutral' },
  'natural': { pl: 'Naturalny', en: 'Natural' },
  'warm': { pl: 'Ciepły', en: 'Warm' },
  'cool': { pl: 'Chłodny', en: 'Cool' },
  'deep': { pl: 'Głęboki', en: 'Deep' },
  'rich': { pl: 'Bogaty', en: 'Rich' },
  'rainbow': { pl: 'Tęczowy', en: 'Rainbow' },
};

/**
 * Translate a material name to the target language
 */
export function translateMaterial(material: string, language: 'pl' | 'en' = 'pl'): string {
  if (!material) return material;
  
  const normalized = material.toLowerCase().trim();
  const translation = MATERIAL_TRANSLATIONS[normalized];
  
  if (translation) {
    return translation[language];
  }
  
  // If no translation found, return capitalized original
  return material.charAt(0).toUpperCase() + material.slice(1).toLowerCase();
}

/**
 * Translate a color name to the target language
 */
export function translateColor(color: string, language: 'pl' | 'en' = 'pl'): string {
  if (!color) return color;
  
  const normalized = color.toLowerCase().trim();
  const translation = COLOR_TRANSLATIONS[normalized];
  
  if (translation) {
    return translation[language];
  }
  
  // If no translation found, return capitalized original
  return color.charAt(0).toUpperCase() + color.slice(1).toLowerCase();
}

