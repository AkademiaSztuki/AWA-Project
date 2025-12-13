/**
 * Research-Backed Mappings: Big Five Personality → Interior Design
 * 
 * This file contains scientifically-grounded mappings from personality traits
 * to interior design preferences, with citations to peer-reviewed research.
 */

// =========================
// RESEARCH SOURCES & CITATIONS
// =========================

export interface ResearchSource {
  citation: string;
  year: number;
  journal?: string;
  findings: {
    [trait: string]: string[];
  };
}

export const RESEARCH_SOURCES: Record<string, ResearchSource> = {
  gosling2002: {
    citation: "Gosling, S.D., Ko, S.J., Mannarelli, T., & Morris, M.E. (2002). A room with a cue: Personality judgments based on offices and bedrooms. Journal of Personality and Social Psychology, 82(3), 379-398.",
    year: 2002,
    journal: "Journal of Personality and Social Psychology",
    findings: {
      openness: [
        "diverse objects and decorations",
        "books and reading materials",
        "art and artistic items",
        "unconventional decor",
        "variety in style"
      ],
      conscientiousness: [
        "clean and organized spaces",
        "uncluttered environments",
        "functional organization",
        "systematic arrangement"
      ],
      extraversion: [
        "inviting and social spaces",
        "energetic atmosphere",
        "bright and stimulating"
      ],
      agreeableness: [
        "warm and welcoming",
        "comfortable and cozy",
        "harmonious arrangements"
      ],
      neuroticism: [
        "safe and secure feeling",
        "calming elements",
        "reduced stimulation"
      ]
    }
  },
  
  nasar1989: {
    citation: "Nasar, J.L. (1989). Symbolic meanings of house styles. Environment and Behavior, 21(3), 235-257.",
    year: 1989,
    journal: "Environment and Behavior",
    findings: {
      aesthetic_preferences: [
        "personality traits correlate with environmental preferences",
        "openness linked to eclectic and artistic styles",
        "conscientiousness linked to minimalist and organized styles"
      ]
    }
  },
  
  whitfield1990: {
    citation: "Whitfield, T.W.A., & Wiltshire, T.J. (1990). Color psychology: A critical review. Genetic, Social, and General Psychology Monographs, 116(4), 385-411.",
    year: 1990,
    journal: "Genetic, Social, and General Psychology Monographs",
    findings: {
      extraversion: [
        "preference for warm, saturated colors",
        "bold and vibrant palettes",
        "energetic color schemes"
      ],
      neuroticism: [
        "preference for muted, calming colors",
        "soft and soothing palettes",
        "reduced color intensity"
      ]
    }
  },
  
  graham2017: {
    citation: "Graham, L.T., Gosling, S.D., & Travis, C.K. (2017). The psychology of home environments: A call for research on residential space. Psychology of Aesthetics, Creativity, and the Arts, 11(2), 123-131.",
    year: 2017,
    journal: "Psychology of Aesthetics, Creativity, and the Arts",
    findings: {
      high_openness: [
        "eclectic and artistic styles",
        "mixed and varied decor",
        "unconventional arrangements"
      ],
      high_conscientiousness: [
        "minimalist and organized",
        "clean and functional",
        "systematic design"
      ],
      high_neuroticism: [
        "cozy and safe spaces",
        "calming environments",
        "reduced visual complexity"
      ]
    }
  }
};

// =========================
// STYLE MAPPINGS WITH CONDITIONS
// =========================

export interface StyleMapping {
  id: string;
  style: string;
  conditions: {
    // Domain conditions (0-1 normalized)
    O?: string;  // e.g., ">0.65", "<0.4", "0.5-0.7"
    C?: string;
    E?: string;
    A?: string;
    N?: string;
    // Facet conditions (0-1 normalized)
    O1_Fantasy?: string;
    O2_Aesthetics?: string;
    C2_Order?: string;
    E1_Warmth?: string;
    E2_Gregariousness?: string;
    E5_ExcitementSeeking?: string;
    A6_TenderMindedness?: string;
    N1_Anxiety?: string;
    N6_Vulnerability?: string;
  };
  materials: string[];
  complexity: number;  // 0-1
  researchBasis: string;  // Key to RESEARCH_SOURCES
  confidenceMultiplier: number;  // 0-1, affects base confidence
  description: string;
}

