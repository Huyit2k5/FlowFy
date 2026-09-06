"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
      <span className="text-5xl" aria-hidden>⚠️</span>
      <h2 className="mt-4 text-lg font-semibold">Có lỗi xảy ra</h2>
      <p className="mt-2 max-w-md text-sm text-zinc-500">
        {error.message || "Đã có lỗi không mong muốn. Vui lòng thử lại."}
      </p>
      {error.digest && (
        <p className="mt-1 text-xs text-zinc-400">ID: {error.digest}</p>
      )}
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        Thử lại
      </button>
    </div>
  );
}