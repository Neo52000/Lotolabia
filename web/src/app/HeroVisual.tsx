'use client';

import { useEffect, useState } from 'react';

const TOTAL_COMBOS = 19_068_840;
const TICKER_DURATION_MS = 1400;
const TICKER_TICK_MS = 1800;

const BALL_STYLES = [
  'top-3 left-1 h-14 w-14 text-xl bg-[radial-gradient(circle_at_30%_28%,#fff,#E7ECF5_55%,#9AA6BA_100%)] shadow-[0_8px_20px_rgba(0,0,0,0.4)] text-night [animation-delay:0s]',
  'top-14 right-4 h-12 w-12 text-lg bg-[radial-gradient(circle_at_30%_28%,#fff8dd,#F4C430_60%,#A8790E_100%)] shadow-[0_0_26px_rgba(244,196,48,0.6)] text-night [animation-delay:.6s]',
  'bottom-16 left-0 h-10 w-10 text-base bg-[radial-gradient(circle_at_30%_28%,#fff8dd,#F4C430_60%,#A8790E_100%)] shadow-[0_0_22px_rgba(244,196,48,0.55)] text-night [animation-delay:1.2s]',
  'bottom-4 right-16 h-14 w-14 text-xl bg-[radial-gradient(circle_at_30%_28%,#fff,#E7ECF5_55%,#9AA6BA_100%)] shadow-[0_8px_20px_rgba(0,0,0,0.4)] text-night [animation-delay:.3s]',
  'top-40 right-0 h-9 w-9 text-sm bg-[radial-gradient(circle_at_30%_28%,#fff0f6,#FF7BAA_60%,#C81C63_100%)] shadow-[0_0_20px_rgba(255,77,141,0.55)] text-[#4A0A26] [animation-delay:.9s]',
];

export default function HeroVisual({
  numbers,
  drawCount,
  methodCount,
}: {
  numbers: number[];
  drawCount: number;
  methodCount: number;
}) {
  const [count, setCount] = useState(() => Math.floor(TOTAL_COMBOS * 0.62));

  useEffect(() => {
    let frame: number;
    let interval: ReturnType<typeof setInterval> | undefined;
    const startCount = Math.floor(TOTAL_COMBOS * 0.62);
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / TICKER_DURATION_MS);
      const eased = 1 - (1 - t) ** 3;
      setCount(Math.floor(startCount + eased * (TOTAL_COMBOS - startCount)));
      if (t < 1) {
        frame = requestAnimationFrame(step);
      } else {
        interval = setInterval(() => {
          setCount((current) => Math.min(TOTAL_COMBOS, current + Math.floor(Math.random() * 40) + 1));
        }, TICKER_TICK_MS);
      }
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      if (interval) clearInterval(interval);
    };
  }, []);

  return (
    <div className="relative flex h-[420px] items-center justify-center sm:h-[480px] lg:h-[520px]">
      {numbers.slice(0, 5).map((n, index) => (
        <div
          key={n}
          aria-hidden="true"
          className={`animate-float absolute hidden items-center justify-center rounded-full font-sora font-extrabold sm:flex ${BALL_STYLES[index]}`}
        >
          {n}
        </div>
      ))}

      <div className="animate-pulse-glow relative w-full max-w-[380px] rounded-3xl border border-gold/35 bg-white p-9 text-center shadow-[0_20px_50px_rgba(13,27,42,0.08)]">
        <div className="mb-3.5 text-xs font-semibold uppercase tracking-[1.5px] text-gold">
          Combinaisons passées au crible
        </div>
        <div className="bg-gradient-to-r from-gold-light to-gold bg-clip-text font-sora text-5xl font-extrabold tabular-nums text-transparent">
          {count.toLocaleString('fr-FR')}
        </div>
        <div className="mt-2.5 text-[13px] text-[#7C8598]">
          sur {TOTAL_COMBOS.toLocaleString('fr-FR')} combinaisons possibles au Loto
        </div>
        <div className="mt-6 flex justify-center gap-6 border-t border-night/[0.08] pt-5">
          <div>
            <div className="font-sora text-xl font-bold text-brand-green">{drawCount.toLocaleString('fr-FR')}</div>
            <div className="text-[11px] text-[#7C8598]">tirages archivés</div>
          </div>
          <div>
            <div className="font-sora text-xl font-bold text-brand-violet">{methodCount}</div>
            <div className="text-[11px] text-[#7C8598]">méthodes de génération</div>
          </div>
        </div>
      </div>
    </div>
  );
}
