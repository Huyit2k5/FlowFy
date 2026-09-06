export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="flex flex-col items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-light text-sm font-bold text-white">
          F
        </span>
        <div className="h-2 w-32 overflow-hidden rounded-full bg-zinc-200">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-brand" />
        </div>
        <p className="text-sm text-zinc-400">Đang tải...</p>
      </div>
    </div>
  );
}