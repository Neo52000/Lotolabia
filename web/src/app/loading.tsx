import { SkeletonSection } from '@/components/ui';

export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="h-40 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" aria-hidden="true" />
      <SkeletonSection lines={1} />
      <div className="grid gap-6 md:grid-cols-2">
        <SkeletonSection />
        <SkeletonSection />
      </div>
    </div>
  );
}
