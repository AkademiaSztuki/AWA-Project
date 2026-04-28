"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/ui/GlassCard';
import { ArrowLeft, ArrowUp, ChevronDown, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { GlassButton } from '@/components/ui/GlassButton';
import { IPIP_FACET_LABELS } from '@/lib/questions/ipip-neo-120';

export type BigFiveDomainKey = 'O' | 'C' | 'E' | 'A' | 'N';

type BigFiveScoreValue = number | string | null | undefined;
type BigFiveFacetScores = Record<number | string, BigFiveScoreValue>;

interface BigFiveScores {
  // IPIP-60 format
  openness?: BigFiveScoreValue;
  conscientiousness?: BigFiveScoreValue;
  extraversion?: BigFiveScoreValue;
  agreeableness?: BigFiveScoreValue;
  neuroticism?: BigFiveScoreValue;
  // IPIP-NEO-120 format
  domains?: Partial<Record<BigFiveDomainKey, BigFiveScoreValue>>;
  facets?: Partial<Record<BigFiveDomainKey, BigFiveFacetScores>>;
}

interface BigFiveDetailedProps {
  scores: BigFiveScores;
  responses?: Record<string, number>;
  completedAt?: string;
}

const BIG_FIVE_DOMAIN_KEYS: BigFiveDomainKey[] = ['O', 'C', 'E', 'A', 'N'];

/** Big Five values from Cloud SQL / JSON may arrive as numbers or numeric strings. */
function coerceBigFivePercent(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

// Radar Chart Component (używając SVG)
export function RadarChart({
  scores,
  onDomainClick,
  activeDomain,
}: {
  scores: BigFiveScores;
  onDomainClick?: (domain: BigFiveDomainKey) => void;
  activeDomain?: BigFiveDomainKey | null;
}) {
  const dimensions: { key: BigFiveDomainKey; label: { pl: string; en: string }; angle: number }[] = [
    { key: 'O', label: { pl: 'Otwartość', en: 'Openness' }, angle: 0 },
    { key: 'C', label: { pl: 'Sumienność', en: 'Conscientiousness' }, angle: 72 },
    { key: 'E', label: { pl: 'Ekstrawersja', en: 'Extraversion' }, angle: 144 },
    { key: 'A', label: { pl: 'Ugodowość', en: 'Agreeableness' }, angle: 216 },
    { key: 'N', label: { pl: 'Neurotyczność', en: 'Neuroticism' }, angle: 288 }
  ];

  const { language } = useLanguage();
  /** Larger canvas + radius so the plot is visually dominant; margins fit long PL labels without clipping. */
  const size = 520;
  const centerX = size / 2;
  const centerY = size / 2;
  const maxRadius = 178;

  // Get scores from either format
  const getScore = (key: string): number => {
    // Try IPIP-NEO-120 format first
    if (scores.domains && key in scores.domains) {
      const value = coerceBigFivePercent(scores.domains[key as BigFiveDomainKey]);
      if (value !== null) return value;
    }
    
    
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
    
    
    return getPoint(score, dim.angle);
  });

  const pathData = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`
  ).join(' ') + ' Z';
  

  // Background rings — warm gold grid (readable on light glass)
  const rings = [20, 40, 60, 80, 100];
  const gridRingStroke = 'rgba(212, 175, 55, 0.32)';
  const axisStroke = 'rgba(212, 175, 55, 0.48)';
  const [hoveredDomain, setHoveredDomain] = useState<BigFiveDomainKey | null>(null);
  const [pointerOverChart, setPointerOverChart] = useState(false);
  const displayedPoints = points.map((point, i) => {
    const dim = dimensions[i];
    if (hoveredDomain !== dim.key) return point;
    const labelPoint = getPoint(110, dim.angle);
    return {
      x: point.x + (labelPoint.x - point.x) * 0.13,
      y: point.y + (labelPoint.y - point.y) * 0.13,
    };
  });
  const displayedPathData = displayedPoints.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`
  ).join(' ') + ' Z';
  const labelGroupVariants = {
    rest: { scale: 1 },
    hover: { scale: 1.11 },
    active: { scale: 1.08 },
  };
  const labelVariants = {
    rest: {
      fill: '#374151',
      filter: 'drop-shadow(0 0 0 rgba(255,229,92,0))',
    },
    hover: {
      fill: '#FFD700',
      filter: 'drop-shadow(0 0 7px rgba(255,229,92,0.62))',
    },
    active: {
      fill: '#FFD700',
      filter: 'drop-shadow(0 0 8px rgba(255,229,92,0.72))',
    },
  };

  return (
    <div
      className="mx-auto w-full max-w-[min(100%,520px)]"
      onPointerEnter={() => setPointerOverChart(true)}
      onPointerLeave={() => setPointerOverChart(false)}
    >
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="h-auto w-full shrink-0 select-none"
      role="img"
      aria-label={language === 'pl' ? 'Wykres radarowy Big Five' : 'Big Five radar chart'}
    >
      <defs>
        <filter id="big-five-radar-glow" x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="big-five-point-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,229,92,0.95)" />
          <stop offset="70%" stopColor="rgba(212,175,55,0.28)" />
          <stop offset="100%" stopColor="rgba(212,175,55,0)" />
        </radialGradient>
        <radialGradient
          id="big-five-ring-glow-overlay"
          gradientUnits="userSpaceOnUse"
          cx={centerX}
          cy={centerY}
          r={maxRadius}
        >
          <stop offset="0%" stopColor="rgba(255, 236, 165, 0.42)" />
          <stop offset="42%" stopColor="rgba(228, 198, 105, 0.21)" />
          <stop offset="100%" stopColor="rgba(212, 175, 55, 0.09)" />
        </radialGradient>
        {dimensions.map((dim) => {
          const end = getPoint(100, dim.angle);
          return (
            <linearGradient
              key={`axis-grad-${dim.key}`}
              id={`big-five-axis-glow-${dim.key}`}
              gradientUnits="userSpaceOnUse"
              x1={centerX}
              y1={centerY}
              x2={end.x}
              y2={end.y}
            >
              <stop offset="0%" stopColor="rgba(255, 236, 155, 0.38)" />
              <stop offset="100%" stopColor="rgba(212, 175, 55, 0.13)" />
            </linearGradient>
          );
        })}
      </defs>

      {/* Background rings */}
      {rings.map(ring => (
        <circle
          key={ring}
          cx={centerX}
          cy={centerY}
          r={(ring / 100) * maxRadius}
          fill="none"
          stroke={gridRingStroke}
          strokeWidth="1.15"
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
            stroke={axisStroke}
            strokeWidth="1.15"
          />
        );
      })}

      {/* Delicate grid halo (radial rings + axis wash from center) on chart hover */}
      <g
        className="pointer-events-none"
        style={{
          opacity: pointerOverChart ? 1 : 0,
          transition: 'opacity 0.42s ease',
        }}
        aria-hidden
      >
        {rings.map((ring) => (
          <circle
            key={`glow-ring-${ring}`}
            cx={centerX}
            cy={centerY}
            r={(ring / 100) * maxRadius}
            fill="none"
            stroke="url(#big-five-ring-glow-overlay)"
            strokeWidth="1.34"
          />
        ))}
        {dimensions.map((dim) => {
          const endPoint = getPoint(100, dim.angle);
          return (
            <line
              key={`glow-axis-${dim.key}`}
              x1={centerX}
              y1={centerY}
              x2={endPoint.x}
              y2={endPoint.y}
              stroke={`url(#big-five-axis-glow-${dim.key})`}
              strokeWidth="1.28"
            />
          );
        })}
      </g>

      {/* Data polygon */}
      <motion.path
        d={pathData}
        fill="none"
        stroke="rgba(255, 229, 92, 0.18)"
        strokeWidth="4"
        filter="url(#big-five-radar-glow)"
        animate={{ d: displayedPathData, opacity: hoveredDomain ? 0.36 : 0.2 }}
        transition={{ duration: 0.42, ease: 'easeInOut' }}
      />
      <motion.path
        d={pathData}
        fill="rgba(212, 175, 55, 0.24)"
        stroke="rgb(255, 229, 92)"
        strokeWidth="2.35"
        filter="url(#big-five-radar-glow)"
        animate={{ d: displayedPathData }}
        transition={{ duration: 0.42, ease: 'easeInOut' }}
      />

      {/* Data points */}
      {points.map((point, i) => (
        <g key={i}>
          <motion.circle
            cx={point.x}
            cy={point.y}
            r="9"
            fill="url(#big-five-point-glow)"
            animate={{
              cx: displayedPoints[i].x,
              cy: displayedPoints[i].y,
              opacity: hoveredDomain === dimensions[i].key ? 0.5 : 0.22,
              r: hoveredDomain === dimensions[i].key ? 11 : 8,
            }}
            transition={{ duration: 0.42, ease: 'easeInOut' }}
          />
          <motion.circle
            cx={point.x}
            cy={point.y}
            r="5"
            fill="rgb(255, 229, 92)"
            stroke="rgba(255,229,92,0.48)"
            strokeWidth="1"
            animate={{
              cx: displayedPoints[i].x,
              cy: displayedPoints[i].y,
              opacity: hoveredDomain === dimensions[i].key ? 1 : 0.86,
              r: hoveredDomain === dimensions[i].key ? 5.8 : 4.9,
            }}
            transition={{ duration: 0.42, ease: 'easeInOut' }}
          />
        </g>
      ))}

      {/* Labels + scores — highlight via text + spring scale (no hit circles) */}
      {dimensions.map(dim => {
        const labelPoint = getPoint(110, dim.angle);
        const score = getScore(dim.key);
        const isActive = activeDomain === dim.key;
        const label = dim.label[language as 'pl' | 'en'];
        const hint =
          language === 'pl'
            ? `Przejdź do opisu wymiaru: ${label}`
            : `Go to dimension details: ${label}`;
        const interactive = onDomainClick
          ? {
              role: 'button' as const,
              tabIndex: 0,
              onClick: () => onDomainClick(dim.key),
              onKeyDown: (e: React.KeyboardEvent<SVGGElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onDomainClick(dim.key);
                }
              },
              'aria-label': hint,
            }
          : {};

        return (
          <motion.g
            key={dim.key}
            className={
              onDomainClick
                ? 'cursor-pointer outline-none focus-visible:drop-shadow-[0_0_8px_rgba(255,229,92,0.9)]'
                : undefined
            }
            style={{ transformOrigin: `${labelPoint.x}px ${labelPoint.y}px` }}
            variants={labelGroupVariants}
            initial="rest"
            animate={isActive ? 'active' : 'rest'}
            whileHover="hover"
            onMouseEnter={() => setHoveredDomain(dim.key)}
            onMouseLeave={() => setHoveredDomain(null)}
            onFocus={() => setHoveredDomain(dim.key)}
            onBlur={() => setHoveredDomain(null)}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            {...interactive}
          >
            <motion.text
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              className={`font-nasalization ${isActive ? 'text-base font-semibold' : 'text-sm'}`}
              variants={labelVariants}
            >
              {label}
            </motion.text>
            <motion.text
              x={labelPoint.x}
              y={labelPoint.y + 22}
              textAnchor="middle"
              className={`font-modern font-bold ${isActive ? 'text-base sm:text-lg' : 'text-sm sm:text-base'}`}
              variants={labelVariants}
            >
              {score}%
            </motion.text>
          </motion.g>
        );
      })}
    </svg>
    </div>
  );
}

