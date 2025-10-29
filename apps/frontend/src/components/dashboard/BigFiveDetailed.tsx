"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';

interface BigFiveScores {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

interface BigFiveDetailedProps {
  scores: BigFiveScores;
  responses?: Record<string, number>;
  completedAt?: string;
}

// Radar Chart Component (używając SVG)
function RadarChart({ scores }: { scores: BigFiveScores }) {
  const dimensions = [
    { key: 'openness', label: { pl: 'Otwartość', en: 'Openness' }, angle: 0 },
    { key: 'conscientiousness', label: { pl: 'Sumienność', en: 'Conscientiousness' }, angle: 72 },
    { key: 'extraversion', label: { pl: 'Ekstrawersja', en: 'Extraversion' }, angle: 144 },
    { key: 'agreeableness', label: { pl: 'Ugodowość', en: 'Agreeableness' }, angle: 216 },
    { key: 'neuroticism', label: { pl: 'Neurotyczność', en: 'Neuroticism' }, angle: 288 }
  ];

  const { language } = useLanguage();
  const centerX = 200;
  const centerY = 200;
  const maxRadius = 150;

  // Convert score (0-100) to radius
  const getPoint = (score: number, angle: number) => {
    const radius = (score / 100) * maxRadius;
    const radian = (angle - 90) * (Math.PI / 180);
    return {
      x: centerX + radius * Math.cos(radian),
      y: centerY + radius * Math.sin(radian)
    };
  };

  // Create polygon points
  const points = dimensions.map(dim => {
    const score = scores[dim.key as keyof BigFiveScores];
    return getPoint(score, dim.angle);
  });

  const pathData = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`
  ).join(' ') + ' Z';

  // Background rings
  const rings = [20, 40, 60, 80, 100];

  return (
    <svg width="400" height="400" viewBox="0 0 400 400" className="mx-auto">
      {/* Background rings */}
      {rings.map(ring => (
        <circle
          key={ring}
          cx={centerX}
          cy={centerY}
          r={(ring / 100) * maxRadius}
          fill="none"
          stroke="rgba(200, 200, 200, 0.2)"
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {dimensions.map(dim => {
        const endPoint = getPoint(100, dim.angle);
        return (
          <line
            key={dim.key}
            x1={centerX}
            y1={centerY}
            x2={endPoint.x}
            y2={endPoint.y}
            stroke="rgba(200, 200, 200, 0.3)"
            strokeWidth="1"
          />
        );
      })}

      {/* Data polygon */}
      <path
        d={pathData}
        fill="rgba(212, 175, 55, 0.3)"
        stroke="rgb(212, 175, 55)"
        strokeWidth="3"
      />

      {/* Data points */}
      {points.map((point, i) => (
        <circle
          key={i}
          cx={point.x}
          cy={point.y}
          r="6"
          fill="rgb(212, 175, 55)"
        />
      ))}

      {/* Labels */}
      {dimensions.map(dim => {
        const labelPoint = getPoint(110, dim.angle);
        const score = scores[dim.key as keyof BigFiveScores];
        return (
          <g key={dim.key}>
            <text
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              className="text-sm font-nasalization fill-graphite"
            >
              {dim.label[language as 'pl' | 'en']}
            </text>
            <text
              x={labelPoint.x}
              y={labelPoint.y + 16}
              textAnchor="middle"
              className="text-xs font-modern fill-gold font-bold"
            >
              {score}%
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Domain description component
function DomainDescription({ domain, score }: { domain: keyof BigFiveScores; score: number }) {
  const { language } = useLanguage();

  const descriptions = {
    openness: {
      label: { pl: 'Otwartość na Doświadczenia', en: 'Openness to Experience' },
      high: {
        pl: 'Cenisz kreatywność, wyobraźnię i nowe doświadczenia. Lubisz abstrakcyjne myślenie i różnorodność.',
        en: 'You value creativity, imagination, and new experiences. You enjoy abstract thinking and variety.'
      },
      medium: {
        pl: 'Balansujesz między tradycją a nowoczesnością. Doceniasz zarówno sprawdzone rozwiązania, jak i innowacje.',
        en: 'You balance tradition and modernity. You appreciate both proven solutions and innovations.'
      },
      low: {
        pl: 'Preferujesz rutynę i sprawdzone metody. Cenisz praktyczność i konkretne rozwiązania.',
        en: 'You prefer routine and proven methods. You value practicality and concrete solutions.'
      },
      designImpact: {
        pl: 'Wpływ na design: Wpływa na preferencje dotyczące złożoności wizualnej, różnorodności materiałów i innowacyjnych rozwiązań.',
        en: 'Design Impact: Influences preferences for visual complexity, material variety, and innovative solutions.'
      }
    },
    conscientiousness: {
      label: { pl: 'Sumienność', en: 'Conscientiousness' },
      high: {
        pl: 'Jesteś zorganizowany, systematyczny i odpowiedzialny. Planujesz z wyprzedzeniem i dbasz o szczegóły.',
        en: 'You are organized, systematic, and responsible. You plan ahead and pay attention to details.'
      },
      medium: {
        pl: 'Potrafisz być elastyczny w organizacji. Balansujesz między spontanicznością a planowaniem.',
        en: 'You can be flexible in organization. You balance spontaneity and planning.'
      },
      low: {
        pl: 'Preferujesz spontaniczność i elastyczność. Łatwo adaptujesz się do zmian.',
        en: 'You prefer spontaneity and flexibility. You easily adapt to changes.'
      },
      designImpact: {
        pl: 'Wpływ na design: Wpływa na potrzeby przechowywania, organizacji przestrzeni i uporządkowania.',
        en: 'Design Impact: Influences storage needs, space organization, and orderliness.'
      }
    },
    extraversion: {
      label: { pl: 'Ekstrawersja', en: 'Extraversion' },
      high: {
        pl: 'Czerpiesz energię z interakcji społecznych. Lubisz być otoczony ludźmi i aktywność.',
        en: 'You draw energy from social interactions. You enjoy being around people and activity.'
      },
      medium: {
        pl: 'Balansujesz między czasem z ludźmi a czasem w samotności. Ambiwertysta.',
        en: 'You balance time with people and time alone. Ambivert.'
      },
      low: {
        pl: 'Preferujesz spokojne środowisko i ograniczone kontakty społeczne. Czerpiesz energię z samotności.',
        en: 'You prefer quiet environments and limited social contact. You recharge in solitude.'
      },
      designImpact: {
        pl: 'Wpływ na design: Wpływa na otwartość przestrzeni, jasność oświetlenia i przestrzeń społeczną vs prywatną.',
        en: 'Design Impact: Influences space openness, lighting brightness, and social vs private areas.'
      }
    },
    agreeableness: {
      label: { pl: 'Ugodowość', en: 'Agreeableness' },
      high: {
        pl: 'Jesteś empatyczny, współpracujący i harmonijny. Cenisz dobre relacje i kompromis.',
        en: 'You are empathetic, cooperative, and harmonious. You value good relationships and compromise.'
      },
      medium: {
        pl: 'Potrafisz być zarówno asertywny, jak i współpracujący. Balansujesz własne potrzeby z potrzebami innych.',
        en: 'You can be both assertive and cooperative. You balance your own needs with others.'
      },
      low: {
        pl: 'Jesteś niezależny i asertywny. Cenisz szczerość i własne zdanie.',
        en: 'You are independent and assertive. You value honesty and your own opinion.'
      },
      designImpact: {
        pl: 'Wpływ na design: Wpływa na harmonię kolorów, zbalansowane proporcje i kojące elementy.',
        en: 'Design Impact: Influences color harmony, balanced proportions, and calming elements.'
      }
    },
    neuroticism: {
      label: { pl: 'Neurotyczność', en: 'Neuroticism' },
      high: {
        pl: 'Jesteś wrażliwy emocjonalnie i reaktywny. Potrzebujesz środowiska, które oferuje komfort i bezpieczeństwo.',
        en: 'You are emotionally sensitive and reactive. You need an environment that offers comfort and security.'
      },
      medium: {
        pl: 'Masz stabilność emocjonalną z okazjonalnymi wahaniami. Potrafisz zarządzać stresem.',
        en: 'You have emotional stability with occasional fluctuations. You can manage stress.'
      },
      low: {
        pl: 'Jesteś spokojny, odporny na stress i stabilny emocjonalnie.',
        en: 'You are calm, stress-resistant, and emotionally stable.'
      },
      designImpact: {
        pl: 'Wpływ na design: Wpływa na potrzebę komfortu, miękkich tekstur i ciepłego oświetlenia.',
        en: 'Design Impact: Influences need for comfort, soft textures, and warm lighting.'
      }
    }
  };

  const domainData = descriptions[domain];
  const level = score > 66 ? 'high' : score > 33 ? 'medium' : 'low';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-nasalization text-graphite">
            {domainData.label[language as 'pl' | 'en']}
          </h3>
          <div className="text-3xl font-bold text-gold">{score}%</div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-white/20 rounded-full h-3 mb-4">
          <div
            className="bg-gradient-to-r from-gold to-champagne h-3 rounded-full transition-all duration-1000"
            style={{ width: `${score}%` }}
          />
        </div>

        {/* Description */}
        <p className="text-graphite font-modern mb-3">
          {domainData[level][language as 'pl' | 'en']}
        </p>

        {/* Design Impact */}
        <div className="mt-4 pt-4 border-t border-white/20">
          <p className="text-sm text-silver-dark font-modern italic">
            {domainData.designImpact[language as 'pl' | 'en']}
          </p>
        </div>
      </GlassCard>
    </motion.div>
  );
}

export function BigFiveDetailed({ scores, responses, completedAt }: BigFiveDetailedProps) {
  const { language } = useLanguage();
  const router = useRouter();

  const t = (pl: string, en: string) => (language === 'pl' ? pl : en);

  return (
    <div className="min-h-screen flex flex-col w-full relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-radial from-pearl-50 via-platinum-50 to-silver-100 -z-10" />

      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <GlassButton
              onClick={() => router.back()}
              variant="secondary"
              className="mb-4"
            >
              <ArrowLeft size={20} className="mr-2" />
              {t('Powrót', 'Back')}
            </GlassButton>

            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-nasalization bg-gradient-to-r from-gold via-champagne to-platinum bg-clip-text text-transparent mb-2">
              {t('Twój Profil Osobowości', 'Your Personality Profile')}
            </h1>
            <p className="text-base lg:text-lg text-graphite font-modern">
              {t('Big Five (IPIP-60) - Szczegółowa Analiza', 'Big Five (IPIP-60) - Detailed Analysis')}
            </p>
            {completedAt && (
              <p className="text-sm text-silver-dark font-modern mt-2">
                {t('Ukończono:', 'Completed:')} {new Date(completedAt).toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-US')}
              </p>
            )}
          </motion.div>

          {/* Radar Chart Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <GlassCard className="p-8">
              <h2 className="text-2xl font-nasalization text-graphite mb-6 text-center">
                {t('Profil Osobowości', 'Personality Profile')}
              </h2>
              <RadarChart scores={scores} />
              <div className="mt-6 text-center text-sm text-silver-dark font-modern">
                {t(
                  'Wykres pokazuje Twoje wyniki w pięciu głównych wymiarach osobowości',
                  'Chart shows your scores in the five main personality dimensions'
                )}
              </div>
            </GlassCard>
          </motion.div>

          {/* Detailed Descriptions */}
          <div className="space-y-6">
            <h2 className="text-2xl font-nasalization text-graphite mb-4">
              {t('Szczegółowe Opisy Wymiarów', 'Detailed Dimension Descriptions')}
            </h2>

            {Object.entries(scores).map(([domain, score], index) => (
              <motion.div
                key={domain}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <DomainDescription
                  domain={domain as keyof BigFiveScores}
                  score={score}
                />
              </motion.div>
            ))}
          </div>

          {/* Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-8"
          >
            <GlassCard className="p-6">
              <h3 className="text-xl font-nasalization text-graphite mb-4">
                {t('O Teście Big Five', 'About the Big Five Test')}
              </h3>
              <div className="space-y-3 text-graphite font-modern">
                <p>
                  {t(
                    'Test Big Five (IPIP-60) to jeden z najbardziej uznanych i naukowo zwalidowanych testów osobowości. Opiera się na modelu pięciu wielkich czynników osobowości, który jest szeroko akceptowany w psychologii.',
                    'The Big Five test (IPIP-60) is one of the most recognized and scientifically validated personality tests. It is based on the five-factor model of personality, which is widely accepted in psychology.'
                  )}
                </p>
                <p>
                  {t(
                    'W kontekście designu wnętrz, Twoje cechy osobowości pomagają nam tworzyć przestrzenie, które nie tylko wyglądają pięknie, ale również odzwierciedlają KIM jesteś i jak funkcjonujesz.',
                    'In the context of interior design, your personality traits help us create spaces that not only look beautiful but also reflect WHO you are and how you function.'
                  )}
                </p>
                <div className="mt-4 pt-4 border-t border-white/20">
                  <p className="text-sm text-silver-dark">
                    {t(
                      'Źródło: International Personality Item Pool (IPIP) - ipip.ori.org',
                      'Source: International Personality Item Pool (IPIP) - ipip.ori.org'
                    )}
                  </p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
