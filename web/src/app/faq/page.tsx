import type { Metadata } from 'next';

import { SITE_URL } from '@/lib/api';
import { Breadcrumbs, Disclaimer, Section } from '@/components/ui';

export const metadata: Metadata = {
  title: 'FAQ — questions fréquentes sur LotoLab IA',
  description:
    'LotoLab IA prédit-il les numéros ? D’où viennent les données ? Que contient l’offre ' +
    'Premium ? Les réponses claires aux questions les plus fréquentes.',
  alternates: { canonical: '/faq' },
};

const FAQ = [
  {
    q: 'LotoLab IA peut-il prédire les numéros du prochain tirage ?',
    a: 'Non, et aucun outil ne le peut. Les tirages du Loto sont aléatoires et indépendants : chaque combinaison valide a exactement la même probabilité à chaque tirage. LotoLab IA fournit des statistiques descriptives sur le passé, jamais des prédictions.',
  },
  {
    q: "D'où viennent les données des tirages ?",
    a: "Des publications officielles de l'opérateur du Loto (fichiers historiques publics). Chaque tirage importé est validé, dédoublonné et tracé (source et heure de récupération). Les données douteuses sont mises en quarantaine et vérifiées manuellement.",
  },
  {
    q: 'Le générateur augmente-t-il mes chances de gagner ?',
    a: "Non. Les méthodes du générateur (aléatoire, pondération par fréquence ou retard, équilibrages…) sont des expériences statistiques transparentes. Toute grille valide conserve la même probabilité théorique de gain : 1 sur 19 068 840 pour le rang 1.",
  },
  {
    q: 'Que signifie le « retard » d’un numéro ?',
    a: "Le nombre de tirages écoulés depuis sa dernière sortie. C'est une mesure descriptive : un retard élevé n'augmente pas la probabilité de sortie au prochain tirage (croire l'inverse est le « sophisme du joueur »).",
  },
  {
    q: 'Que contient l’offre Premium ?',
    a: "La suppression des publicités, l'historique complet, les statistiques avancées (triplets, comparaisons), les exports PDF/CSV illimités, les simulations étendues, la génération multiple et les grilles enregistrées illimitées. La version gratuite couvre les statistiques principales.",
  },
  {
    q: 'LotoLab IA est-il lié à la FDJ ?',
    a: "Non. LotoLab IA est un outil indépendant d'analyse statistique. Il n'est affilié ni à la FDJ ni à aucun opérateur de jeux, et ne permet pas de jouer.",
  },
  {
    q: 'Comment supprimer mon compte et mes données ?',
    a: 'Depuis l’application : Profil → Supprimer mon compte. La suppression est immédiate et définitive (compte, grilles, favoris, préférences, notifications). Vous pouvez aussi exporter toutes vos données en JSON au préalable.',
  },
];

export default function FaqPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url: `${SITE_URL}/faq`,
    mainEntity: FAQ.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  return (
    <div className="space-y-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumbs items={[{ label: 'FAQ' }]} />
      <h1 className="text-2xl font-bold">Questions fréquentes</h1>
      <Section title="FAQ">
        <dl className="space-y-5">
          {FAQ.map((item) => (
            <div key={item.q}>
              <dt className="font-semibold">{item.q}</dt>
              <dd className="mt-1 text-sm opacity-85">{item.a}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Disclaimer />
    </div>
  );
}
