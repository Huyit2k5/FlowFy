import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Bảng giá — Flowly",
  description: "Chọn gói phù hợp cho đội ngũ của bạn. Free để bắt đầu, Pro cho team lớn.",
};

const plans = [
  {
    name: "Free",
    price: "0",
    period: "forever",
    description: "Bắt đầu tự động hóa miễn phí",
    features: [
      "3 thành viên",
      "5 workflows",
      "1 GB storage",
      "Tất cả node types",
      "Webhook + Schedule",
      "Real-time collab",
    ],
    cta: "Dùng thử miễn phí",
    href: "/register",
    highlight: false,
  },
  {
    name: "Pro",
    price: "299.000",
    period: "tháng",
    description: "Cho team cần tự động hóa nâng cao",
    features: [
      "Thành viên không giới hạn",
      "Workflows không giới hạn",
      "100 GB storage",
      "Tất cả node types",
      "Webhook + Schedule + Priority",
      "Real-time collab + Presence",
      "Email hỗ trợ 24/7",
      "Custom integrations",
    ],
    cta: "Nâng cấp Pro",
    href: "/upgrade",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Liên hệ",
    period: "",
    description: "Giải pháp riêng cho tổ chức lớn",
    features: [
      "Mọi thứ trong Pro",
      "Storage không giới hạn",
      "SSO / SAML",
      "SLA 99.9%",
      "Dedicated support",
      "Custom development",
      "On-premise option",
    ],
    cta: "Liên hệ bán hàng",
    href: "mailto:hello@flowly.vn",
    highlight: false,
  },
];

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Bảng giá đơn giản, minh bạch
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-600">
            Bắt đầu miễn phí, nâng cấp khi cần. Không phí ẩn, hủy bất cứ lúc nào.
          </p>
        </div>

        {/* Plans */}
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border bg-white p-8 ${
                plan.highlight
                  ? "border-brand shadow-xl ring-2 ring-brand/20"
                  : "border-zinc-200 shadow-sm"
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">
                  Phổ biến nhất
                </span>
              )}

              <h2 className="text-lg font-semibold">{plan.name}</h2>
              <p className="mt-1 text-sm text-zinc-500">{plan.description}</p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold">
                  {plan.price === "Liên hệ" ? "—" : `₫${plan.price}`}
                </span>
                {plan.period && (
                  <span className="text-sm text-zinc-500">/{plan.period}</span>
                )}
              </div>

              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-700">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`mt-8 inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-semibold transition ${
                  plan.highlight
                    ? "bg-brand text-white hover:bg-brand-dark"
                    : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                {plan.cta}
              </Link>

              {user && plan.highlight && (
                <p className="mt-3 text-center text-xs text-zinc-400">
                  Đăng nhập: {user.email}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Comparison note */}
        <div className="mt-16 rounded-xl border border-zinc-200 bg-white p-6">
          <h3 className="text-sm font-semibold">So sánh nhanh</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-xs text-zinc-500">
                  <th className="pb-2 pr-4">Feature</th>
                  <th className="pb-2 pr-4">Free</th>
                  <th className="pb-2 pr-4">Pro</th>
                  <th className="pb-2">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                <tr>
                  <td className="py-2 pr-4 font-medium">Thành viên</td>
                  <td className="py-2 pr-4">3</td>
                  <td className="py-2 pr-4">∞</td>
                  <td className="py-2">∞</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Workflows</td>
                  <td className="py-2 pr-4">5</td>
                  <td className="py-2 pr-4">∞</td>
                  <td className="py-2">∞</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Storage</td>
                  <td className="py-2 pr-4">1 GB</td>
                  <td className="py-2 pr-4">100 GB</td>
                  <td className="py-2">∞</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Webhook + Schedule</td>
                  <td className="py-2 pr-4">✓</td>
                  <td className="py-2 pr-4">✓ Priority</td>
                  <td className="py-2">✓ Priority</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Real-time Collab</td>
                  <td className="py-2 pr-4">✓</td>
                  <td className="py-2 pr-4">✓</td>
                  <td className="py-2">✓</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">SSO / SAML</td>
                  <td className="py-2 pr-4">—</td>
                  <td className="py-2 pr-4">—</td>
                  <td className="py-2">✓</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Support</td>
                  <td className="py-2 pr-4">Community</td>
                  <td className="py-2 pr-4">Email 24/7</td>
                  <td className="py-2">Dedicated</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-12 text-center">
          <Link href="/" className="text-sm text-brand hover:underline">
            ← Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}