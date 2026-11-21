import type { MetadataRoute } from 'next';

const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/** The site is public; the admin and individual shared verdicts are not for search engines. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/v/', '/auth'] },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
