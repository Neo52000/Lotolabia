import type { Metadata } from 'next';

import { Breadcrumbs, Section } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Contacter l’équipe LotoLab IA : support, questions sur les données, presse.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Contact' }]} />
      <h1 className="text-2xl font-bold">Contact</h1>
      <Section title="Nous écrire">
        <p className="text-sm opacity-90">
          Support, question sur une statistique, exercice de vos droits RGPD ou demande presse :
          <br />
          <strong>[adresse e-mail de contact à configurer avant mise en production]</strong>
        </p>
        <p className="mt-3 text-sm opacity-80">
          Nous répondons généralement sous 48 h ouvrées. Pour la suppression de compte, utilisez
          directement l&apos;application (Profil → Supprimer mon compte) : c&apos;est immédiat.
        </p>
      </Section>
      <Section title="Signaler une erreur de données">
        <p className="text-sm opacity-90">
          Chaque tirage est importé depuis les publications officielles avec validation et
          traçabilité. Si vous constatez malgré tout une divergence, indiquez la date du tirage
          concerné : nous vérifions systématiquement contre la source officielle.
        </p>
      </Section>
    </div>
  );
}
