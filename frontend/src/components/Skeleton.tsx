export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-slate-200/80 ${className}`}
      aria-hidden
    />
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl border overflow-hidden" aria-busy="true" aria-label="Loading">
      <div className="bg-slate-50 px-4 py-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-4 py-3 flex gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow-sm p-4 space-y-3 border border-slate-100">
          <div className="flex justify-between gap-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-2 w-full" />
          <div className="grid grid-cols-2 gap-2">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-7 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading project">
      <Skeleton className="h-4 w-64" />
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-700 px-5 py-6 space-y-3">
          <Skeleton className="h-6 w-1/2 bg-slate-500" />
          <Skeleton className="h-4 w-1/3 bg-slate-500" />
        </div>
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
