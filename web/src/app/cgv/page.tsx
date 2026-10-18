import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs, Section } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Conditions générales de vente',
  description: 'Conditions générales de vente de l’abonnement LotoLab IA Premium.',
  alternates: { canonical: '/cgv' },
  robots: { index: false },
};

const text = 'text-sm leading-relaxed opacity-90';

export default function CgvPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Conditions générales de vente' }]} />
      <h1 className="text-2xl font-bold">Conditions générales de vente — LotoLab IA Premium</h1>

      <Section title="1. Vendeur">
        <p className={text}>
          LotoLab IA, outil indépendant d&apos;analyse statistique, édité par Reine Elie — RCS
          100 208 883. Contact :{' '}
          <a href="mailto:reine.elie@gmail.com" className="underline">reine.elie@gmail.com</a>.
          <br />
          [À compléter avant mise en production : forme juridique, adresse.] Voir aussi les{' '}
          <Link href="/mentions-legales" className="underline">mentions légales</Link>.
        </p>
      </Section>

      <Section title="2. Service">
        <p className={text}>
          L&apos;abonnement Premium donne accès, sur le site, aux six méthodes du générateur de
          grilles, à la génération de 20 grilles maximum par demande et aux simulations
          Monte-Carlo jusqu&apos;à 250 000 grilles. LotoLab IA est un outil statistique : il
          n&apos;augmente en rien les chances de gain, et aucun résultat n&apos;est garanti.
          Service réservé aux personnes majeures (18 ans et plus).
        </p>
      </Section>

      <Section title="3. Prix et paiement">
        <p className={text}>
          Mensuel : 4,99 € TTC par mois. Annuel : 39,96 € TTC par an. Les prix sont indiqués en
          euros, toutes taxes comprises. Le paiement est effectué par carte bancaire via notre
          prestataire Stripe ; LotoLab IA n&apos;a jamais accès aux données de carte. L&apos;accès
          Premium est activé dès la confirmation du paiement par Stripe.
        </p>
      </Section>

      <Section title="4. Durée, renouvellement et résiliation">
        <p className={text}>
          L&apos;abonnement est sans engagement et se renouvelle automatiquement à la fin de chaque
          période (mois ou année). Il est résiliable à tout moment, en ligne, depuis la page{' '}
          <Link href="/premium" className="underline">Premium</Link> (« Gérer ou résilier mon
          abonnement »). La résiliation prend effet à la fin de la période déjà payée ; aucune
          période entamée n&apos;est remboursée au prorata. Pour l&apos;offre annuelle, vous êtes
          informé par e-mail avant chaque échéance de la possibilité de ne pas reconduire
          l&apos;abonnement.
        </p>
      </Section>

      <Section title="5. Droit de rétractation">
        <p className={text}>
          Le service Premium est un contenu numérique fourni immédiatement après le paiement.
          Conformément à l&apos;article L221-28 13° du Code de la consommation, en demandant
          l&apos;accès immédiat et en cochant la case prévue avant le paiement, vous renoncez
          expressément à votre droit de rétractation de 14 jours.
        </p>
      </Section>

      <Section title="6. Responsabilité">
        <p className={text}>
          Les statistiques et grilles proposées sont fournies à titre informatif. Les tirages du
          Loto sont aléatoires : les résultats passés ne permettent pas de prévoir les résultats
          futurs. LotoLab IA ne saurait être tenu responsable des choix de jeu de
          l&apos;utilisateur. Jouer comporte des risques : endettement, isolement, dépendance —
          aide au 09 74 75 13 13 (appel non surtaxé).
        </p>
      </Section>

      <Section title="7. Données personnelles">
        <p className={text}>
          Le traitement des données lié au compte et à l&apos;abonnement est décrit dans la{' '}
          <Link href="/confidentialite" className="underline">politique de confidentialité</Link>.
        </p>
      </Section>

      <Section title="8. Réclamations, médiation et droit applicable">
        <p className={text}>
          Toute réclamation peut être adressée à{' '}
          <a href="mailto:reine.elie@gmail.com" className="underline">reine.elie@gmail.com</a>. En
          cas de litige non résolu, vous pouvez recourir gratuitement au médiateur de la
          consommation : [À compléter : nom et coordonnées du médiateur]. Les présentes conditions
          sont soumises au droit français.
        </p>
      </Section>
    </div>
  );
}
