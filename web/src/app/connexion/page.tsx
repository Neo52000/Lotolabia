import type { Metadata } from 'next';

import ConnexionForm from './ConnexionForm';

export const metadata: Metadata = {
  title: 'Connexion',
  description: 'Connecte-toi ou crée un compte LotoLab IA pour suivre tes statistiques et tes grilles.',
  alternates: { canonical: '/connexion' },
  robots: { index: false, follow: true },
};

export default function ConnexionPage() {
  return (
    <div className="-mx-4 -my-8 flex flex-1 flex-col sm:-mx-6">
      <ConnexionForm />
    </div>
  );
}
