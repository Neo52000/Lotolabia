import { SkeletonSection } from '@/components/ui';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-80 animate-pulse rounded bg-slate-200 dark:bg-slate-800" aria-hidden="true" />
      <SkeletonSection lines={10} />
      <SkeletonSection lines={6} />
      <SkeletonSection lines={5} />
    </div>
  );
}
