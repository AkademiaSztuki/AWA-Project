import type { MetadataRoute } from 'next';
import { INDEXABLE_ROUTES } from '@/lib/seo/routes';
import { getSiteUrl } from '@/lib/seo/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();

  return INDEXABLE_ROUTES.map((route) => ({
    url: route.path === '/' ? siteUrl : `${siteUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency ?? 'monthly',
    priority: route.priority ?? 0.5,
  }));
}
