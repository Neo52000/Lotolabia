import type { Metadata } from 'next';

import { INDEPENDENCE } from '@/lib/api';
import { Breadcrumbs, Section } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Mentions légales',
  description: 'Mentions légales du site LotoLab IA : éditeur, hébergement, propriété intellectuelle.',
  alternates: { canonical: '/mentions-legales' },
  robots: { index: false },
};

export default function LegalPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Mentions légales' }]} />
      <h1 className="text-2xl font-bold">Mentions légales</h1>
      <Section title="Éditeur">
        <p className="text-sm opacity-90">
          LotoLab IA — outil indépendant d&apos;analyse statistique, édité par Reine Elie.
          <br />
          RCS 100 208 883.
          <br />
          Directeur de la publication : Reine Elie.
          <br />
          Contact : reine.elie@gmail.com.
          <br />
          [À compléter avant mise en production : forme juridique, adresse du siège.]
        </p>
      </Section>
      <Section title="Hébergement">
        <p className="text-sm opacity-90">
          Site web : Netlify, Inc. — 512 2nd Street, San Francisco, CA 94107, USA.
          <br />
          Base de données : Supabase (région eu-west-3, Paris).
          <br />
          [À compléter : hébergeur de l&apos;API backend une fois choisi.]
        </p>
      </Section>
      <Section title="Indépendance">
        <p className="text-sm opacity-90">
          {INDEPENDENCE} Les noms « Loto » et « FDJ » sont utilisés à des fins strictement
          descriptives pour désigner le jeu public analysé ; toutes les marques citées demeurent
          la propriété de leurs titulaires respectifs.
        </p>
      </Section>
      <Section title="Propriété intellectuelle">
        <p className="text-sm opacity-90">
          Les contenus, analyses, graphismes et logiciels de LotoLab IA sont protégés. Les
          résultats officiels des tirages sont des données publiques ; leurs analyses statistiques
          présentées ici sont produites par LotoLab IA.
        </p>
      </Section>
    </div>
  );
}
