import type { MetadataRoute } from 'next';

const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/rules', '/corrections', '/privacy', '/terms'].map((p) => ({
    url: `${BASE}${p}`,
    changeFrequency: p === '/rules' ? 'weekly' : 'monthly',
    priority: p === '' ? 1 : 0.6,
  }));
}
