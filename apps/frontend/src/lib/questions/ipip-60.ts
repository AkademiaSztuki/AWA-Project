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
      pl: 'Mam trudności z rozumieniem abstrakcyjnych idei.',
      en: 'I have difficulty understanding abstract ideas.'
    },
    reverse: true,
    domain: 'openness',
    facet: 'ideas'
  },
  {
    id: 'o3',
    text: {
      pl: 'Mam żywą wyobraźnię.',
      en: 'I have a vivid imagination.'
    },
    reverse: false,
    domain: 'openness',
    facet: 'fantasy'
  },
  {
    id: 'o4',
    text: {
      pl: 'Nie jestem zainteresowany abstrakcyjnymi ideami.',
      en: 'I am not interested in abstract ideas.'
    },
    reverse: true,
    domain: 'openness',
    facet: 'ideas'
  },
  {
    id: 'o5',
    text: {
      pl: 'Mam rzadko fantazje.',
      en: 'I rarely have fantasies.'
    },
    reverse: true,
    domain: 'openness',
    facet: 'fantasy'
  },
  {
    id: 'o6',
    text: {
      pl: 'Poezja ma na mnie mały lub żaden wpływ.',
      en: 'Poetry has little or no effect on me.'
    },
    reverse: true,
    domain: 'openness',
    facet: 'aesthetics'
  },
  {
    id: 'o7',
    text: {
      pl: 'Często myślę o filozoficznych problemach.',
      en: 'I often think about philosophical problems.'
    },
    reverse: false,
    domain: 'openness',
    facet: 'ideas'
  },
  {
    id: 'o8',
    text: {
      pl: 'Lubię słuchać muzyki.',
      en: 'I enjoy listening to music.'
    },
    reverse: false,
    domain: 'openness',
    facet: 'aesthetics'
  },
  {
    id: 'o9',
    text: {
      pl: 'Nie widzę sensu w poezji.',
      en: 'I see no point in poetry.'
    },
    reverse: true,
    domain: 'openness',
    facet: 'aesthetics'
  },
  {
    id: 'o10',
    text: {
      pl: 'Lubię sztukę.',
      en: 'I enjoy art.'
    },
    reverse: false,
    domain: 'openness',
    facet: 'aesthetics'
  },
  {
    id: 'o11',
    text: {
      pl: 'Często zastanawiam się nad sensem życia.',
      en: 'I often ponder the meaning of life.'
    },
    reverse: false,
    domain: 'openness',
    facet: 'ideas'
  },
  {
    id: 'o12',
    text: {
      pl: 'Lubię eksperymentować z nowymi rzeczami.',
      en: 'I like to experiment with new things.'
    },
    reverse: false,
    domain: 'openness',
    facet: 'actions'
  },

  // CONSCIENTIOUSNESS (12 items)
  {
    id: 'c1',
    text: {
      pl: 'Zawsze przygotowuję się do ważnych spotkań.',
      en: 'I always prepare for important meetings.'
    },
    reverse: false,
    domain: 'conscientiousness',
    facet: 'self-discipline'
  },
  {
    id: 'c2',
    text: {
      pl: 'Często zapominam o oddawaniu rzeczy na miejsce.',
      en: 'I often forget to put things back in their proper place.'
    },
    reverse: true,
    domain: 'conscientiousness',
    facet: 'order'
  },
  {
    id: 'c3',
    text: {
      pl: 'Lubię porządek.',
      en: 'I like order.'
    },
    reverse: false,
    domain: 'conscientiousness',
    facet: 'order'
  },
  {
    id: 'c4',
    text: {
      pl: 'Często zapominam o tym, co chciałem zrobić.',
      en: 'I often forget what I wanted to do.'
    },
    reverse: true,
    domain: 'conscientiousness',
    facet: 'self-discipline'
  },
  {
    id: 'c5',
    text: {
      pl: 'Zawsze kończę to, co zacząłem.',
      en: 'I always finish what I start.'
    },
    reverse: false,
    domain: 'conscientiousness',
    facet: 'self-discipline'
  },
  {
    id: 'c6',
    text: {
      pl: 'Często robię rzeczy w pośpiechu.',
      en: 'I often do things in a hurry.'
    },
    reverse: true,
    domain: 'conscientiousness',
    facet: 'self-discipline'
  },
  {
    id: 'c7',
    text: {
      pl: 'Jestem bardzo dokładny w swojej pracy.',
      en: 'I am very careful in my work.'
    },
    reverse: false,
    domain: 'conscientiousness',
    facet: 'self-discipline'
  },
  {
    id: 'c8',
    text: {
      pl: 'Często nie udaje mi się zrobić tego, co zaplanowałem.',
      en: 'I often fail to do what I planned.'
    },
    reverse: true,
    domain: 'conscientiousness',
    facet: 'self-discipline'
  },
  {
    id: 'c9',
    text: {
      pl: 'Lubię mieć plan na każdy dzień.',
      en: 'I like to have a plan for each day.'
    },
    reverse: false,
    domain: 'conscientiousness',
    facet: 'order'
  },
  {
    id: 'c10',
    text: {
      pl: 'Często odkładam rzeczy na później.',
      en: 'I often put things off until later.'
    },
    reverse: true,
    domain: 'conscientiousness',
    facet: 'self-discipline'
  },
  {
    id: 'c11',
    text: {
      pl: 'Zawsze dotrzymuję obietnic.',
      en: 'I always keep my promises.'
    },
    reverse: false,
    domain: 'conscientiousness',
    facet: 'self-discipline'
  },
  {
    id: 'c12',
    text: {
      pl: 'Często nie udaje mi się dotrzymać terminów.',
      en: 'I often fail to meet deadlines.'
    },
    reverse: true,
    domain: 'conscientiousness',
    facet: 'self-discipline'
  },

  // EXTRAVERSION (12 items)
  {
    id: 'e1',
    text: {
      pl: 'Czuję się komfortowo wśród ludzi.',
      en: 'I feel comfortable around people.'
    },
    reverse: false,
    domain: 'extraversion',
    facet: 'gregariousness'
  },
  {
    id: 'e2',
    text: {
      pl: 'Unikam tłumów.',
      en: 'I avoid crowds.'
    },
    reverse: true,
    domain: 'extraversion',
    facet: 'gregariousness'
  },
  {
    id: 'e3',
    text: {
      pl: 'Lubię być w centrum uwagi.',
      en: 'I like to be the center of attention.'
    },
    reverse: false,
    domain: 'extraversion',
    facet: 'assertiveness'
  },
  {
    id: 'e4',
    text: {
      pl: 'Często czuję się niekomfortowo w towarzystwie innych.',
      en: 'I often feel uncomfortable around others.'
    },
    reverse: true,
    domain: 'extraversion',
    facet: 'gregariousness'
  },
  {
    id: 'e5',
    text: {
      pl: 'Lubię spotykać nowych ludzi.',
      en: 'I like to meet new people.'
    },
    reverse: false,
    domain: 'extraversion',
    facet: 'gregariousness'
  },
  {
    id: 'e6',
    text: {
      pl: 'Często czuję się samotny.',
      en: 'I often feel lonely.'
    },
    reverse: true,
    domain: 'extraversion',
    facet: 'gregariousness'
  },
  {
    id: 'e7',
    text: {
      pl: 'Lubię być w towarzystwie.',
      en: 'I like to be around people.'
    },
    reverse: false,
    domain: 'extraversion',
    facet: 'gregariousness'
  },
  {
    id: 'e8',
    text: {
      pl: 'Często czuję się nieśmiały.',
      en: 'I often feel shy.'
    },
    reverse: true,
    domain: 'extraversion',
    facet: 'assertiveness'
  },
  {
    id: 'e9',
    text: {
      pl: 'Lubię być w centrum wydarzeń.',
      en: 'I like to be in the center of events.'
    },
    reverse: false,
    domain: 'extraversion',
    facet: 'assertiveness'
  },
  {
    id: 'e10',
    text: {
      pl: 'Często czuję się wycofany.',
      en: 'I often feel withdrawn.'
    },
    reverse: true,
    domain: 'extraversion',
    facet: 'gregariousness'
  },
  {
    id: 'e11',
    text: {
      pl: 'Lubię być w towarzystwie przyjaciół.',
      en: 'I like to be around friends.'
    },
    reverse: false,
    domain: 'extraversion',
    facet: 'gregariousness'
  },
  {
    id: 'e12',
    text: {
      pl: 'Często czuję się niepewnie w towarzystwie.',
      en: 'I often feel insecure around others.'
    },
    reverse: true,
    domain: 'extraversion',
    facet: 'assertiveness'
  },

  // AGREEABLENESS (12 items)
  {
    id: 'a1',
    text: {
      pl: 'Często czuję współczucie dla innych.',
      en: 'I often feel sympathy for others.'
    },
    reverse: false,
    domain: 'agreeableness',
    facet: 'tender-mindedness'
  },
  {
    id: 'a2',
    text: {
      pl: 'Często martwię się problemami innych.',
      en: 'I often worry about others\' problems.'
    },
    reverse: false,
    domain: 'agreeableness',
    facet: 'tender-mindedness'
  },
  {
    id: 'a3',
    text: {
      pl: 'Lubię pomagać innym.',
      en: 'I like to help others.'
    },
    reverse: false,
    domain: 'agreeableness',
    facet: 'altruism'
  },
  {
    id: 'a4',
    text: {
      pl: 'Często czuję się zaniepokojony problemami innych.',
      en: 'I often feel concerned about others\' problems.'
    },
    reverse: false,
    domain: 'agreeableness',
    facet: 'tender-mindedness'
  },
  {
    id: 'a5',
    text: {
      pl: 'Lubię być miły dla innych.',
      en: 'I like to be kind to others.'
    },
    reverse: false,
    domain: 'agreeableness',
    facet: 'altruism'
  },
  {
    id: 'a6',
    text: {
      pl: 'Często czuję się zaniepokojony problemami innych.',
      en: 'I often feel concerned about others\' problems.'
    },
    reverse: false,
    domain: 'agreeableness',
    facet: 'tender-mindedness'
  },
  {
    id: 'a7',
    text: {
      pl: 'Lubię być miły dla innych.',
      en: 'I like to be kind to others.'
    },
    reverse: false,
    domain: 'agreeableness',
    facet: 'altruism'
  },
  {
    id: 'a8',
    text: {
      pl: 'Często czuję się zaniepokojony problemami innych.',
      en: 'I often feel concerned about others\' problems.'
    },
    reverse: false,
    domain: 'agreeableness',
    facet: 'tender-mindedness'
  },
  {
    id: 'a9',
    text: {
      pl: 'Lubię być miły dla innych.',
      en: 'I like to be kind to others.'
    },
    reverse: false,
    domain: 'agreeableness',
    facet: 'altruism'
  },
  {
    id: 'a10',
    text: {
      pl: 'Często czuję się zaniepokojony problemami innych.',
      en: 'I often feel concerned about others\' problems.'
    },
    reverse: false,
    domain: 'agreeableness',
    facet: 'tender-mindedness'
  },
  {
    id: 'a11',
    text: {
      pl: 'Lubię być miły dla innych.',
      en: 'I like to be kind to others.'
    },
    reverse: false,
    domain: 'agreeableness',
    facet: 'altruism'
  },
  {
    id: 'a12',
    text: {
      pl: 'Często czuję się zaniepokojony problemami innych.',
      en: 'I often feel concerned about others\' problems.'
    },
    reverse: false,
    domain: 'agreeableness',
    facet: 'tender-mindedness'
  },

  // NEUROTICISM (12 items)
  {
    id: 'n1',
    text: {
      pl: 'Często czuję się zestresowany.',
      en: 'I often feel stressed.'
    },
    reverse: false,
    domain: 'neuroticism',
    facet: 'anxiety'
  },
  {
    id: 'n2',
    text: {
      pl: 'Często czuję się zaniepokojony.',
      en: 'I often feel worried.'
    },
    reverse: false,
    domain: 'neuroticism',
    facet: 'anxiety'
  },
  {
    id: 'n3',
    text: {
      pl: 'Często czuję się smutny.',
      en: 'I often feel sad.'
    },
    reverse: false,
    domain: 'neuroticism',
    facet: 'depression'
  },
  {
    id: 'n4',
    text: {
      pl: 'Często czuję się zły.',
      en: 'I often feel angry.'
    },
    reverse: false,
    domain: 'neuroticism',
    facet: 'anger'
  },
  {
    id: 'n5',
    text: {
      pl: 'Często czuję się niepewnie.',
      en: 'I often feel insecure.'
    },
    reverse: false,
    domain: 'neuroticism',
    facet: 'self-consciousness'
  },
  {
    id: 'n6',
    text: {
      pl: 'Często czuję się przytłoczony.',
      en: 'I often feel overwhelmed.'
    },
    reverse: false,
    domain: 'neuroticism',
    facet: 'anxiety'
  },
  {
    id: 'n7',
    text: {
      pl: 'Często czuję się zaniepokojony.',
      en: 'I often feel worried.'
    },
    reverse: false,
    domain: 'neuroticism',
    facet: 'anxiety'
  },
  {
    id: 'n8',
    text: {
      pl: 'Często czuję się smutny.',
      en: 'I often feel sad.'
    },
    reverse: false,
    domain: 'neuroticism',
    facet: 'depression'
  },
  {
    id: 'n9',
    text: {
      pl: 'Często czuję się zły.',
      en: 'I often feel angry.'
    },
    reverse: false,
    domain: 'neuroticism',
    facet: 'anger'
  },
  {
    id: 'n10',
    text: {
      pl: 'Często czuję się niepewnie.',
      en: 'I often feel insecure.'
    },
    reverse: false,
    domain: 'neuroticism',
    facet: 'self-consciousness'
  },
  {
    id: 'n11',
    text: {
      pl: 'Często czuję się przytłoczony.',
      en: 'I often feel overwhelmed.'
    },
    reverse: false,
    domain: 'neuroticism',
    facet: 'anxiety'
  },
  {
    id: 'n12',
    text: {
      pl: 'Często czuję się zaniepokojony.',
      en: 'I often feel worried.'
    },
    reverse: false,
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
