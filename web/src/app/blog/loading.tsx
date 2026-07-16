export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-800" aria-hidden="true" />
      <ul className="space-y-4" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <li
            key={index}
            className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-2 h-3 w-full rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-3 h-2 w-24 rounded bg-slate-200 dark:bg-slate-800" />
          </li>
        ))}
      </ul>
    </div>
  );
}
