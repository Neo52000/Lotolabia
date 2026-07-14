import type { Metadata } from 'next';

import { INDEPENDENCE } from '@/lib/api';
import { Breadcrumbs, Disclaimer, Section } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Jeu responsable — garder le contrôle',
  description:
    'Restriction d’âge, conseils pour garder le contrôle, limites de notifications et ' +
    'ressources d’aide (Joueurs Info Service) : l’engagement jeu responsable de LotoLab IA.',
  alternates: { canonical: '/jeu-responsable' },
};

export default function ResponsibleGamingPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Jeu responsable' }]} />
      <h1 className="text-2xl font-bold">Jeu responsable</h1>

      <Section title="L'essentiel">
        <div className="space-y-2 text-sm opacity-90">
          <p>
            Le Loto est un jeu de hasard pur : chaque combinaison a la même probabilité à chaque
            tirage, quels que soient les résultats passés. LotoLab IA est un outil pédagogique
            d&apos;analyse descriptive — il ne fournit aucune prédiction et n&apos;augmente pas
            vos chances de gagner.
          </p>
          <p className="font-semibold">
            Les jeux d&apos;argent sont interdits aux personnes de moins de 18 ans.
          </p>
        </div>
      </Section>

      <Section title="Garder le contrôle">
        <ul className="list-disc space-y-1 pl-5 text-sm opacity-90">
          <li>Fixez-vous un budget de jeu mensuel et ne le dépassez jamais.</li>
          <li>Ne jouez jamais pour « vous refaire » après une perte.</li>
          <li>Le jeu est un divertissement, jamais une source de revenus.</li>
          <li>Prenez du recul si le jeu occupe vos pensées ou affecte vos proches.</li>
        </ul>
      </Section>

      <Section title="Nos engagements produit">
        <ul className="list-disc space-y-1 pl-5 text-sm opacity-90">
          <li>Avertissement statistique affiché avec chaque analyse et chaque grille générée.</li>
          <li>Notifications limitées (3 par semaine par défaut) et désactivables à tout moment.</li>
          <li>Aucun vocabulaire trompeur : jamais de « grille gagnante » ni de « numéros sûrs ».</li>
          <li>Aucune incitation commerciale ciblant les pertes ou les comportements compulsifs.</li>
          <li>Suppression de compte et des données en libre-service.</li>
        </ul>
      </Section>

      <Section title="Besoin d'aide ?">
        <div className="space-y-2 text-sm">
          <p className="text-lg font-bold">Joueurs Info Service — 09 74 75 13 13</p>
          <p className="opacity-80">
            Appel non surtaxé, 7 j/7 de 8 h à 2 h. Écoute, conseil et orientation, pour les joueurs
            comme pour leur entourage. En ligne :{' '}
            <a href="https://www.joueurs-info-service.fr" rel="noopener noreferrer" target="_blank" className="text-brand hover:underline">
              joueurs-info-service.fr
            </a>
          </p>
        </div>
      </Section>

      <p className="text-sm opacity-70">{INDEPENDENCE}</p>
      <Disclaimer />
    </div>
  );
}
