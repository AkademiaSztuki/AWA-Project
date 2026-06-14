import { headers } from 'next/headers';
import dynamic from 'next/dynamic';
import { FlowRoutePrefetch } from '@/components/navigation/FlowRoutePrefetch';
import { HomeMobileHeaderInit } from '@/components/marketing/HomeMobileHeaderInit';
import {
  HERO_EMPTY_ROOM_FILE,
  HERO_LCP_INTERIOR_SLIDE,
  heroInteriorImageSrc,
} from '@/lib/marketing/hero-interior-slides';
import { isLikelyMobileUserAgent } from '@/lib/marketing/detect-mobile-ua';
import { MARKETING_HERO_BLEED_INLINE_SCRIPT } from '@/lib/marketing/hero-bleed-inline-script';

const MarketingEntryScreen = dynamic(
  () => import('@/components/screens/MarketingEntryScreen'),
  { ssr: true }
);

export default function HomePage() {
  const mobileUa = isLikelyMobileUserAgent(headers().get('user-agent'));
  const heroPreloads = [
    heroInteriorImageSrc(HERO_EMPTY_ROOM_FILE),
    heroInteriorImageSrc(HERO_LCP_INTERIOR_SLIDE.file),
  ];

  return (
    <>
      {heroPreloads.map((href) => (
        <link key={href} rel="preload" as="image" href={href} fetchPriority="high" />
      ))}
      <FlowRoutePrefetch />
      <HomeMobileHeaderInit />
      <MarketingEntryScreen compactHeroHint={mobileUa} />
      <script
        dangerouslySetInnerHTML={{ __html: MARKETING_HERO_BLEED_INLINE_SCRIPT }}
      />
    </>
  );
}
