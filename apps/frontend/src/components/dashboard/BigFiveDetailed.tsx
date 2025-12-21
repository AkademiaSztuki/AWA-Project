"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { IPIP_FACET_LABELS } from '@/lib/questions/ipip-neo-120';

interface BigFiveScores {
  // IPIP-60 format
  openness?: number;
  conscientiousness?: number;
  extraversion?: number;
  agreeableness?: number;
  neuroticism?: number;
  // IPIP-NEO-120 format
  domains?: {
    O: number;
    C: number;
    E: number;
    A: number;
    N: number;
  };
  facets?: {
    O: { [key: number]: number };
    C: { [key: number]: number };
    E: { [key: number]: number };
    A: { [key: number]: number };
    N: { [key: number]: number };
  };
}

interface BigFiveDetailedProps {
  scores: BigFiveScores;
  responses?: Record<string, number>;
  completedAt?: string;
}

// Radar Chart Component (używając SVG)
export function RadarChart({ scores }: { scores: BigFiveScores }) {
  const dimensions = [
    { key: 'O', label: { pl: 'Otwartość', en: 'Openness' }, angle: 0 },
    { key: 'C', label: { pl: 'Sumienność', en: 'Conscientiousness' }, angle: 72 },
    { key: 'E', label: { pl: 'Ekstrawersja', en: 'Extraversion' }, angle: 144 },
    { key: 'A', label: { pl: 'Ugodowość', en: 'Agreeableness' }, angle: 216 },
    { key: 'N', label: { pl: 'Neurotyczność', en: 'Neuroticism' }, angle: 288 }
  ];

  const { language } = useLanguage();
  const centerX = 200;
  const centerY = 200;
  const maxRadius = 150;

  // Get scores from either format
  const getScore = (key: string): number => {
    // Try IPIP-NEO-120 format first
    if (scores.domains && key in scores.domains) {
      const value = scores.domains[key as 'O' | 'C' | 'E' | 'A' | 'N'];
      
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'sync-check',
          hypothesisId: 'H18',
          location: 'BigFiveDetailed.tsx:getScore-domains',
          message: 'Getting score from domains',
          data: {
            key,
            hasDomains: !!scores.domains,
            domainsKeys: scores.domains ? Object.keys(scores.domains) : [],
            domainsValues: scores.domains ? Object.values(scores.domains) : [],
            keyInDomains: key in (scores.domains || {}),
            value,
            valueType: typeof value,
            willReturn: typeof value === 'number' ? value : 50
          },
          timestamp: Date.now()
        })
      }).catch(() => {});
      // #endregion
      
      if (typeof value === 'number') {
        return value;
      }
    }
    
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'sync-check',
        hypothesisId: 'H18',
        location: 'BigFiveDetailed.tsx:getScore-fallback',
        message: 'Domain not found, using default 50',
        data: {
          key,
          hasDomains: !!scores.domains,
          domainsKeys: scores.domains ? Object.keys(scores.domains) : [],
          keyInDomains: key in (scores.domains || {})
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion
    
    // IPIP-60 removed - return 50 if domain not found
    return 50;
  };

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
    const score = getScore(dim.key);
    
    // #region agent log
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'sync-check',
        hypothesisId: 'H19',
        location: 'BigFiveDetailed.tsx:RadarChart-points',
        message: 'Creating polygon point',
        data: {
          key: dim.key,
          score,
          angle: dim.angle
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion
    
    return getPoint(score, dim.angle);
  });

  const pathData = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`
  ).join(' ') + ' Z';
  
  // #region agent log
  void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'sync-check',
      hypothesisId: 'H19',
      location: 'BigFiveDetailed.tsx:RadarChart-pathData',
      message: 'PathData created',
      data: {
        pathData,
        pointsCount: points.length,
        scores: dimensions.map(d => ({ key: d.key, score: getScore(d.key) }))
      },
      timestamp: Date.now()
    })
  }).catch(() => {});
  // #endregion

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
        const score = getScore(dim.key);
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

// Facet Chart Component (mini radar for 6 facets within a domain)
function FacetChart({ 
  domain, 
  facetScores 
}: { 
  domain: 'O' | 'C' | 'E' | 'A' | 'N';
  facetScores: { [key: number]: number }
}) {
  const { language } = useLanguage();
  const labels = IPIP_FACET_LABELS[domain];
  
  // Create dimensions for 6 facets
  const facets = Object.entries(labels).map(([num, label]) => ({
    num: parseInt(num),
    label: label[language as 'pl' | 'en'],
    angle: (parseInt(num) - 1) * (360 / 6) // 6 evenly spaced facets
  }));

  const centerX = 150;
  const centerY = 150;
  const maxRadius = 120;

  const getPoint = (score: number, angle: number) => {
    const radius = (score / 100) * maxRadius;
    const radian = (angle - 90) * (Math.PI / 180);
    return {
      x: centerX + radius * Math.cos(radian),
      y: centerY + radius * Math.sin(radian)
    };
  };

  const points = facets.map(facet => 
    getPoint(facetScores[facet.num] || 50, facet.angle)
  );

  const pathData = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`
  ).join(' ') + ' Z';

  const rings = [20, 40, 60, 80, 100];

  return (
    <svg width="300" height="300" viewBox="0 0 300 300" className="mx-auto my-4">
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
      {facets.map(facet => {
        const endPoint = getPoint(100, facet.angle);
        return (
          <line
            key={facet.num}
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
          r="5"
          fill="rgb(212, 175, 55)"
        />
      ))}

      {/* Labels */}
      {facets.map(facet => {
        const labelPoint = getPoint(115, facet.angle);
        const score = facetScores[facet.num] || 0;
        return (
          <g key={facet.num}>
            <text
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              className="text-xs font-nasalization fill-graphite"
            >
              {facet.label}
            </text>
            <text
              x={labelPoint.x}
              y={labelPoint.y + 12}
              textAnchor="middle"
              className="text-[10px] font-modern fill-gold font-bold"
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
export function DomainDescription({ domain, score, facets }: { domain: 'O' | 'C' | 'E' | 'A' | 'N'; score: number; facets?: { [key: number]: number } }) {
  const { language } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  const descriptions = {
    O: {
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
    C: {
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
    E: {
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
    A: {
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
    N: {
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

  const hasFacets = facets && Object.keys(facets).length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <GlassCard className="p-6">
        {/* Clickable header */}
        <div 
          className={`flex items-center justify-between mb-4 ${hasFacets ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
          onClick={() => hasFacets && setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            {hasFacets && (
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown size={24} className="text-gold" />
              </motion.div>
            )}
            <h3 className="text-xl font-nasalization text-graphite">
              {domainData.label[language as 'pl' | 'en']}
            </h3>
          </div>
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

        {/* Expanded facets chart */}
        <AnimatePresence>
          {isExpanded && facets && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="mt-6 pt-6 border-t border-white/20">
                <FacetChart domain={domain} facetScores={facets} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </motion.div>
  );
}

export function BigFiveDetailed({ scores, responses, completedAt }: BigFiveDetailedProps) {
  const { language } = useLanguage();
  const router = useRouter();

  const t = (pl: string, en: string) => (language === 'pl' ? pl : en);
  
  // #region agent log
  React.useEffect(() => {
    void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'sync-check',
        hypothesisId: 'H17',
        location: 'BigFiveDetailed.tsx:component-received',
        message: 'BigFiveDetailed received scores',
        data: {
          hasScores: !!scores,
          hasDomains: !!scores?.domains,
          domainsKeys: scores?.domains ? Object.keys(scores.domains) : [],
          domainsValues: scores?.domains ? Object.values(scores.domains) : [],
          domainsO: scores?.domains?.O,
          domainsC: scores?.domains?.C,
          domainsE: scores?.domains?.E,
          domainsA: scores?.domains?.A,
          domainsN: scores?.domains?.N,
          scoresStringified: JSON.stringify(scores)
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
  }, [scores]);
  // #endregion

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
              {t('Big Five (IPIP-NEO-120) - Szczegółowa Analiza', 'Big Five (IPIP-NEO-120) - Detailed Analysis')}
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

            {(() => {
              // Get domains from either format
              const domainMap: Record<string, number> = {};
              if (scores.domains) {
                // IPIP-NEO-120 format - use O/C/E/A/N directly
                Object.entries(scores.domains).forEach(([key, value]) => {
                  if (typeof value === 'number' && ['O', 'C', 'E', 'A', 'N'].includes(key)) {
                    domainMap[key] = value;
                  }
                });
              }
              // IPIP-60 removed - only IPIP-NEO-120 format (O/C/E/A/N) is supported
              
              // #region agent log
              void fetch('http://127.0.0.1:7242/ingest/03aa0d24-0050-48c3-a4eb-4c5924b7ecb7', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sessionId: 'debug-session',
                  runId: 'sync-check',
                  hypothesisId: 'H15',
                  location: 'BigFiveDetailed.tsx:domain-mapping',
                  message: 'Mapping domains for descriptions',
                  data: {
                    hasDomains: !!scores.domains,
                    domainsKeys: scores.domains ? Object.keys(scores.domains) : [],
                    domainsValues: scores.domains ? Object.values(scores.domains) : [],
                    domainMapKeys: Object.keys(domainMap),
                    domainMapValues: Object.values(domainMap),
                    domainO: domainMap.O,
                    domainC: domainMap.C,
                    domainE: domainMap.E,
                    domainA: domainMap.A,
                    domainN: domainMap.N
                  },
                  timestamp: Date.now()
                })
              }).catch(() => {});
              // #endregion
              
              // Ensure we have all 5 domains in correct order (O, C, E, A, N)
              const orderedDomains = ['O', 'C', 'E', 'A', 'N'].map(key => ({
                key,
                score: domainMap[key] || 50 // Fallback to 50 if missing
              }));
              
              return orderedDomains.map(({ key, score }, index) => {
                // Get facet scores if available
                const facetScores = scores.facets?.[key as 'O' | 'C' | 'E' | 'A' | 'N'];
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <DomainDescription
                      domain={key as 'O' | 'C' | 'E' | 'A' | 'N'}
                      score={score}
                      facets={facetScores}
                    />
                  </motion.div>
                );
              });
            })()}
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
                    'Test Big Five (IPIP-NEO-120) to rozbudowana, naukowo zweryfikowana wersja modelu pięciu wielkich czynników osobowości, obejmująca zarówno domeny główne, jak i 30 szczegółowych facetów.',
                    'The Big Five test (IPIP-NEO-120) is an extended, scientifically validated version of the five-factor personality model, covering both the main domains and 30 detailed facets.'
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
