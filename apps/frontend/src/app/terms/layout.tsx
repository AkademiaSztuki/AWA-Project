import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { TERMS_SEO } from '@/lib/seo/routes';

export const metadata = buildPageMetadata(TERMS_SEO);

export default function TermsLayout({ children }: { children: ReactNode }) {
  return children;
}
