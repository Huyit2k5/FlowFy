"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/app";
  const checked = params.get("checked");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const body = new FormData();
    body.set("email", email);
    body.set("password", password);
    body.set("next", next);

    const res = await fetch("/api/auth/signin", { method: "POST", body, redirect: "manual" });
    if (res.status === 307 || res.status === 302 || res.status === 308) {
      const redirectUrl = res.headers.get("Location");
      if (redirectUrl) {
        router.push(redirectUrl.startsWith("http") ? redirectUrl : next);
        router.refresh();
      } else {
        router.push(next);
        router.refresh();
      }
      return;
    }

    const data = await res.json().catch(() => ({}));
    setError(data.error || "Đăng nhập thất bại. Vui lòng thử lại.");
    setLoading(false);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">Đăng nhập</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Chào mừng quay lại Flowly. Đăng nhập để tiếp tục công việc.
      </p>

      {checked && (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Email đã được xác minh. Hãy đăng nhập để tiếp tục.
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Mật khẩu</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-600">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="font-semibold text-brand hover:underline">
          Đăng ký miễn phí
        </Link>
      </p>

      <div className="mt-8 border-t border-zinc-100 pt-6">
        <p className="mb-3 text-center text-xs text-zinc-400">Hoặc đăng nhập bằng</p>
        <div className="flex justify-center gap-3">
          <a
            href={`/api/sso?provider=google&redirect=${encodeURIComponent(next)}`}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            <span className="text-base">G</span> Google
          </a>
          <a
            href={`/api/sso?provider=microsoft&redirect=${encodeURIComponent(next)}`}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            <span className="text-base text-[#0078D4]">M</span> Microsoft
          </a>
          <a
            href={`/api/sso?provider=okta&redirect=${encodeURIComponent(next)}`}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            <span className="text-base text-[#007DC1]">O</span> Okta
          </a>
        </div>
      </div>
    </div>
  );
}