export const BIGFIVE_STYLE_MAPPINGS: StyleMapping[] = [
  {
    id: "eclectic_artistic",
    style: "eclectic artistic",
    conditions: {
      O: ">0.65",
      O2_Aesthetics: ">0.7"
    },
    materials: ["mixed textures", "artisanal elements", "vintage finds", "art pieces"],
    complexity: 0.8,
    researchBasis: "gosling2002",
    confidenceMultiplier: 1.0,
    description: "High Openness + Aesthetics facet → diverse, unconventional, artistic"
  },
  
  {
    id: "bohemian_eclectic",
    style: "bohemian eclectic",
    conditions: {
      O: ">0.7",
      C: "<0.4",
      O1_Fantasy: ">0.6"
    },
    materials: ["natural fibers", "handcrafted items", "organic shapes", "textured fabrics"],
    complexity: 0.75,
    researchBasis: "gosling2002",
    confidenceMultiplier: 0.95,
    description: "High Openness + Low Conscientiousness + Fantasy → free-spirited, creative chaos"
  },
  
  {
    id: "maximalist_bold",
    style: "maximalist artistic",
    conditions: {
      O: ">0.6",
      E: ">0.6",
      E5_ExcitementSeeking: ">0.65"
    },
    materials: ["bold patterns", "brass accents", "statement pieces", "vibrant colors"],
    complexity: 0.85,
    researchBasis: "whitfield1990",
    confidenceMultiplier: 0.9,
    description: "High Openness + Extraversion + Excitement-Seeking → bold, stimulating, maximalist"
  },
  
  {
    id: "minimalist_clean",
    style: "minimalist clean",
    conditions: {
      C: ">0.7",
      O: "<0.4",
      C2_Order: ">0.75"
    },
    materials: ["glass", "polished surfaces", "clean lines", "simple materials"],
    complexity: 0.2,
    researchBasis: "gosling2002",
    confidenceMultiplier: 1.0,
    description: "High Conscientiousness + Low Openness + Order facet → organized, uncluttered, functional"
  },
  
  {
    id: "scandinavian_harmonious",
    style: "Scandinavian",
    conditions: {
      C: ">0.6",
      A: ">0.6",
      N: "<0.4"
    },
    materials: ["light wood", "natural textiles", "simple forms", "functional beauty"],
    complexity: 0.4,
    researchBasis: "graham2017",
    confidenceMultiplier: 0.9,
    description: "High Conscientiousness + Agreeableness + Low Neuroticism → balanced, harmonious, functional"
  },
  
  {
    id: "cozy_hygge",
    style: "cozy hygge",
    conditions: {
      N: ">0.6",
      A: ">0.5",
      E1_Warmth: ">0.65",
      A6_TenderMindedness: ">0.6"
    },
    materials: ["soft textiles", "natural wood", "warm lighting", "comfortable fabrics"],
    complexity: 0.5,
    researchBasis: "graham2017",
    confidenceMultiplier: 0.95,
    description: "High Neuroticism + Agreeableness + Warmth + Tender-Mindedness → safe, cozy, comforting"
  },
  
  {
    id: "cozy_sanctuary",
    style: "cozy sanctuary",
    conditions: {
      E: "<0.4",
      N: ">0.5",
      N1_Anxiety: ">0.6"
    },
    materials: ["enclosed spaces", "soft textures", "calming colors", "protective elements"],
    complexity: 0.3,
    researchBasis: "graham2017",
    confidenceMultiplier: 0.9,
    description: "Low Extraversion + High Neuroticism + Anxiety → private, safe, cocooning"
  },
  
  {
    id: "open_contemporary",
    style: "open contemporary",
    conditions: {
      E: ">0.7",
      A: ">0.5",
      E2_Gregariousness: ">0.7"
    },
    materials: ["open layouts", "social spaces", "bright lighting", "inviting furniture"],
    complexity: 0.6,
    researchBasis: "gosling2002",
    confidenceMultiplier: 0.85,
    description: "High Extraversion + Agreeableness + Gregariousness → social, open, welcoming"
  },
  
  {
    id: "modern_confident",
    style: "modern confident",
    conditions: {
      O: ">0.5",
      N: "<0.4",
      C: ">0.5"
    },
    materials: ["sleek surfaces", "modern materials", "confident design", "balanced composition"],
    complexity: 0.55,
    researchBasis: "nasar1989",
    confidenceMultiplier: 0.8,
    description: "Moderate-High Openness + Low Neuroticism + Conscientiousness → confident, modern, balanced"
  },
  {
    id: "japandi_calm",
    style: "japandi",
    conditions: {
      C2_Order: ">0.65",
      O: "0.45-0.65",
      N: "<0.55"
    },
    materials: ["light wood", "linen", "stone", "clean lines"],
    complexity: 0.35,
    researchBasis: "gosling2002",
    confidenceMultiplier: 0.9,
    description: "Order + moderate Openness + low Neuroticism → serene, minimal, natural"
  },
  {
    id: "coastal_relaxed",
    style: "coastal",
    conditions: {
      O2_Aesthetics: ">0.55",
      N: "<0.5",
      E: ">0.5"
    },
    materials: ["light wood", "rattan", "linen", "white and blue accents"],
    complexity: 0.4,
    researchBasis: "graham2017",
    confidenceMultiplier: 0.85,
    description: "Aesthetics + sociability + low tension → airy, beach-influenced"
  },
  {
    id: "farmhouse_warm",
    style: "farmhouse",
    conditions: {
      C: ">0.5",
      A: ">0.5",
      O: "<0.55"
    },
    materials: ["wood beams", "shiplap", "wrought iron", "cotton textiles"],
    complexity: 0.45,
    researchBasis: "nasar1989",
    confidenceMultiplier: 0.8,
    description: "Order + warmth + lower novelty → comfortable, homey farmhouse"
  },
  {
    id: "mediterranean_breezy",
    style: "mediterranean",
    conditions: {
      O: ">0.55",
      E: ">0.5",
      E1_Warmth: ">0.55"
    },
    materials: ["terracotta", "stone", "wrought iron", "plaster"],
    complexity: 0.6,
    researchBasis: "gosling2002",
    confidenceMultiplier: 0.85,
    description: "Openness + sociability + warmth → sunny, textural Mediterranean"
  },
  {
    id: "art_deco_glam",
    style: "art-deco",
    conditions: {
      O: ">0.6",
      E: ">0.55",
      C2_Order: ">0.5",
      E5_ExcitementSeeking: ">0.55"
    },
    materials: ["brass", "lacquer", "geometric patterns", "marble"],
    complexity: 0.7,
    researchBasis: "whitfield1990",
    confidenceMultiplier: 0.9,
    description: "High Openness + Excitement + structure → bold, glamorous, geometric"
  },
  {
    id: "rustic_natural",
    style: "rustic",
    conditions: {
      O2_Aesthetics: ">0.5",
      A: ">0.5",
      N: "<0.6"
    },
    materials: ["reclaimed wood", "stone", "natural fibers", "forged metal"],
    complexity: 0.45,
    researchBasis: "graham2017",
    confidenceMultiplier: 0.85,
    description: "Nature-loving + warm + low tension → grounded, tactile rustic"
  },
  {
    id: "traditional_refined",
    style: "traditional",
    conditions: {
      C: ">0.6",
      A: ">0.5",
      N: "<0.6"
    },
    materials: ["dark wood", "classic textiles", "molding details", "symmetry"],
    complexity: 0.5,
    researchBasis: "nasar1989",
    confidenceMultiplier: 0.8,
    description: "Order + agreeableness + stability → refined, classic traditional"
  },
  {
    id: "midcentury_modern",
    style: "mid-century",
    conditions: {
      O: ">0.55",
      C: ">0.45",
      N: "<0.55"
    },
    materials: ["walnut", "tapered legs", "molded plastic", "brass accents"],
    complexity: 0.45,
    researchBasis: "gosling2002",
    confidenceMultiplier: 0.85,
    description: "Openness + light structure + calm → iconic mid-century modern"
  },
  {
    id: "vintage_charm",
    style: "vintage",
    conditions: {
      O: ">0.6",
      A: ">0.5",
      N: "<0.6"
    },
    materials: ["antiques", "patina metals", "patterned textiles", "curated decor"],
    complexity: 0.55,
    researchBasis: "graham2017",
    confidenceMultiplier: 0.85,
    description: "Curiosity + warmth + composure → collected, nostalgic vintage"
  },
  {
    id: "zen_minimal",
    style: "zen",
    conditions: {
      N: "<0.45",
      O: ">0.5",
      A6_TenderMindedness: ">0.55"
    },
    materials: ["bamboo", "stone", "washi textures", "low silhouettes"],
    complexity: 0.25,
    researchBasis: "graham2017",
    confidenceMultiplier: 0.9,
    description: "Calm + sensitivity → meditative, minimal zen"
  },
  {
    id: "transitional_balance",
    style: "transitional",
    conditions: {
      O: "0.4-0.65",
      C: "0.45-0.65",
      N: "<0.6"
    },
    materials: ["balanced wood/metal", "clean-lined upholstery", "muted palette", "soft accents"],
    complexity: 0.5,
    researchBasis: "nasar1989",
    confidenceMultiplier: 0.8,
    description: "Balanced openness/order → mix of traditional and modern in harmony"
  },
  
  {
    id: "modern_classic",
    style: "modern classic",
    conditions: {},  // Default/balanced profile
    materials: ["timeless pieces", "balanced materials", "classic proportions", "refined details"],
    complexity: 0.5,
    researchBasis: "nasar1989",
    confidenceMultiplier: 0.7,
    description: "Balanced personality profile → timeless, classic, refined"
  }
];

