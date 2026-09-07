"use client";

import { useState } from "react";

export function TwoFactorGate() {
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  async function handleVerify() {
    if (code.length < 6) {
      setError("Nhập mã 6 số");
      return;
    }
    setVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/auth/two-factor/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Mã không đúng");
      }
    } catch {
      setError("Lỗi mạng");
    }
    setVerifying(false);
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
          <span className="text-2xl">🔐</span>
        </div>
        <h2 className="text-lg font-semibold">Xác thực 2 lớp yêu cầu</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Workspace này yêu cầu xác thực 2 lớp. Vui lòng nhập mã từ ứng dụng xác thực của bạn.
        </p>

        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && handleVerify()}
          placeholder="000000"
          className="mt-6 w-full rounded-xl border border-zinc-200 px-4 py-3 text-center text-2xl tracking-[0.5em] focus:border-brand focus:outline-none"
        />

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <button
          onClick={handleVerify}
          disabled={verifying || code.length < 6}
          className="mt-4 w-full rounded-xl bg-brand py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          {verifying ? "Đang xác thực..." : "Xác thực"}
        </button>

        <p className="mt-4 text-xs text-zinc-400">
          Bật 2FA trong: Cài đặt Supabase → Authentication → MFA
        </p>
      </div>
    </div>
  );
}
