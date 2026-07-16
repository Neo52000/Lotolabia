import { SkeletonSection } from '@/components/ui';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 animate-pulse rounded bg-slate-200 dark:bg-slate-800" aria-hidden="true" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" aria-hidden="true" />
        <div className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" aria-hidden="true" />
        <div className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" aria-hidden="true" />
        <div className="h-24 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" aria-hidden="true" />
      </div>
      <SkeletonSection lines={8} />
    </div>
  );
}