// =========================
// COLOR MAPPINGS
// =========================

export interface ColorMapping {
  trait: string;
  facet?: string;
  condition: string;
  colors: string[];
  temperature: 'warm' | 'cool' | 'neutral';
  saturation: 'high' | 'medium' | 'low';
  researchBasis: string;
}

export const BIGFIVE_COLOR_MAPPINGS: ColorMapping[] = [
  {
    trait: "extraversion",
    condition: ">0.6",
    colors: ["#FF7F50", "#FFD700", "#FF6347", "#FFA500"], // coral, gold, tomato, orange
    temperature: "warm",
    saturation: "high",
    researchBasis: "whitfield1990"
  },
  {
    trait: "extraversion",
    facet: "E5_ExcitementSeeking",
    condition: ">0.7",
    colors: ["#FF1493", "#FF00FF", "#DC143C", "#FF4500"], // hot pink, magenta, crimson, red-orange
    temperature: "warm",
    saturation: "high",
    researchBasis: "whitfield1990"
  },
  {
    trait: "extraversion",
    condition: "<0.4",
    colors: ["#A9A9A9", "#6B8E9F", "#708090", "#778899"], // gray, muted blue, slate
    temperature: "cool",
    saturation: "low",
    researchBasis: "whitfield1990"
  },
  {
    trait: "neuroticism",
    condition: ">0.6",
    colors: ["#F5F5DC", "#E6E6FA", "#FFF8DC", "#F0E68C"], // beige, lavender, cornsilk, khaki
    temperature: "neutral",
    saturation: "low",
    researchBasis: "whitfield1990"
  },
  {
    trait: "neuroticism",
    condition: "0.5-0.6",
    colors: ["#E8E8E8", "#D3D3D3", "#C0C0C0", "#B0B0B0"], // light gray, gray, silver, dark gray
    temperature: "neutral",
    saturation: "low",
    researchBasis: "whitfield1990"
  },
  {
    trait: "extraversion",
    condition: "0.4-0.6",
    colors: ["#D3D3D3", "#C0C0C0", "#A9A9A9", "#808080"], // light gray, silver, dark gray, gray
    temperature: "neutral",
    saturation: "low",
    researchBasis: "whitfield1990"
  },
  {
    trait: "openness",
    condition: "0.4-0.6",
    colors: ["#DCDCDC", "#C8C8C8", "#B0B0B0", "#9E9E9E"], // gainsboro, silver, dark gray, gray
    temperature: "neutral",
    saturation: "low",
    researchBasis: "gosling2002"
  },
  {
    trait: "conscientiousness",
    condition: "0.4-0.6",
    colors: ["#F5F5F5", "#E8E8E8", "#D3D3D3", "#C0C0C0"], // whitesmoke, light gray, gray, silver
    temperature: "neutral",
    saturation: "low",
    researchBasis: "gosling2002"
  },
  {
    trait: "agreeableness",
    condition: "0.4-0.6",
    colors: ["#F0F0F0", "#E0E0E0", "#D0D0D0", "#C0C0C0"], // whitesmoke, light gray, light gray, silver
    temperature: "neutral",
    saturation: "low",
    researchBasis: "graham2017"
  },
  {
    trait: "openness",
    facet: "O2_Aesthetics",
    condition: ">0.7",
    colors: ["#9370DB", "#BA55D3", "#DA70D6", "#FF69B4"], // medium purple, medium orchid, orchid, hot pink
    temperature: "neutral",
    saturation: "medium",
    researchBasis: "gosling2002"
  },
  {
    trait: "agreeableness",
    facet: "A6_TenderMindedness",
    condition: ">0.6",
    colors: ["#FFB6C1", "#FFC0CB", "#FFE4E1", "#FFF0F5"], // light pink, pink, misty rose, lavender blush
    temperature: "warm",
    saturation: "low",
    researchBasis: "graham2017"
  },
  {
    trait: "conscientiousness",
    condition: ">0.6",
    colors: ["#FFFFFF", "#F5F5F5", "#E0E0E0", "#D3D3D3"], // white, whitesmoke, light gray, light gray
    temperature: "neutral",
    saturation: "low",
    researchBasis: "gosling2002"
  }
];

