import type { Metadata } from 'next';

import { Breadcrumbs, Section } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description:
    'Quelles données LotoLab IA collecte, pourquoi, combien de temps, et comment exercer ' +
    'vos droits RGPD : accès, export, rectification et suppression.',
  alternates: { canonical: '/confidentialite' },
};

export default function PrivacyPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Confidentialité' }]} />
      <h1 className="text-2xl font-bold">Politique de confidentialité</h1>
      <p className="text-xs opacity-60">Dernière mise à jour : 14 juillet 2026</p>

      <Section title="Ce que nous collectons — et rien de plus">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left dark:border-slate-700">
                <th className="py-2 pr-4">Donnée</th>
                <th className="py-2 pr-4">Finalité</th>
                <th className="py-2">Base légale</th>
              </tr>
            </thead>
            <tbody className="opacity-90">
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-1.5 pr-4">Adresse e-mail</td>
                <td className="py-1.5 pr-4">Création et gestion du compte</td>
                <td className="py-1.5">Exécution du contrat</td>
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-1.5 pr-4">Grilles enregistrées, favoris, préférences</td>
                <td className="py-1.5 pr-4">Fonctionnalités du service, synchronisation</td>
                <td className="py-1.5">Exécution du contrat</td>
              </tr>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-1.5 pr-4">Consentements (publicité, mesure d&apos;audience)</td>
                <td className="py-1.5 pr-4">Respect de vos choix</td>
                <td className="py-1.5">Consentement (révocable)</td>
              </tr>
              <tr>
                <td className="py-1.5 pr-4">Journaux techniques (sans contenu sensible)</td>
                <td className="py-1.5 pr-4">Sécurité, prévention des abus</td>
                <td className="py-1.5">Intérêt légitime</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm opacity-90">
          Aucune donnée sensible n&apos;est collectée. Aucune donnée n&apos;est vendue. Aucune
          publicité personnalisée sans votre consentement explicite (désactivé par défaut).
        </p>
      </Section>

      <Section title="Durées de conservation">
        <ul className="list-disc space-y-1 pl-5 text-sm opacity-90">
          <li>Compte et données associées : jusqu&apos;à suppression par vous, ou après 24 mois d&apos;inactivité (avec notification préalable).</li>
          <li>Journaux techniques : 12 mois maximum.</li>
          <li>Journal d&apos;audit administrateur : 24 mois (obligation de traçabilité).</li>
        </ul>
      </Section>

      <Section title="Vos droits (RGPD)">
        <p className="text-sm opacity-90">
          Accès, rectification, portabilité (export JSON en libre-service dans l&apos;application),
          effacement (suppression de compte en libre-service), limitation et opposition. Contact :
          reine.elie@gmail.com. Vous pouvez saisir la CNIL
          (cnil.fr) si vous estimez vos droits non respectés.
        </p>
      </Section>

      <Section title="Sous-traitants">
        <ul className="list-disc space-y-1 pl-5 text-sm opacity-90">
          <li>Supabase (base de données et authentification) — région eu-west-3 (Paris), UE.</li>
          <li>Netlify (hébergement du site web).</li>
          <li>[À compléter : hébergeur API, prestataire e-mail, régie publicitaire si activée.]</li>
        </ul>
      </Section>
    </div>
  );
}
