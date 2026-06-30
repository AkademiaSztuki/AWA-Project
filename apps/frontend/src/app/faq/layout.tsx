import type { ReactNode } from 'react';
import { JsonLd } from '@/components/seo/JsonLd';
import { getAllFaqItems } from '@/lib/faq/content';
import { buildFaqPageJsonLd } from '@/lib/seo/json-ld';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { FAQ_SEO } from '@/lib/seo/routes';

export const metadata = buildPageMetadata(FAQ_SEO);

export default function FaqLayout({ children }: { children: ReactNode }) {
  const faqItems = getAllFaqItems().map((item) => ({
    question: item.pl.question,
    answer: item.pl.answer,
  }));

  return (
    <>
      <JsonLd data={buildFaqPageJsonLd(faqItems)} />
      {children}
    </>
  );
}
