import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { CONTACT_SEO } from '@/lib/seo/routes';

export const metadata = buildPageMetadata(CONTACT_SEO);

export default function ContactLayout({ children }: { children: ReactNode }) {
  return children;
}
