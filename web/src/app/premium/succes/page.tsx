import type { Metadata } from 'next';

import PremiumSuccess from './PremiumSuccess';

export const metadata: Metadata = {
  title: 'Paiement reçu',
  robots: { index: false },
};

export default function PremiumSuccessPage() {
  return (
    <div className="mx-auto max-w-xl py-10 text-center">
      <PremiumSuccess />
    </div>
  );
}
