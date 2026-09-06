import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Nâng cấp — Flowly",
};

export default async function UpgradePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/upgrade");

  // Get current workspace plan
  const { data: member } = await supabase
    .from("members")
    .select("role, workspaces (id, name, plan)")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const currentPlan = (member as { workspaces?: { plan?: string } } | null)?.workspaces?.plan ?? "free";

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand/10 text-2xl">
              ⚡
            </span>
            <h1 className="mt-4 text-2xl font-bold">Nâng cấp lên Pro</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Gói hiện tại: <span className="font-medium capitalize">{currentPlan}</span>
            </p>
          </div>

          <div className="mt-6 rounded-xl bg-brand/5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Flowly Pro</span>
              <span className="text-lg font-bold">₫299.000/tháng</span>
            </div>
            <ul className="mt-3 space-y-1.5 text-sm text-zinc-600">
              <li>✓ Thành viên & workflows không giới hạn</li>
              <li>✓ 100 GB storage</li>
              <li>✓ Priority queue cho workflows</li>
              <li>✓ Email hỗ trợ 24/7</li>
            </ul>
          </div>

          {/* Stripe Checkout button */}
          <form action="/api/billing/checkout" method="POST" className="mt-6">
            <button
              type="submit"
              className="w-full rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
            >
              Thanh toán với Stripe
            </button>
          </form>

          <p className="mt-3 text-center text-xs text-zinc-400">
            Hủy bất cứ lúc nào. Không phí ẩn.
          </p>

          <div className="mt-6 border-t border-zinc-100 pt-4">
            <Link
              href="/pricing"
              className="block text-center text-sm text-brand hover:underline"
            >
              Xem tất cả gói
            </Link>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-zinc-400">
          {user.email}
        </p>
      </div>
    </div>
  );
}