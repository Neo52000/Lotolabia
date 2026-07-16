'use client';

import { useState } from 'react';

import { AdminCard, AdminMessage, formatTs, StatusBadge, useAdminData } from '@/components/admin';
import { adminFetch } from '@/lib/adminApi';

interface SeoContent {
  slug: string;
  title: string;
  meta_description: string | null;
  body_md: string;
  published: boolean;
  updated_at: string;
}

interface BacklogTopic {
  slug: string;
  kind: string;
  title: string;
  refresh: boolean;
}

const EMPTY: SeoContent = {
  slug: '',
  title: '',
  meta_description: '',
  body_md: '',
  published: false,
  updated_at: '',
};

const KIND_LABELS: Record<string, string> = {
  evergreen: 'Pédagogique',
  monthly_recap: 'Bilan mensuel',
  yearly_recap: 'Bilan annuel',
  rolling_top: 'Palmarès glissant',
};

export default function AdminSeoPage() {
  const { data, error, loading, reload } = useAdminData<SeoContent[]>('/api/v1/admin/seo');
  const backlog = useAdminData<BacklogTopic[]>('/api/v1/admin/content/backlog');
  const [editing, setEditing] = useState<SeoContent>(EMPTY);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function generateNow() {
    setGenerating(true);
    setMessage(null);
    setActionError(null);
    try {
      const result = await adminFetch<{ published: string[] }>('/api/v1/admin/content/generate', {
        method: 'POST',
      });
      setMessage(
        result.published.length > 0
          ? `${result.published.length} article(s) publié(s)/rafraîchi(s) : ${result.published.join(', ')}.`
          : 'Aucun nouvel article à produire pour le moment (backlog épuisé, en attente de nouvelles données).',
      );
      await reload();
      await backlog.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur inattendue');
    } finally {
      setGenerating(false);
    }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setActionError(null);
    try {
      await adminFetch('/api/v1/admin/seo', {
        method: 'PUT',
        body: {
          slug: editing.slug,
          title: editing.title,
          meta_description: editing.meta_description || null,
          body_md: editing.body_md,
          published: editing.published,
        },
      });
      setMessage(`Contenu « ${editing.slug} » enregistré.`);
      setEditing(EMPTY);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur inattendue');
    }
  }

  async function remove(slug: string) {
    if (!window.confirm(`Supprimer le contenu « ${slug} » ?`)) return;
    try {
      await adminFetch(`/api/v1/admin/seo/${slug}`, { method: 'DELETE' });
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur inattendue');
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">Contenus SEO / Blog</h1>
        <button
          onClick={generateNow}
          disabled={generating}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-night disabled:opacity-50"
        >
          {generating ? 'Génération…' : 'Générer maintenant'}
        </button>
      </div>
      <p className="mb-4 max-w-3xl text-sm opacity-80">
        Les contenus publiés apparaissent sur le site public (/blog/slug). En plus de
        l&apos;édition manuelle ci-dessous, un service planifié produit régulièrement de
        nouveaux articles à partir des vraies statistiques (jamais de donnée inventée,
        vocabulaire proscrit bloqué automatiquement — voir docs/SEO.md).
      </p>
      <AdminMessage error={error ?? actionError} info={message} />

      <AdminCard title={`Prochains sujets à produire (${backlog.data?.length ?? 0})`}>
        {backlog.data && backlog.data.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {backlog.data.map((topic) => (
              <li key={topic.slug} className="flex flex-wrap items-center gap-3">
                <StatusBadge status={topic.refresh ? 'pending' : 'success'} />
                <span className="text-xs opacity-60">
                  {KIND_LABELS[topic.kind] ?? topic.kind}
                </span>
                <span className="font-mono text-xs">{topic.slug}</span>
                <span className="flex-1">{topic.title}</span>
                {topic.refresh && <span className="text-xs opacity-60">rafraîchi à chaque exécution</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm opacity-70">
            {backlog.loading ? 'Chargement…' : 'Backlog vide pour le moment.'}
          </p>
        )}
      </AdminCard>

      <AdminCard title={editing.slug ? `Édition : ${editing.slug}` : 'Nouveau contenu'}>
        <form onSubmit={save} className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-3">
            <input
              required
              pattern="[a-z0-9-]+"
              placeholder="slug-de-la-page"
              value={editing.slug}
              onChange={(event) => setEditing({ ...editing, slug: event.target.value })}
              className="rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
            />
            <input
              required
              placeholder="Titre de la page"
              value={editing.title}
              onChange={(event) => setEditing({ ...editing, title: event.target.value })}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
            />
          </div>
          <input
            placeholder="Meta description (SEO, 150-160 caractères)"
            maxLength={300}
            value={editing.meta_description ?? ''}
            onChange={(event) => setEditing({ ...editing, meta_description: event.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          />
          <textarea
            required
            rows={10}
            placeholder="Contenu en Markdown (## titres, - listes, paragraphes)"
            value={editing.body_md}
            onChange={(event) => setEditing({ ...editing, body_md: event.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs dark:border-slate-600 dark:bg-slate-800"
          />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={editing.published}
              onChange={(event) => setEditing({ ...editing, published: event.target.checked })}
            />
            Publié
          </label>
          <div className="flex gap-2">
            <button type="submit" className="rounded-xl bg-brand px-4 py-2 font-semibold text-night">
              Enregistrer
            </button>
            {editing.slug && (
              <button
                type="button"
                onClick={() => setEditing(EMPTY)}
                className="rounded-xl border border-slate-300 px-4 py-2 dark:border-slate-600"
              >
                Annuler
              </button>
            )}
          </div>
        </form>
      </AdminCard>

      <AdminCard title={`Contenus existants (${data?.length ?? 0})`}>
        {data && data.length > 0 ? (
          <ul className="space-y-2 text-sm">
            {data.map((content) => (
              <li key={content.slug} className="flex flex-wrap items-center gap-3">
                <StatusBadge status={content.published ? 'success' : 'pending'} />
                <span className="font-mono text-xs">{content.slug}</span>
                <span className="flex-1">{content.title}</span>
                <span className="text-xs opacity-60">{formatTs(content.updated_at)}</span>
                <button onClick={() => setEditing(content)} className="text-xs text-brand hover:underline">
                  Éditer
                </button>
                <button onClick={() => remove(content.slug)} className="text-xs text-brand-pink hover:underline">
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm opacity-70">{loading ? 'Chargement…' : 'Aucun contenu.'}</p>
        )}
      </AdminCard>
    </div>
  );
}
