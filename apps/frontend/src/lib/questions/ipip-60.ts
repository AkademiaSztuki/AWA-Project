// IPIP-60 Big Five Personality Test
// Based on International Personality Item Pool (IPIP) - 60 items
// Polish translations from official research sources

export interface IPIPItem {
  id: string;
  text: {
    pl: string;
    en: string;
  };
  reverse: boolean; // true if higher score = lower trait
  domain: 'openness' | 'conscientiousness' | 'extraversion' | 'agreeableness' | 'neuroticism';
  facet?: string; // specific sub-trait
}

export interface IPIPScores {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export const IPIP_60_ITEMS: IPIPItem[] = [
  // OPENNESS TO EXPERIENCE (12 items)
  {
    id: 'o1',
    text: {
      pl: 'Mam bogaty zasób słownictwa.',
      en: 'I have a rich vocabulary.'
    },
    reverse: false,
    domain: 'openness',
    facet: 'ideas'
  },
  {
    id: 'o2',
    text: {
      pl: 'Mam żywą wyobraźnię.',
      en: 'I have a vivid imagination.'
    },
    reverse: false,
    domain: 'openness',
    facet: 'fantasy'
  },
  {
    id: 'o3',
    text: {
      pl: 'Mam doskonałe pomysły.',
      en: 'I have excellent ideas.'
    },
    reverse: false,
    domain: 'openness',
    facet: 'ideas'
  },
  {
    id: 'o4',
    text: {
      pl: 'Szybko rozumiem różne sprawy.',
      en: 'I am quick to understand things.'
    },
    reverse: false,
    domain: 'openness',
    facet: 'ideas'
  },
  {
    id: 'o5',
    text: {
      pl: 'Używam trudnych słów.',
      en: 'I use difficult words.'
    },
    reverse: false,
    domain: 'openness',
    facet: 'ideas'
  },
  {
    id: 'o6',
    text: {
      pl: 'Poświęcam czas na refleksję.',
      en: 'I spend time reflecting on things.'
    },
    reverse: false,
    domain: 'openness',
    facet: 'ideas'
  },
  {
    id: 'o7',
    text: {
      pl: 'Jestem pełen pomysłów.',
      en: 'I am full of ideas.'
    },
    reverse: false,
    domain: 'openness',
    facet: 'ideas'
  },
  {
    id: 'o8',
    text: {
      pl: 'Mam trudności z rozumieniem abstrakcyjnych idei.',
      en: 'I have difficulty understanding abstract ideas.'
    },
    reverse: true,
    domain: 'openness',
    facet: 'ideas'
  },
  {
    id: 'o9',
    text: {
      pl: 'Nie jestem zainteresowany abstrakcyjnymi ideami.',
      en: 'I am not interested in abstract ideas.'
    },
    reverse: true,
    domain: 'openness',
    facet: 'ideas'
  },
  {
    id: 'o10',
    text: {
      pl: 'Nie mam dobrej wyobraźni.',
      en: 'I do not have a good imagination.'
    },
    reverse: true,
    domain: 'openness',
    facet: 'fantasy'
  },
  {
    id: 'o11',
    text: {
      pl: 'Mam trudności z wymyślaniem nowych rzeczy.',
      en: 'I have difficulty imagining things.'
    },
    reverse: true,
    domain: 'openness',
    facet: 'fantasy'
  },
  {
    id: 'o12',
    text: {
      pl: 'Nie jestem zainteresowany abstrakcyjnymi spekulacjami.',
      en: 'I am not interested in theoretical discussions.'
    },
    reverse: true,
    domain: 'openness',
    facet: 'ideas'
  },

  // CONSCIENTIOUSNESS (12 items)
  {
    id: 'c1',
    text: {
      pl: 'Zawsze jestem przygotowany.',
      en: 'I am always prepared.'
    },
    reverse: false,
    domain: 'conscientiousness',
    facet: 'competence'
  },
  {
    id: 'c2',
    text: {
      pl: 'Zwracam uwagę na szczegóły.',
      en: 'I pay attention to details.'
    },
    reverse: false,
    domain: 'conscientiousness',
    facet: 'dutifulness'
  },
  {
    id: 'c3',
    text: {
      pl: 'Wykonuję obowiązki od razu.',
      en: 'I get chores done right away.'
    },
    reverse: false,
    domain: 'conscientiousness',
    facet: 'self-discipline'
  },
  {
    id: 'c4',
    text: {
      pl: 'Lubię porządek.',
      en: 'I like order.'
    },
    reverse: false,
    domain: 'conscientiousness',
    facet: 'order'
  },
  {
    id: 'c5',
    text: {
      pl: 'Postępuję zgodnie z harmonogramem.',
      en: 'I follow a schedule.'
    },
    reverse: false,
    domain: 'conscientiousness',
    facet: 'order'
  },
  {
    id: 'c6',
    text: {
      pl: 'Jestem wymagający w swojej pracy.',
      en: 'I am exacting in my work.'
    },
    reverse: false,
    domain: 'conscientiousness',
    facet: 'achievement-striving'
  },
  {
    id: 'c7',
    text: {
      pl: 'Zostawiam swoje rzeczy wszędzie.',
      en: 'I leave my belongings around.'
    },
    reverse: true,
    domain: 'conscientiousness',
    facet: 'order'
  },
  {
    id: 'c8',
    text: {
      pl: 'Często robię bałagan.',
      en: 'I make a mess of things.'
    },
    reverse: true,
    domain: 'conscientiousness',
    facet: 'order'
  },
  {
    id: 'c9',
    text: {
      pl: 'Często zapominam o oddawaniu rzeczy na miejsce.',
      en: 'I often forget to put things back in their proper place.'
    },
    reverse: true,
    domain: 'conscientiousness',
    facet: 'order'
  },
  {
    id: 'c10',
    text: {
      pl: 'Uchylam się od swoich obowiązków.',
      en: 'I shirk my duties.'
    },
    reverse: true,
    domain: 'conscientiousness',
    facet: 'dutifulness'
  },
  {
    id: 'c11',
    text: {
      pl: 'Tracę czas.',
      en: 'I waste my time.'
    },
    reverse: true,
    domain: 'conscientiousness',
    facet: 'self-discipline'
  },
  {
    id: 'c12',
    text: {
      pl: 'Trudno mi zabrać się do pracy.',
      en: 'I find it difficult to get down to work.'
    },
    reverse: true,
    domain: 'conscientiousness',
    facet: 'self-discipline'
  },

  // EXTRAVERSION (12 items)
  {
    id: 'e1',
    text: {
      pl: 'Jestem duszą towarzystwa.',
      en: 'I am the life of the party.'
    },
    reverse: false,
    domain: 'extraversion',
    facet: 'gregariousness'
  },
  {
    id: 'e2',
    text: {
      pl: 'Czuję się komfortowo wśród ludzi.',
      en: 'I feel comfortable around people.'
    },
    reverse: false,
    domain: 'extraversion',
    facet: 'warmth'
  },
  {
    id: 'e3',
    text: {
      pl: 'Rozpoczynam rozmowy.',
      en: 'I start conversations.'
    },
    reverse: false,
    domain: 'extraversion',
    facet: 'assertiveness'
  },
  {
    id: 'e4',
    text: {
      pl: 'Rozmawiam z wieloma różnymi ludźmi na przyjęciach.',
      en: 'I talk to a lot of different people at parties.'
    },
    reverse: false,
    domain: 'extraversion',
    facet: 'gregariousness'
  },
  {
    id: 'e5',
    text: {
      pl: 'Nie przeszkadza mi bycie w centrum uwagi.',
      en: 'I don\'t mind being the center of attention.'
    },
    reverse: false,
    domain: 'extraversion',
    facet: 'assertiveness'
  },
  {
    id: 'e6',
    text: {
      pl: 'Nie rozmawiam dużo.',
      en: 'I don\'t talk a lot.'
    },
    reverse: true,
    domain: 'extraversion',
    facet: 'gregariousness'
  },
  {
    id: 'e7',
    text: {
      pl: 'Trzymam się w tle.',
      en: 'I keep in the background.'
    },
    reverse: true,
    domain: 'extraversion',
    facet: 'assertiveness'
  },
  {
    id: 'e8',
    text: {
      pl: 'Mam niewiele do powiedzenia.',
      en: 'I have little to say.'
    },
    reverse: true,
    domain: 'extraversion',
    facet: 'gregariousness'
  },
  {
    id: 'e9',
    text: {
      pl: 'Nie lubię zwracać na siebie uwagi.',
      en: 'I don\'t like to draw attention to myself.'
    },
    reverse: true,
    domain: 'extraversion',
    facet: 'assertiveness'
  },
  {
    id: 'e10',
    text: {
      pl: 'Jestem cichy w obecności nieznajomych.',
      en: 'I am quiet around strangers.'
    },
    reverse: true,
    domain: 'extraversion',
    facet: 'warmth'
  },
  {
    id: 'e11',
    text: {
      pl: 'Dużo rozmawiam ze znajomymi.',
      en: 'I talk a lot around familiar people.'
    },
    reverse: false,
    domain: 'extraversion',
    facet: 'gregariousness'
  },
  {
    id: 'e12',
    text: {
      pl: 'Wycofuję się z kontaktów społecznych.',
      en: 'I find it hard to approach others.'
    },
    reverse: true,
    domain: 'extraversion',
    facet: 'warmth'
  },

  // AGREEABLENESS (12 items)
  {
    id: 'a1',
    text: {
      pl: 'Mam miękkie serce.',
      en: 'I have a soft heart.'
    },
    reverse: false,
    domain: 'agreeableness',
    facet: 'tender-mindedness'
  },
  {
    id: 'a2',
    text: {
      pl: 'Współczuję uczuciom innych.',
      en: 'I sympathize with others\' feelings.'
    },
    reverse: false,
    domain: 'agreeableness',
    facet: 'tender-mindedness'
  },
  {
    id: 'a3',
    text: {
      pl: 'Czuję emocje innych ludzi.',
      en: 'I feel others\' emotions.'
    },
    reverse: false,
    domain: 'agreeableness',
    facet: 'tender-mindedness'
  },
  {
    id: 'a4',
    text: {
      pl: 'Poświęcam czas innym.',
      en: 'I take time out for others.'
    },
    reverse: false,
    domain: 'agreeableness',
    facet: 'altruism'
  },
  {
    id: 'a5',
    text: {
      pl: 'Nie przejmuję się zbytnio innymi.',
      en: 'I feel little concern for others.'
    },
    reverse: true,
    domain: 'agreeableness',
    facet: 'tender-mindedness'
  },
  {
    id: 'a6',
    text: {
      pl: 'Sprawiam, że ludzie czują się swobodnie.',
      en: 'I make people feel at ease.'
    },
    reverse: false,
    domain: 'agreeableness',
    facet: 'trust'
  },
  {
    id: 'a7',
    text: {
      pl: 'Nie jestem naprawdę zainteresowany innymi.',
      en: 'I am not really interested in others.'
    },
    reverse: true,
    domain: 'agreeableness',
    facet: 'tender-mindedness'
  },
  {
    id: 'a8',
    text: {
      pl: 'Obrażam ludzi.',
      en: 'I insult people.'
    },
    reverse: true,
    domain: 'agreeableness',
    facet: 'compliance'
  },
  {
    id: 'a9',
    text: {
      pl: 'Nie interesują mnie problemy innych ludzi.',
      en: 'I am not interested in other people\'s problems.'
    },
    reverse: true,
    domain: 'agreeableness',
    facet: 'tender-mindedness'
  },
  {
    id: 'a10',
    text: {
      pl: 'Jestem obojętny na uczucia innych.',
      en: 'I am indifferent to the feelings of others.'
    },
    reverse: true,
    domain: 'agreeableness',
    facet: 'tender-mindedness'
  },
  {
    id: 'a11',
    text: {
      pl: 'Traktuję ludzi z szacunkiem.',
      en: 'I treat people with respect.'
    },
    reverse: false,
    domain: 'agreeableness',
    facet: 'compliance'
  },
  {
    id: 'a12',
    text: {
      pl: 'Staram się być uprzejmy dla wszystkich, których spotykam.',
      en: 'I try to be courteous to everyone I meet.'
    },
    reverse: false,
    domain: 'agreeableness',
    facet: 'compliance'
  },

  // NEUROTICISM (12 items)
  {
    id: 'n1',
    text: {
      pl: 'Łatwo się stresuję.',
      en: 'I get stressed out easily.'
    },
    reverse: false,
    domain: 'neuroticism',
    facet: 'anxiety'
  },
  {
    id: 'n2',
    text: {
      pl: 'Martwię się różnymi sprawami.',
      en: 'I worry about things.'
    },
    reverse: false,
    domain: 'neuroticism',
    facet: 'anxiety'
  },
  {
    id: 'n3',
    text: {
      pl: 'Łatwo mnie wyprowadzić z równowagi.',
      en: 'I am easily disturbed.'
    },
    reverse: false,
    domain: 'neuroticism',
    facet: 'vulnerability'
  },
  {
    id: 'n4',
    text: {
      pl: 'Łatwo się denerwuję.',
      en: 'I get upset easily.'
    },
    reverse: false,
    domain: 'neuroticism',
    facet: 'vulnerability'
  },
  {
    id: 'n5',
    text: {
      pl: 'Często zmieniam nastrój.',
      en: 'I change my mood a lot.'
    },
    reverse: false,
    domain: 'neuroticism',
    facet: 'depression'
  },
  {
    id: 'n6',
    text: {
      pl: 'Mam częste zmiany nastroju.',
      en: 'I have frequent mood swings.'
    },
    reverse: false,
    domain: 'neuroticism',
    facet: 'depression'
  },
  {
    id: 'n7',
    text: {
      pl: 'Łatwo się irytuje.',
      en: 'I get irritated easily.'
    },
    reverse: false,
    domain: 'neuroticism',
    facet: 'anger'
  },
  {
    id: 'n8',
    text: {
      pl: 'Często czuję smutek.',
      en: 'I often feel blue.'
    },
    reverse: false,
    domain: 'neuroticism',
    facet: 'depression'
  },
  {
    id: 'n9',
    text: {
      pl: 'Przez większość czasu jestem zrelaksowany.',
      en: 'I am relaxed most of the time.'
    },
    reverse: true,
    domain: 'neuroticism',
    facet: 'anxiety'
  },
  {
    id: 'n10',
    text: {
      pl: 'Rzadko czuję smutek.',
      en: 'I seldom feel blue.'
    },
    reverse: true,
    domain: 'neuroticism',
    facet: 'depression'
  },
  {
    id: 'n11',
    text: {
      pl: 'Panikuję w trudnych sytuacjach.',
      en: 'I panic easily.'
    },
    reverse: false,
    domain: 'neuroticism',
    facet: 'anxiety'
  },
  {
    id: 'n12',
    text: {
      pl: 'Nie martwię się rzeczami, które już się wydarzyły.',
      en: 'I don\'t worry about things that have already happened.'
    },
    reverse: true,
    domain: 'neuroticism',
    facet: 'anxiety'
  }
];

// Scoring function
export function calculateIPIPScores(responses: Record<string, number>): IPIPScores {
  const scores = {
    openness: 0,
    conscientiousness: 0,
    extraversion: 0,
    agreeableness: 0,
    neuroticism: 0
  };

  IPIP_60_ITEMS.forEach(item => {
    let score = responses[item.id] || 0;
    
    // Reverse scoring for reverse items
    if (item.reverse) {
      score = 6 - score; // 5-point scale: 1-5 becomes 5-1
    }
    
    scores[item.domain] += score;
  });

  // Normalize to 0-100 scale
  Object.keys(scores).forEach(key => {
    const domain = key as keyof IPIPScores;
    scores[domain] = Math.round((scores[domain] / 12) * 25); // 12 items per domain, max 60 points, scale to 100
  });

  return scores;
}

// Domain labels
export const IPIP_DOMAIN_LABELS = {
  openness: {
    pl: 'Otwartość na doświadczenia',
    en: 'Openness to Experience'
  },
  conscientiousness: {
    pl: 'Sumienność',
    en: 'Conscientiousness'
  },
  extraversion: {
    pl: 'Ekstrawersja',
    en: 'Extraversion'
  },
  agreeableness: {
    pl: 'Ugodowość',
    en: 'Agreeableness'
  },
  neuroticism: {
    pl: 'Neurotyczność',
    en: 'Neuroticism'
  }
};