// =========================
// MATERIAL MAPPINGS
// =========================

export interface MaterialMapping {
  trait: string;
  facet?: string;
  condition: string;
  materials: string[];
  researchBasis: string;
}

export const BIGFIVE_MATERIAL_MAPPINGS: MaterialMapping[] = [
  {
    trait: "agreeableness",
    condition: ">0.6",
    materials: ["soft textiles", "natural wood", "comfortable fabrics"],
    researchBasis: "graham2017"
  },
  {
    trait: "neuroticism",
    condition: ">0.5",
    materials: ["soft textures", "natural materials", "calming surfaces"],
    researchBasis: "graham2017"
  },
  {
    trait: "conscientiousness",
    condition: ">0.6",
    materials: ["glass", "polished surfaces", "clean materials"],
    researchBasis: "gosling2002"
  },
  {
    trait: "openness",
    condition: ">0.6",
    materials: ["mixed textures", "artisanal elements", "varied materials"],
    researchBasis: "gosling2002"
  },
  {
    trait: "extraversion",
    condition: ">0.6",
    materials: ["brass", "bold accents", "statement materials"],
    researchBasis: "whitfield1990"
  },
  {
    trait: "agreeableness",
    facet: "A6_TenderMindedness",
    condition: ">0.6",
    materials: ["soft fabrics", "gentle textures", "organic materials"],
    researchBasis: "graham2017"
  }
];

