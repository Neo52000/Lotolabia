import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs, Section } from '@/components/ui';
import { supabasePublishedContents } from '@/lib/supabasePublic';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Blog — pédagogie des probabilités et actualités',
  description:
    'Articles pédagogiques sur les probabilités, les statistiques du Loto et les nouveautés ' +
    'de LotoLab IA, rédigés et publiés depuis le back-office.',
  alternates: { canonical: '/blog' },
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

interface ContentItem {
  slug: string;
  title: string;
  meta_description: string | null;
  updated_at: string;
}

async function fetchContents(): Promise<ContentItem[]> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/content`, { next: { revalidate: 3600 } });
    if (response.ok) {
      const data = (await response.json()) as ContentItem[];
      if (data.length > 0) return data;
    }
  } catch {
    // API indisponible — repli ci-dessous.
  }
  return supabasePublishedContents();
}

export default async function BlogPage() {
  const contents = await fetchContents();
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Blog' }]} />
      <h1 className="text-2xl font-bold">Blog</h1>
      {contents.length > 0 ? (
        <ul className="space-y-4">
          {contents.map((content) => (
            <li key={content.slug}>
              <Link href={`/blog/${content.slug}`} className="block rounded-2xl border border-slate-200 bg-white p-5 hover:border-brand dark:border-slate-700 dark:bg-slate-900">
                <h2 className="font-semibold">{content.title}</h2>
                {content.meta_description && (
                  <p className="mt-1 text-sm opacity-80">{content.meta_description}</p>
                )}
                <p className="mt-2 text-xs opacity-60">
                  Mis à jour le {new Date(content.updated_at).toLocaleDateString('fr-FR')}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Section title="Bientôt">
          <p className="text-sm opacity-80">
            Les premiers articles pédagogiques arrivent : probabilités expliquées simplement,
            lecture critique des « méthodes miracles », coulisses des statistiques du laboratoire.
          </p>
        </Section>
      )}
    </div>
  );
}
