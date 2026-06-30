import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/seo/metadata';
import { PLANS_SEO } from '@/lib/seo/routes';

export const metadata = buildPageMetadata(PLANS_SEO);

export default function SubscriptionPlansLayout({ children }: { children: ReactNode }) {
  return children;
}