// Facet Chart — same visual language as main RadarChart (gold grid, larger type, room for labels)
function FacetChart({
  domain,
  facetScores,
}: {
  domain: 'O' | 'C' | 'E' | 'A' | 'N';
  facetScores: BigFiveFacetScores;
}) {
  const { language } = useLanguage();
  const labels = IPIP_FACET_LABELS[domain];

  const facets = Object.entries(labels).map(([num, label]) => ({
    num: parseInt(num, 10),
    label: label[language as 'pl' | 'en'],
    angle: (parseInt(num, 10) - 1) * (360 / 6),
  }));

  const size = 440;
  const centerX = size / 2;
  const centerY = size / 2;
  const maxRadius = 148;
  const labelRadiusPct = 118;
  const gridRingStroke = 'rgba(212, 175, 55, 0.32)';
  const axisStroke = 'rgba(212, 175, 55, 0.48)';
  const glowId = `facet-radar-glow-${domain}`;
  const pointGlowId = `facet-point-glow-${domain}`;
  const gridGlowBaseId = `facet-grid-glow-${domain}`;
  const labelVariants = {
    rest: {
      fill: '#374151',
      filter: 'drop-shadow(0 0 0 rgba(255,229,92,0))',
    },
    hover: {
      fill: '#FFD700',
      filter: 'drop-shadow(0 0 6px rgba(255,229,92,0.58))',
    },
  };

  const getPoint = (score: number, angle: number) => {
    const radius = (score / 100) * maxRadius;
    const radian = (angle - 90) * (Math.PI / 180);
    return {
      x: centerX + radius * Math.cos(radian),
      y: centerY + radius * Math.sin(radian),
    };
  };

  const points = facets.map((facet) => {
    const score = coerceBigFivePercent(facetScores[facet.num]) ?? 50;
    return getPoint(score, facet.angle);
  });

  const pathData =
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ') + ' Z';

  const rings = [20, 40, 60, 80, 100];
  const [hoveredFacet, setHoveredFacet] = useState<number | null>(null);
  const [pointerOverFacetChart, setPointerOverFacetChart] = useState(false);
  const displayedPoints = points.map((point, i) => {
    const facet = facets[i];
    if (hoveredFacet !== facet.num) return point;
    const labelPoint = getPoint(labelRadiusPct, facet.angle);
    return {
      x: point.x + (labelPoint.x - point.x) * 0.13,
      y: point.y + (labelPoint.y - point.y) * 0.13,
    };
  });
  const displayedPathData =
    displayedPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ') + ' Z';
  const labelGroupVariants = {
    rest: { scale: 1 },
    hover: { scale: 1.08 },
  };

  return (
    <div
      className="mx-auto my-4 w-full max-w-[min(100%,440px)]"
      onPointerEnter={() => setPointerOverFacetChart(true)}
      onPointerLeave={() => setPointerOverFacetChart(false)}
    >
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="h-auto w-full shrink-0 overflow-visible select-none"
      role="img"
      aria-label={language === 'pl' ? 'Wykres radarowy fasetów' : 'Facet radar chart'}
    >
      <defs>
        <filter id={glowId} x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="2.3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id={pointGlowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,229,92,0.95)" />
          <stop offset="70%" stopColor="rgba(212,175,55,0.28)" />
          <stop offset="100%" stopColor="rgba(212,175,55,0)" />
        </radialGradient>
        <radialGradient
          id={`${gridGlowBaseId}-ring`}
          gradientUnits="userSpaceOnUse"
          cx={centerX}
          cy={centerY}
          r={maxRadius}
        >
          <stop offset="0%" stopColor="rgba(255, 236, 165, 0.42)" />
          <stop offset="42%" stopColor="rgba(228, 198, 105, 0.21)" />
          <stop offset="100%" stopColor="rgba(212, 175, 55, 0.09)" />
        </radialGradient>
        {facets.map((facet) => {
          const end = getPoint(100, facet.angle);
          return (
            <linearGradient
              key={`facet-axis-grad-${facet.num}`}
              id={`${gridGlowBaseId}-axis-${facet.num}`}
              gradientUnits="userSpaceOnUse"
              x1={centerX}
              y1={centerY}
              x2={end.x}
              y2={end.y}
            >
              <stop offset="0%" stopColor="rgba(255, 236, 155, 0.38)" />
              <stop offset="100%" stopColor="rgba(212, 175, 55, 0.13)" />
            </linearGradient>
          );
        })}
      </defs>

      {rings.map((ring) => (
        <circle
          key={ring}
          cx={centerX}
          cy={centerY}
          r={(ring / 100) * maxRadius}
          fill="none"
          stroke={gridRingStroke}
          strokeWidth="1.15"
        />
      ))}

      {facets.map((facet) => {
        const endPoint = getPoint(100, facet.angle);
        return (
          <line
            key={facet.num}
            x1={centerX}
            y1={centerY}
            x2={endPoint.x}
            y2={endPoint.y}
            stroke={axisStroke}
            strokeWidth="1.15"
          />
        );
      })}

      <g
        className="pointer-events-none"
        style={{
          opacity: pointerOverFacetChart ? 1 : 0,
          transition: 'opacity 0.42s ease',
        }}
        aria-hidden
      >
        {rings.map((ring) => (
          <circle
            key={`glow-ring-${ring}`}
            cx={centerX}
            cy={centerY}
            r={(ring / 100) * maxRadius}
            fill="none"
            stroke={`url(#${gridGlowBaseId}-ring)`}
            strokeWidth="1.34"
          />
        ))}
        {facets.map((facet) => {
          const endPoint = getPoint(100, facet.angle);
          return (
            <line
              key={`glow-axis-${facet.num}`}
              x1={centerX}
              y1={centerY}
              x2={endPoint.x}
              y2={endPoint.y}
              stroke={`url(#${gridGlowBaseId}-axis-${facet.num})`}
              strokeWidth="1.28"
            />
          );
        })}
      </g>

      <motion.path
        d={pathData}
        fill="none"
        stroke="rgba(255, 229, 92, 0.18)"
        strokeWidth="4"
        filter={`url(#${glowId})`}
        animate={{ d: displayedPathData, opacity: hoveredFacet ? 0.36 : 0.2 }}
        transition={{ duration: 0.42, ease: 'easeInOut' }}
      />
      <motion.path
        d={pathData}
        fill="rgba(212, 175, 55, 0.24)"
        stroke="rgb(255, 229, 92)"
        strokeWidth="2.35"
        filter={`url(#${glowId})`}
        animate={{ d: displayedPathData }}
        transition={{ duration: 0.42, ease: 'easeInOut' }}
      />

      {points.map((point, i) => (
        <g key={i}>
          <motion.circle
            cx={point.x}
            cy={point.y}
            r="9"
            fill={`url(#${pointGlowId})`}
            animate={{
              cx: displayedPoints[i].x,
              cy: displayedPoints[i].y,
              opacity: hoveredFacet === facets[i].num ? 0.5 : 0.22,
              r: hoveredFacet === facets[i].num ? 11 : 8,
            }}
            transition={{ duration: 0.42, ease: 'easeInOut' }}
          />
          <motion.circle
            cx={point.x}
            cy={point.y}
            r="5"
            fill="rgb(255, 229, 92)"
            stroke="rgba(255,229,92,0.48)"
            strokeWidth="1"
            animate={{
              cx: displayedPoints[i].x,
              cy: displayedPoints[i].y,
              opacity: hoveredFacet === facets[i].num ? 1 : 0.86,
              r: hoveredFacet === facets[i].num ? 5.8 : 4.9,
            }}
            transition={{ duration: 0.42, ease: 'easeInOut' }}
          />
        </g>
      ))}

      {facets.map((facet) => {
        const labelPoint = getPoint(labelRadiusPct, facet.angle);
        const score = coerceBigFivePercent(facetScores[facet.num]) ?? 0;
        return (
          <motion.g
            key={facet.num}
            style={{ transformOrigin: `${labelPoint.x}px ${labelPoint.y}px` }}
            variants={labelGroupVariants}
            initial="rest"
            whileHover="hover"
            onMouseEnter={() => setHoveredFacet(facet.num)}
            onMouseLeave={() => setHoveredFacet(null)}
            onFocus={() => setHoveredFacet(facet.num)}
            onBlur={() => setHoveredFacet(null)}
            transition={{ type: 'spring', stiffness: 420, damping: 24 }}
          >
            <motion.text
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              className="text-[11px] font-nasalization sm:text-xs md:text-sm"
              variants={labelVariants}
            >
              {facet.label}
            </motion.text>
            <motion.text
              x={labelPoint.x}
              y={labelPoint.y + 22}
              textAnchor="middle"
              className="font-modern text-sm font-bold sm:text-base md:text-lg"
              variants={labelVariants}
            >
              {score}%
            </motion.text>
          </motion.g>
        );
      })}
    </svg>
    </div>
  );
}

