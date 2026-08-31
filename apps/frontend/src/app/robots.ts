import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/seo/site';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/api/share/', '/api/share-og/', '/s/'],
      disallow: [
        '/api/',
        '/dashboard/',
        '/research/',
        '/settings/',
        '/space/',
        '/auth/',
        '/flow/',
        '/setup/',
        '/subscription/success',
        '/subscription/cancel',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
