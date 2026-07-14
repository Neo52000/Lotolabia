import type { MetadataRoute } from 'next';

import { api, SITE_URL } from '@/lib/api';

/**
 * Sitemap dynamique : pages statiques + pages par numéro + pages par
 * tirage/année/mois (uniquement si des données existent, pour ne jamais
 * référencer de pages vides).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages = [
    '', '/resultats', '/historique', '/statistiques', '/frequences', '/retards',
    '/comparaisons', '/generateur', '/simulations', '/methodologie', '/probabilites',
    '/jeu-responsable', '/faq', '/blog', '/confidentialite', '/contact',
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: path === '' ? 1 : 0.7,
  }));

  const entries: MetadataRoute.Sitemap = [...staticPages];

  const overview = await api.frequencies();
  const hasData = overview !== null && overview.draw_count > 0;
  if (!hasData) return entries;

  for (let n = 1; n <= 49; n++) {
    entries.push({
      url: `${SITE_URL}/numero/${n}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    });
  }
  for (let n = 1; n <= 10; n++) {
    entries.push({
      url: `${SITE_URL}/numero-chance/${n}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.5,
    });
  }

  // Pages par tirage (les 500 plus récents pour garder un sitemap raisonnable)
  const draws = await api.draws(1, 100);
  if (draws) {
    const years = new Set<string>();
    const months = new Set<string>();
    for (const draw of draws.items) {
      entries.push({
        url: `${SITE_URL}/tirage/${draw.draw_date}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.5,
      });
      const [year, month] = draw.draw_date.split('-');
      years.add(year);
      months.add(`${year}/${month}`);
    }
    for (const year of years) {
      entries.push({ url: `${SITE_URL}/historique/${year}`, lastModified: now, priority: 0.5 });
    }
    for (const month of months) {
      entries.push({ url: `${SITE_URL}/historique/${month}`, lastModified: now, priority: 0.4 });
    }
  }

  return entries;
}
