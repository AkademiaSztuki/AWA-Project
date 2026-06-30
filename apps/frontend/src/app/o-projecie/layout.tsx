import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { ABOUT_SEO } from '@/lib/seo/routes';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildResearchProjectJsonLd } from '@/lib/seo/json-ld';

export const metadata = buildPageMetadata(ABOUT_SEO);

export default function AboutProjectLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <JsonLd data={buildResearchProjectJsonLd()} />
      {children}
    </>
  );
}
