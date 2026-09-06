export default function AppLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-32 animate-pulse rounded bg-zinc-200" />
          <div className="mt-2 h-4 w-48 animate-pulse rounded bg-zinc-100" />
        </div>
        <div className="h-10 w-32 animate-pulse rounded-lg bg-zinc-200" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-100 bg-white p-5">
            <div className="h-4 w-20 animate-pulse rounded bg-zinc-100" />
            <div className="mt-3 h-8 w-12 animate-pulse rounded bg-zinc-200" />
            <div className="mt-2 h-3 w-24 animate-pulse rounded bg-zinc-100" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-100 bg-white p-5 lg:col-span-2">
          <div className="h-5 w-32 animate-pulse rounded bg-zinc-200" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <div className="h-4 w-40 animate-pulse rounded bg-zinc-100" />
                  <div className="mt-1 h-3 w-24 animate-pulse rounded bg-zinc-50" />
                </div>
                <div className="h-6 w-16 animate-pulse rounded-full bg-zinc-100" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-100 bg-white p-5">
          <div className="h-5 w-28 animate-pulse rounded bg-zinc-200" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-3 w-28 animate-pulse rounded bg-zinc-100" />
                <div className="h-6 w-14 animate-pulse rounded-full bg-zinc-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}