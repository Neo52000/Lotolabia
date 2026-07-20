'use client';

import { useMemo, useState } from 'react';

import type { NumberStat } from '@/lib/api';

type Range = '50' | '100' | '500';

const RANGES: { value: Range; label: string }[] = [
  { value: '50', label: '50 derniers' },
  { value: '100', label: '100 derniers' },
  { value: '500', label: '500 derniers' },
];

function tierClasses(ratio: number): string {
  if (ratio >= 0.78) {
    return 'bg-gradient-to-br from-gold-light via-gold to-gold-dark shadow-[0_4px_12px_rgba(244,196,48,0.5)]';
  }
  if (ratio >= 0.5) {
    return 'bg-gradient-to-br from-[#FFF6DE] to-gold-light shadow-[0_4px_10px_rgba(244,196,48,0.3)]';
  }
  if (ratio >= 0.3) {
    return 'bg-gradient-to-br from-[#EEF1F6] to-[#D3D9E4] shadow-[0_4px_8px_rgba(13,27,42,0.15)] dark:from-slate-700 dark:to-slate-800';
  }
  return 'bg-gradient-to-br from-[#EFE1FA] to-[#D9C7F0] shadow-[0_4px_8px_rgba(157,78,221,0.25)]';
}

export default function StatsHeatGrid({ datasets }: { datasets: Record<Range, NumberStat[]> }) {
  const [range, setRange] = useState<Range>('100');

  const balls = useMemo(() => {
    const stats = datasets[range] ?? [];
    const byNumber = new Map(stats.map((s) => [s.number, s.count ?? 0]));
    const max = Math.max(1, ...stats.map((s) => s.count ?? 0));
    return Array.from({ length: 49 }, (_, i) => {
      const n = i + 1;
      const count = byNumber.get(n) ?? 0;
      return { n, count, ratio: count / max };
    });
  }, [datasets, range]);

  return (
    <div>
      <div className="mb-9 flex flex-wrap gap-3">
        {RANGES.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setRange(item.value)}
            className={`rounded-full border px-5 py-2.5 font-sora text-sm font-bold transition ${
              range === item.value
                ? 'border-gold/50 bg-gradient-to-br from-gold-light to-gold text-[#5A3F00]'
                : 'border-night/10 bg-white text-[#495064] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mb-8 rounded-[22px] border border-night/[0.08] bg-white p-7 shadow-[0_8px_30px_rgba(13,27,42,0.06)] dark:border-white/10 dark:bg-slate-900">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-sora text-lg font-bold">Fréquence par numéro</h2>
          <div className="flex gap-4 text-xs text-[#6B7280] dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-gold-light to-gold" /> Chaud
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border border-[#C7CEDA] bg-[#E7ECF5]" /> Neutre
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#D9C7F0]" /> Rare
            </span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2.5 sm:grid-cols-10">
          {balls.map((ball) => (
            <div
              key={ball.n}
              title={`Numéro ${ball.n} — ${ball.count} sorties`}
              className={`flex aspect-square items-center justify-center rounded-full ${tierClasses(ball.ratio)}`}
            >
              <span className="flex h-[68%] w-[68%] items-center justify-center rounded-full bg-white font-sora text-sm font-bold text-night shadow-inner dark:bg-slate-950 dark:text-slate-100">
                {ball.n}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