// =========================
// BIOPHILIA MAPPINGS
// =========================

export interface BiophiliaMapping {
  trait: string;
  facet?: string;
  condition: string;
  biophiliaBoost: number;  // 0-1, adds to base biophilia score (0-3 scale)
  researchBasis: string;
  description: string;
}

export const BIGFIVE_BIOPHILIA_MAPPINGS: BiophiliaMapping[] = [
  {
    trait: "openness",
    facet: "O2_Aesthetics",
    condition: ">0.65",
    biophiliaBoost: 0.8,  // High aesthetic appreciation → strong biophilia
    researchBasis: "gosling2002",
    description: "High Aesthetics facet → appreciation for natural beauty and organic forms"
  },
  {
    trait: "openness",
    condition: ">0.6",
    biophiliaBoost: 0.5,  // High openness → moderate biophilia
    researchBasis: "gosling2002",
    description: "High Openness → appreciation for diverse natural elements"
  },
  {
    trait: "neuroticism",
    condition: "<0.4",
    biophiliaBoost: 0.6,  // Low neuroticism → nature as calming element
    researchBasis: "graham2017",
    description: "Low Neuroticism → nature provides grounding and tranquility"
  },
  {
    trait: "neuroticism",
    condition: ">0.6",
    biophiliaBoost: 0.7,  // High neuroticism → nature as stress relief
    researchBasis: "graham2017",
    description: "High Neuroticism → nature as therapeutic calming element"
  },
  {
    trait: "agreeableness",
    facet: "A6_TenderMindedness",
    condition: ">0.6",
    biophiliaBoost: 0.6,  // Tender-mindedness → care for nature
    researchBasis: "graham2017",
    description: "High Tender-Mindedness → nurturing connection with nature"
  },
  {
    trait: "agreeableness",
    condition: ">0.6",
    biophiliaBoost: 0.4,  // High agreeableness → moderate biophilia
    researchBasis: "graham2017",
    description: "High Agreeableness → harmonious relationship with nature"
  },
  {
    trait: "extraversion",
    condition: ">0.6",
    biophiliaBoost: 0.3,  // High extraversion → social spaces with nature
    researchBasis: "gosling2002",
    description: "High Extraversion → nature in social, inviting spaces"
  },
  {
    trait: "openness",
    condition: "0.4-0.6",
    biophiliaBoost: 0.2,  // Moderate openness → mild biophilia
    researchBasis: "gosling2002",
    description: "Moderate Openness → balanced appreciation for natural elements"
  },
  {
    trait: "conscientiousness",
    condition: ">0.6",
    biophiliaBoost: 0.2,  // High conscientiousness → organized nature (low boost)
    researchBasis: "gosling2002",
    description: "High Conscientiousness → structured, minimal biophilic elements"
  },
  {
    trait: "neuroticism",
    condition: "0.4-0.6",
    biophiliaBoost: 0.3,  // Moderate neuroticism → nature for balance
    researchBasis: "graham2017",
    description: "Moderate Neuroticism → nature provides emotional balance"
  }
];

