"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { WorkspaceWithRole } from "@/lib/workspaces";
import { createClient } from "@/lib/supabase/browser";

interface Props {
  workspaces: WorkspaceWithRole[];
  current: WorkspaceWithRole;
  children: React.ReactNode;
}

const navItems = [
  { href: "", label: "Tổng quan", icon: DashboardIcon },
  { href: "/workflows", label: "Workflows", icon: FlowIcon },
  { href: "/members", label: "Thành viên", icon: UsersIcon },
  { href: "/integrations", label: "Tích hợp", icon: PlugIcon },
  { href: "/settings", label: "Cài đặt", icon: SettingsIcon },
];

const planBadge: Record<string, { label: string; cls: string }> = {
  free: { label: "Free", cls: "bg-zinc-100 text-zinc-600" },
  pro: { label: "Pro", cls: "bg-brand/10 text-brand" },
  enterprise: { label: "Enterprise", cls: "bg-amber-100 text-amber-700" },
};

export default function AppShell({ workspaces, current, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [switchOpen, setSwitchOpen] = useState(false);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-full bg-zinc-50">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-200 bg-white md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-zinc-100 px-6">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-light text-sm font-bold text-white">
            F
          </span>
          <span className="text-lg font-bold tracking-tight">Flowly</span>
        </div>

        {/* Workspace switcher */}
        <div className="relative px-3 pt-4">
          <button
            type="button"
            onClick={() => setSwitchOpen((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border border-zinc-200 px-3 py-2.5 text-left transition hover:bg-zinc-50"
          >
            <span className="truncate text-sm font-semibold">{current.name}</span>
            <span className="ml-2 shrink-0 text-zinc-400" aria-hidden>
              ▾
            </span>
          </button>
          {switchOpen && (
            <div className="absolute z-20 mt-1 w-full rounded-lg border border-zinc-200 bg-white p-1 shadow-lg">
              {workspaces.map((w) => (
                <Link
                  key={w.id}
                  href={`/app/${w.id}`}
                  onClick={() => setSwitchOpen(false)}
                  className={`block rounded-md px-3 py-2 text-sm transition hover:bg-zinc-50 ${
                    w.id === current.id ? "font-semibold text-brand" : "text-zinc-700"
                  }`}
                >
                  {w.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const href = `/app/${current.id}${item.href}`;
            const active =
              item.href === ""
                ? pathname === `/app/${current.id}` || pathname === `/app/${current.id}/`
                : pathname.startsWith(href);
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-brand/10 text-brand"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zinc-100 p-3">
          {/* Plan badge + Upgrade */}
          {current.plan && current.plan !== "pro" && current.plan !== "enterprise" && (
            <Link
              href="/upgrade"
              className="mb-2 flex items-center justify-between rounded-lg border border-brand/30 bg-brand/5 px-3 py-2.5 transition hover:bg-brand/10"
            >
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${planBadge[current.plan]?.cls ?? planBadge.free.cls}`}>
                  {planBadge[current.plan]?.label ?? "Free"}
                </span>
                <span className="text-xs text-zinc-500">Nâng cấp Pro</span>
              </div>
              <span className="text-xs text-brand">→</span>
            </Link>
          )}
          {current.plan === "pro" || current.plan === "enterprise" ? (
            <div className="mb-2 flex items-center gap-2 px-3 py-1.5">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${planBadge[current.plan]?.cls}`}>
                {planBadge[current.plan]?.label}
              </span>
            </div>
          ) : null}

          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50"
          >
            <span aria-hidden>↩</span>
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 md:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-light text-xs font-bold text-white">
              F
            </span>
            <span className="text-sm font-bold">{current.name}</span>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="text-sm font-medium text-zinc-600"
          >
            Đăng xuất
          </button>
        </header>

        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

function FlowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="5" cy="6" r="2.5" />
      <circle cx="19" cy="18" r="2.5" />
      <path d="M7.5 6H14a3 3 0 0 1 3 3v6.5" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
    </svg>
  );
}

function PlugIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v6" />
      <path d="M8 8h8l-1 7a3 3 0 0 1-3 3h0a3 3 0 0 1-3-3L8 8z" />
      <path d="M12 18v4" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  );
}