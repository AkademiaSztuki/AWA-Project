import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { PRIVACY_SEO } from '@/lib/seo/routes';

export const metadata = buildPageMetadata(PRIVACY_SEO);

export default function PrivacyLayout({ children }: { children: ReactNode }) {
  return children;
}
