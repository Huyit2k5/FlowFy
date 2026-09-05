"use client";

import { useState } from "react";

const navLinks = [
  { href: "#features", label: "Tính năng" },
  { href: "#how-it-works", label: "Quy trình" },
  { href: "#pricing", label: "Bảng giá" },
  { href: "#testimonials", label: "Khách hàng" },
  { href: "#faq", label: "FAQ" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-black/5 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <a href="#" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-light text-sm font-bold text-white">
            F
          </span>
          <span className="text-lg font-bold tracking-tight text-foreground">
            Flowly
          </span>
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-brand"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href="/login"
            className="text-sm font-medium text-zinc-600 transition-colors hover:text-brand"
          >
            Đăng nhập
          </a>
          <a
            href="/register"
            className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition-colors hover:bg-brand-dark"
          >
            Dùng thử miễn phí
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 md:hidden"
          aria-label="Mở menu"
        >
          <span className="sr-only">Mở menu</span>
          {open ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {open && (
        <div className="border-t border-black/5 bg-white px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-zinc-600 hover:text-brand"
              >
                {link.label}
              </a>
            ))}
            <a
              href="/login"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-zinc-600 hover:text-brand"
            >
              Đăng nhập
            </a>
            <a
              href="/register"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-brand px-5 py-2.5 text-center text-sm font-semibold text-white"
            >
              Dùng thử miễn phí
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
