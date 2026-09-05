"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthLayout from "@/app/auth/layout";

export default function Register() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const body = new FormData();
    body.set("full_name", fullName);
    body.set("email", email);
    body.set("password", password);

    const res = await fetch("/api/auth/signup", { method: "POST", body });
    if (res.redirected) {
      const url = new URL(res.url);
      router.push(url.pathname);
      router.refresh();
      return;
    }

    const data = await res.json().catch(() => ({}));
    setError(data.error || "Đăng ký thất bại. Vui lòng thử lại.");
    setLoading(false);
  }

  return (
    <AuthLayout>
      <h1 className="text-3xl font-bold tracking-tight">Tạo tài khoản</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Bắt đầu tự động hóa quy trình làm việc của bạn trong vài phút.
      </p>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Họ tên</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nguyễn Văn A"
            className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tối thiểu 8 ký tự"
            className="w-full rounded-lg border border-zinc-200 px-4 py-2.5 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
        >
          {loading ? "Đang tạo tài khoản..." : "Đăng ký miễn phí"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-600">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Đăng nhập
        </Link>
      </p>
    </AuthLayout>
  );
}