const plans = [
  {
    name: "Miễn phí",
    price: "0đ",
    period: "/ mãi mãi",
    description: "Phù hợp cho cá nhân hoặc đội nhóm nhỏ mới bắt đầu.",
    features: [
      "Tối đa 3 thành viên",
      "5 workflow tự động",
      "1GB lưu trữ",
      "Hỗ trợ qua email",
    ],
    highlighted: false,
    cta: "Bắt đầu miễn phí",
  },
  {
    name: "Pro",
    price: "299.000đ",
    period: "/ tháng",
    description: "Dành cho doanh nghiệp đang tăng trưởng cần nhiều tính năng hơn.",
    features: [
      "Thành viên không giới hạn",
      "Workflow không giới hạn",
      "100GB lưu trữ",
      "Tích hợp nâng cao",
      "Hỗ trợ ưu tiên 24/7",
    ],
    highlighted: true,
    cta: "Dùng thử miễn phí 14 ngày",
  },
  {
    name: "Enterprise",
    price: "Liên hệ",
    period: "",
    description: "Giải pháp tùy chỉnh cho tổ chức lớn với yêu cầu riêng.",
    features: [
      "Mọi tính năng của Pro",
      "SLA & bảo mật nâng cao",
      "Quản lý tài khoản riêng",
      "Đào tạo & triển khai riêng",
    ],
    highlighted: false,
    cta: "Liên hệ tư vấn",
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="bg-zinc-50/60 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">
            Bảng giá
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Chọn gói phù hợp với bạn
          </p>
          <p className="mt-4 text-lg text-zinc-600">
            Bắt đầu miễn phí, nâng cấp khi đội ngũ của bạn phát triển.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col rounded-2xl border p-8 ${
                plan.highlighted
                  ? "border-brand bg-white shadow-xl shadow-indigo-100 ring-1 ring-brand"
                  : "border-zinc-200 bg-white"
              }`}
            >
              {plan.highlighted && (
                <span className="mb-4 w-fit rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                  Phổ biến nhất
                </span>
              )}
              <h3 className="text-lg font-semibold text-foreground">
                {plan.name}
              </h3>
              <p className="mt-2 text-sm text-zinc-500">{plan.description}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-foreground">
                  {plan.price}
                </span>
                <span className="text-sm text-zinc-500">{plan.period}</span>
              </div>

              <ul className="mt-8 flex flex-1 flex-col gap-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-zinc-600">
                    <span className="mt-0.5 text-brand">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href="#cta"
                className={`mt-8 rounded-full px-5 py-3 text-center text-sm font-semibold transition-colors ${
                  plan.highlighted
                    ? "bg-brand text-white hover:bg-brand-dark"
                    : "border border-zinc-200 text-foreground hover:border-brand hover:text-brand"
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
