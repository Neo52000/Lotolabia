import { SkeletonSection } from '@/components/ui';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-72 animate-pulse rounded bg-slate-200 dark:bg-slate-800" aria-hidden="true" />
      <div className="flex flex-wrap gap-2" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-8 w-16 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
      <SkeletonSection lines={12} />
    </div>
  );
}
