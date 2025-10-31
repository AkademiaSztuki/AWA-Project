// IPIP-NEO-120 Big Five Personality Test
// Based on Johnson's 120-item IPIP-NEO-PI-R
// Source: https://github.com/Alheimsins/b5-johnson-120-ipip-neo-pi-r
// Polish translation by Maryla Królikowska

import enQuestions from './neo-120-en.json';
import plQuestions from './neo-120-pl.json';

export interface IPIPNEOItem {
  id: string;
  text: {
    pl: string;
    en: string;
  };
  keyed: 'plus' | 'minus'; // plus = normal scoring, minus = reverse scoring
  domain: 'O' | 'C' | 'E' | 'A' | 'N'; // Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism
  facet: number; // 1-6 for each domain
}

export interface IPIPNEOScores {
  domains: {
    O: number; // Openness
    C: number; // Conscientiousness
    E: number; // Extraversion
    A: number; // Agreeableness
    N: number; // Neuroticism
  };
  facets: {
    O: { [key: number]: number }; // O1-O6
    C: { [key: number]: number }; // C1-C6
    E: { [key: number]: number }; // E1-E6
    A: { [key: number]: number }; // A1-A6
    N: { [key: number]: number }; // N1-N6
  };
}

// Merge questions with translations
export const IPIP_120_ITEMS: IPIPNEOItem[] = enQuestions.map((item: any, index: number) => ({
  id: item.id,
  text: {
    en: item.text,
    pl: plQuestions[index].text,
  },
  keyed: item.keyed,
  domain: item.domain,
  facet: item.facet,
}));

// Facet labels for all 30 facets
export const IPIP_FACET_LABELS = {
  O: {
    1: { pl: 'Fantazja', en: 'Fantasy' },
    2: { pl: 'Estetyka', en: 'Aesthetics' },
    3: { pl: 'Uczucia', en: 'Feelings' },
    4: { pl: 'Działania', en: 'Actions' },
    5: { pl: 'Idee', en: 'Ideas' },
    6: { pl: 'Wartości', en: 'Values' },
  },
  C: {
    1: { pl: 'Kompetencja', en: 'Competence' },
    2: { pl: 'Porządek', en: 'Order' },
    3: { pl: 'Poczucie obowiązku', en: 'Dutifulness' },
    4: { pl: 'Dążenie do osiągnięć', en: 'Achievement Striving' },
    5: { pl: 'Samodyscyplina', en: 'Self-Discipline' },
    6: { pl: 'Rozwaga', en: 'Deliberation' },
  },
  E: {
    1: { pl: 'Ciepło', en: 'Warmth' },
    2: { pl: 'Towarzyskość', en: 'Gregariousness' },
    3: { pl: 'Asertywność', en: 'Assertiveness' },
    4: { pl: 'Aktywność', en: 'Activity' },
    5: { pl: 'Poszukiwanie wrażeń', en: 'Excitement-Seeking' },
    6: { pl: 'Pozytywne emocje', en: 'Positive Emotions' },
  },
  A: {
    1: { pl: 'Zaufanie', en: 'Trust' },
    2: { pl: 'Uczciwość', en: 'Straightforwardness' },
    3: { pl: 'Altruizm', en: 'Altruism' },
    4: { pl: 'Ugodowość', en: 'Compliance' },
    5: { pl: 'Skromność', en: 'Modesty' },
    6: { pl: 'Delikatność', en: 'Tender-Mindedness' },
  },
  N: {
    1: { pl: 'Lęk', en: 'Anxiety' },
    2: { pl: 'Gniew', en: 'Anger' },
    3: { pl: 'Depresja', en: 'Depression' },
    4: { pl: 'Świadomość siebie', en: 'Self-Consciousness' },
    5: { pl: 'Nieumiarkowanie', en: 'Immoderation' },
    6: { pl: 'Podatność na stres', en: 'Vulnerability' },
  },
};

// Domain labels
export const IPIP_DOMAIN_LABELS = {
  O: { pl: 'Otwartość na Doświadczenia', en: 'Openness to Experience' },
  C: { pl: 'Sumienność', en: 'Conscientiousness' },
  E: { pl: 'Ekstrawersja', en: 'Extraversion' },
  A: { pl: 'Ugodowość', en: 'Agreeableness' },
  N: { pl: 'Neurotyczność', en: 'Neuroticism' },
};

// Calculate scores for both domains and facets
export function calculateIPIPNEO120Scores(responses: Record<string, number>): IPIPNEOScores {
  const scores = {
    domains: {
      O: 0,
      C: 0,
      E: 0,
      A: 0,
      N: 0,
    },
    facets: {
      O: {} as { [key: number]: number },
      C: {} as { [key: number]: number },
      E: {} as { [key: number]: number },
      A: {} as { [key: number]: number },
      N: {} as { [key: number]: number },
    },
  };

  const facetCounts = {
    O: {} as { [key: number]: number },
    C: {} as { [key: number]: number },
    E: {} as { [key: number]: number },
    A: {} as { [key: number]: number },
    N: {} as { [key: number]: number },
  };

  IPIP_120_ITEMS.forEach((item) => {
    const rawScore = responses[item.id] || 3; // Default to neutral (middle value)
    
    // Apply reverse scoring if needed
    let score = rawScore;
    if (item.keyed === 'minus') {
      // Reverse: 1->5, 2->4, 3->3, 4->2, 5->1
      score = 6 - rawScore;
    }
    
    // Domain scoring
    scores.domains[item.domain] += score;
    
    // Facet scoring
    if (!scores.facets[item.domain][item.facet]) {
      scores.facets[item.domain][item.facet] = 0;
    }
    if (!facetCounts[item.domain][item.facet]) {
      facetCounts[item.domain][item.facet] = 0;
    }
    scores.facets[item.domain][item.facet] += score;
    facetCounts[item.domain][item.facet] += 1;
  });

  // Normalize to 0-100 scale
  // 24 items per domain, max possible = 120 (24 * 5), min possible = 24 (24 * 1)
  // range = 96, so: ((score - 24) / 96) * 100
  Object.keys(scores.domains).forEach((domain) => {
    const domainKey = domain as keyof typeof scores.domains;
    const rawScore = scores.domains[domainKey];
    scores.domains[domainKey] = Math.round(((rawScore - 24) / 96) * 100);
  });

  // Normalize facets to 0-100 scale
  // 4 items per facet, max possible = 20 (4 * 5), min possible = 4 (4 * 1)
  // range = 16, so: ((score - 4) / 16) * 100
  Object.keys(scores.facets).forEach((domain) => {
    const domainKey = domain as keyof typeof scores.facets;
    Object.keys(scores.facets[domainKey]).forEach((facetNumStr) => {
      const facetNum = parseInt(facetNumStr);
      const rawScore = scores.facets[domainKey][facetNum];
      scores.facets[domainKey][facetNum] = Math.round(((rawScore - 4) / 16) * 100);
    });
  });

  return scores;
}

