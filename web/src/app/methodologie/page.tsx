import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs, Disclaimer, Section } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Méthodologie — comment LotoLab IA calcule ses statistiques',
  description:
    'Sources des données, définitions précises (fréquence, retard, écart, cooccurrence) et ' +
    'limites de chaque analyse : la méthodologie complète et transparente de LotoLab IA.',
  alternates: { canonical: '/methodologie' },
};

export default function MethodologyPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Méthodologie' }]} />
      <h1 className="text-2xl font-bold">Méthodologie</h1>

      <Section title="D'où viennent les données ?">
        <div className="space-y-2 text-sm opacity-90">
          <p>
            Les résultats proviennent exclusivement des publications officielles de l&apos;opérateur
            du Loto (fichiers historiques publics). Un collecteur automatique vérifie les nouveaux
            tirages les soirs de tirage (lundi, mercredi, samedi) avec un contrôle le lendemain.
          </p>
          <p>
            Chaque donnée importée est validée (plages 1-49 et 1-10, unicité des numéros, dates
            cohérentes) et dédoublonnée. Toute ligne suspecte est mise en quarantaine et vérifiée
            manuellement — jamais corrigée en silence. La source et l&apos;heure de récupération de
            chaque tirage sont conservées.
          </p>
        </div>
      </Section>

      <Section title="Définitions exactes">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-semibold">Fréquence absolue / relative</dt>
            <dd className="opacity-80">Nombre de sorties d&apos;un numéro sur la période / part des tirages où il apparaît.</dd>
          </div>
          <div>
            <dt className="font-semibold">Retard</dt>
            <dd className="opacity-80">Nombre de tirages écoulés depuis la dernière sortie (0 = présent au dernier tirage).</dd>
          </div>
          <div>
            <dt className="font-semibold">Écart (cycle)</dt>
            <dd className="opacity-80">Nombre de tirages entre deux sorties consécutives d&apos;un même numéro ; on en donne le minimum, la moyenne et le maximum.</dd>
          </div>
          <div>
            <dt className="font-semibold">Cooccurrence (paires, triplets)</dt>
            <dd className="opacity-80">Nombre de tirages où deux (ou trois) numéros apparaissent ensemble.</dd>
          </div>
          <div>
            <dt className="font-semibold">Formes de tirage</dt>
            <dd className="opacity-80">Somme des cinq numéros, amplitude, répartitions pairs/impairs, bas (1-24) / haut (25-49), dizaines, numéros consécutifs.</dd>
          </div>
          <div>
            <dt className="font-semibold">Fenêtres d&apos;analyse</dt>
            <dd className="opacity-80">Chaque statistique peut être calculée sur les 10, 20, 50, 100 derniers tirages ou l&apos;historique complet.</dd>
          </div>
        </dl>
      </Section>

      <Section title="Les limites — à lire absolument">
        <div className="space-y-2 text-sm opacity-90">
          <p>
            Les tirages du Loto sont indépendants : les boules n&apos;ont pas de mémoire. Un numéro
            « en retard » n&apos;est pas « dû » ; un numéro « chaud » n&apos;est pas favorisé.
            Croire l&apos;inverse porte un nom : le sophisme du joueur.
          </p>
          <p>
            Nos statistiques décrivent le passé avec exactitude, et c&apos;est tout. Aucun
            algorithme, aucune IA, aucune méthode ne peut prédire un tirage équiprobable ni
            augmenter la probabilité de gain d&apos;une grille valide.
          </p>
          <p>
            Pourquoi proposer ces analyses, alors ? Parce que comprendre les données réelles du
            jeu — et la vraie nature du hasard — est le meilleur antidote aux fausses promesses.
            Voir aussi <Link href="/probabilites" className="text-brand hover:underline">les probabilités du Loto</Link>.
          </p>
        </div>
      </Section>
      <Disclaimer />
    </div>
  );
}
