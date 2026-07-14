import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Breadcrumbs, Disclaimer } from '@/components/ui';

export const revalidate = 3600;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

interface Content {
  slug: string;
  title: string;
  meta_description: string | null;
  body_md: string;
  updated_at: string;
}

async function fetchContent(slug: string): Promise<Content | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  try {
    const response = await fetch(`${API_BASE}/api/v1/content/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!response.ok) return null;
    return (await response.json()) as Content;
  } catch {
    return null;
  }
}

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const content = await fetchContent(params.slug);
  if (!content) return { robots: { index: false } };
  return {
    title: content.title,
    description: content.meta_description ?? undefined,
    alternates: { canonical: `/blog/${content.slug}` },
  };
}

/** Rendu Markdown volontairement minimal et sûr (titres, gras, listes, paragraphes). */
function renderMarkdown(markdown: string): React.ReactNode[] {
  const blocks = markdown.split(/\n{2,}/);
  return blocks.map((block, index) => {
    const trimmed = block.trim();
    if (trimmed.startsWith('## ')) {
      return <h2 key={index} className="mt-6 text-lg font-semibold">{trimmed.slice(3)}</h2>;
    }
    if (trimmed.startsWith('# ')) {
      return <h2 key={index} className="mt-6 text-xl font-semibold">{trimmed.slice(2)}</h2>;
    }
    if (trimmed.split('\n').every((line) => line.startsWith('- '))) {
      return (
        <ul key={index} className="list-disc space-y-1 pl-5">
          {trimmed.split('\n').map((line, itemIndex) => (
            <li key={itemIndex}>{line.slice(2)}</li>
          ))}
        </ul>
      );
    }
    return <p key={index}>{trimmed}</p>;
  });
}

export default async function BlogArticlePage({ params }: Props) {
  const content = await fetchContent(params.slug);
  if (!content) notFound();

  return (
    <article className="space-y-6">
      <Breadcrumbs items={[{ label: 'Blog', href: '/blog' }, { label: content.title }]} />
      <h1 className="text-2xl font-bold">{content.title}</h1>
      <p className="text-xs opacity-60">
        Mis à jour le {new Date(content.updated_at).toLocaleDateString('fr-FR')}
      </p>
      <div className="max-w-3xl space-y-4 text-[15px] leading-relaxed opacity-90">
        {renderMarkdown(content.body_md)}
      </div>
      <Disclaimer />
    </article>
  );
}
