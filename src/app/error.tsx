"use client";

import { useEffect } from "react";
import { captureException, ERROR_TYPES } from "@/lib/error-tracking";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error, { type: ERROR_TYPES.UI, path: window.location.pathname });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <span className="text-5xl" aria-hidden>⚠️</span>
      <h2 className="mt-4 text-lg font-semibold text-zinc-900">Có lỗi xảy ra</h2>
      <p className="mt-2 max-w-md text-sm text-zinc-500">
        {error.message || "Đã có lỗi không mong muốn. Vui lòng thử lại."}
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-zinc-400">
          Error ID: {error.digest} — nếu lỗi lặp lại, báo ID này cho support
        </p>
      )}
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200"
        >
          Tải lại trang
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
}
