import { SkeletonSection } from '@/components/ui';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4" aria-hidden="true">
        <div className="h-11 w-11 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
        <div className="h-7 w-56 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      </div>
      <SkeletonSection lines={4} />
      <SkeletonSection lines={3} />
    </div>
  );
}