// Domain description component
export function DomainDescription({
  domain,
  score,
  facets,
  sectionId,
  facetsExpanded,
  onFacetsExpandedChange,
}: {
  domain: BigFiveDomainKey;
  score: number;
  facets?: BigFiveFacetScores;
  /** Anchor id for scroll-into-view (e.g. big-five-domain-O) */
  sectionId?: string;
  /** When set together with onFacetsExpandedChange, facet expansion is controlled by parent (e.g. radar click). */
  facetsExpanded?: boolean;
  onFacetsExpandedChange?: (expanded: boolean) => void;
}) {
  const { language } = useLanguage();
  const [internalExpanded, setInternalExpanded] = useState(false);
  const controlled =
    typeof facetsExpanded === 'boolean' && typeof onFacetsExpandedChange === 'function';
  const isExpanded = controlled ? facetsExpanded : internalExpanded;

  const setFacetsOpen = (next: boolean) => {
    if (controlled) {
      onFacetsExpandedChange(next);
    } else {
      setInternalExpanded(next);
    }
  };

  const descriptions = {
    O: {
      label: { pl: 'Otwartość', en: 'Openness' },
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
      id={sectionId}
      className="scroll-mt-28 sm:scroll-mt-36"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <GlassCard className="p-6">
        {/* Clickable header */}
        <div
          className={`flex items-center justify-between mb-4 ${hasFacets ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
          onClick={() => {
            if (!hasFacets) return;
            const willOpen = !isExpanded;
            setFacetsOpen(willOpen);
            if (willOpen && sectionId) {
              window.setTimeout(() => {
                document.getElementById(sectionId)?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'center',
                  inline: 'nearest',
                });
              }, 280);
            }
          }}
        >
          <div className="flex items-center gap-3">
            {hasFacets && (
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown size={24} className="text-gold" aria-hidden="true" />
              </motion.div>
            )}
            <h2 className="text-xl font-nasalization text-graphite">
              {domainData.label[language as 'pl' | 'en']}
            </h2>
          </div>
          <div className="text-3xl font-bold text-gold">{score}%</div>
        </div>

        {/* Progress bar — translucent glass track + semi-transparent gold fill (visible edge via border + inset highlight) */}
        <div className="mb-4 h-3 w-full overflow-hidden rounded-full border border-white/25 bg-white/[0.08] shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold-500/55 via-gold-500/45 to-gold-400/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] ring-1 ring-inset ring-white/20 transition-all duration-1000"
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

const IPIP_ORIGIN_HREF = 'https://ipip.ori.org';

/** Shared “about IPIP-NEO-120” block for dashboard personality and /flow/big-five. */
export function BigFiveAboutTestCard({ className }: { className?: string }) {
  const { language } = useLanguage();
  const t = (pl: string, en: string) => (language === 'pl' ? pl : en);

  return (
    <div className={className}>
      <GlassCard className="p-6">
        <h2 className="text-xl font-nasalization text-graphite mb-4">
          {t('O Teście Big Five', 'About the Big Five Test')}
        </h2>
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
                'Źródło: International Personality Item Pool (IPIP) — ',
                'Source: International Personality Item Pool (IPIP) — '
              )}
              <a
                href={IPIP_ORIGIN_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-gold underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 rounded"
              >
                ipip.ori.org
              </a>
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

export function BigFiveDetailed({ scores, responses, completedAt }: BigFiveDetailedProps) {
  const { language } = useLanguage();
  const router = useRouter();
  const [openFacetDomain, setOpenFacetDomain] = useState<BigFiveDomainKey | null>(null);
  const [radarOffscreen, setRadarOffscreen] = useState(false);

  const t = (pl: string, en: string) => (language === 'pl' ? pl : en);

  const domainMap: Partial<Record<BigFiveDomainKey, number>> = {};
  if (scores.domains) {
    Object.entries(scores.domains).forEach(([key, value]) => {
      if (BIG_FIVE_DOMAIN_KEYS.includes(key as BigFiveDomainKey)) {
        const score = coerceBigFivePercent(value);
        if (score !== null) {
          domainMap[key as BigFiveDomainKey] = score;
        }
      }
    });
  }
  const orderedDomains: { key: BigFiveDomainKey; score: number }[] = BIG_FIVE_DOMAIN_KEYS.map((key) => ({
    key,
    score: domainMap[key] ?? 50,
  }));
  const hasDomainScores = Boolean(scores.domains && Object.keys(scores.domains).length > 0);

  useEffect(() => {
    if (!hasDomainScores) {
      setRadarOffscreen(false);
      setOpenFacetDomain(null);
      return undefined;
    }
    const el = document.getElementById('big-five-radar-anchor');
    if (!el) return undefined;

    const updateBackButtonVisibility = () => {
      setRadarOffscreen(el.getBoundingClientRect().top < -120);
    };

    updateBackButtonVisibility();
    window.addEventListener('scroll', updateBackButtonVisibility, { passive: true });
    window.addEventListener('resize', updateBackButtonVisibility);

    return () => {
      window.removeEventListener('scroll', updateBackButtonVisibility);
      window.removeEventListener('resize', updateBackButtonVisibility);
    };
  }, [hasDomainScores, scores]);

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
            <div className="mb-4 flex flex-wrap gap-3">
              <GlassButton
                onClick={() => router.back()}
                variant="secondary"
              >
                <ArrowLeft size={20} className="mr-2" aria-hidden="true" />
                {t('Powrót', 'Back')}
              </GlassButton>
              <GlassButton
                onClick={() => router.push('/flow/big-five?from=dashboard&retake=true')}
                variant="secondary"
              >
                <RotateCcw size={18} className="mr-2" aria-hidden="true" />
                {t('Ponów test', 'Retake test')}
              </GlassButton>
            </div>

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

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-8"
          >
            <div id="big-five-radar-anchor" className="scroll-mt-28 sm:scroll-mt-36">
            <GlassCard className="p-4 sm:p-8 xl:bg-white/5 xl:backdrop-blur-md xl:border-white/15 lg:bg-white/5 lg:backdrop-blur-md lg:border lg:border-white/15">
              <p className="sr-only">
                {t(
                  'Etykiety przy osiach wykresu działają jak przyciski: otwierają szczegóły wymiaru poniżej.',
                  'Labels at each axis act as buttons: they open that dimension’s details below.'
                )}
              </p>
              <RadarChart
                scores={scores}
                activeDomain={openFacetDomain}
                onDomainClick={(d) => {
                  setOpenFacetDomain(d);
                  window.setTimeout(() => {
                    document.getElementById(`big-five-domain-${d}`)?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center',
                      inline: 'nearest',
                    });
                  }, 120);
                }}
              />
              <div className="mt-4 text-center text-sm text-silver-dark font-modern sm:mt-6">
                {t(
                  'Wykres pokazuje Twoje wyniki w pięciu głównych wymiarach osobowości.',
                  'The chart shows your scores in the five main personality dimensions.'
                )}
              </div>
            </GlassCard>
            </div>
          </motion.div>

          {/* Detailed Descriptions */}
          <div id="big-five-details-start" className="space-y-6">
            <h2 className="text-2xl font-nasalization text-graphite mb-4">
              {t('Szczegółowe Opisy Wymiarów', 'Detailed Dimension Descriptions')}
            </h2>

            {orderedDomains.map(({ key, score }, index) => {
              const facetScores = scores.facets?.[key];
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <DomainDescription
                    domain={key}
                    score={score}
                    facets={facetScores}
                    sectionId={`big-five-domain-${key}`}
                    facetsExpanded={openFacetDomain === key}
                    onFacetsExpandedChange={(open) => setOpenFacetDomain(open ? key : null)}
                  />
                </motion.div>
              );
            })}
          </div>

          {/* Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-8"
          >
            <BigFiveAboutTestCard />
          </motion.div>
        </div>
      </div>

      {hasDomainScores && radarOffscreen && (
        <GlassButton
          type="button"
          variant="secondary"
          onClick={() => {
            setRadarOffscreen(false);
            window.scrollTo({
              top: 0,
              behavior: 'smooth',
            });
          }}
          className="fixed bottom-6 right-4 z-[130] flex items-center gap-2 shadow-lg sm:right-8"
        >
          <ArrowUp size={18} aria-hidden="true" />
          {t('Wróć do wykresu', 'Back to chart')}
        </GlassButton>
      )}
    </div>
  );
}
