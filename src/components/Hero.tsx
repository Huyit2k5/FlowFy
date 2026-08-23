export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu blur-3xl"
      >
        <div className="mx-auto h-[420px] w-[720px] rounded-full bg-gradient-to-tr from-brand-light via-brand to-purple-300 opacity-30" />
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-20 pt-16 sm:pb-28 sm:pt-24 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-4 py-1.5 text-sm font-medium text-brand">
            🚀 Ra mắt phiên bản 2.0
          </span>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            Tự động hóa quy trình làm việc,{" "}
            <span className="bg-gradient-to-r from-brand to-brand-light bg-clip-text text-transparent">
              tăng tốc doanh nghiệp
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-600">
            Flowly giúp đội ngũ của bạn quản lý công việc, tự động hóa quy
            trình lặp lại và cộng tác hiệu quả hơn — tất cả trong một nền
            tảng duy nhất, dễ dùng cho mọi quy mô công ty.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <a
              href="#cta"
              className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-brand-dark"
            >
              Dùng thử miễn phí 14 ngày
            </a>
            <a
              href="#how-it-works"
              className="flex items-center gap-1 rounded-full px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:text-brand"
            >
              Xem demo <span aria-hidden>→</span>
            </a>
          </div>

          <p className="mt-4 text-xs text-zinc-400">
            Không cần thẻ tín dụng · Hủy bất cứ lúc nào
          </p>
        </div>

        <div className="relative mx-auto mt-16 max-w-5xl">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 shadow-2xl shadow-indigo-100">
            <div className="flex items-center gap-1.5 border-b border-zinc-200 bg-white px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-yellow-400" />
              <span className="h-3 w-3 rounded-full bg-green-400" />
            </div>
            <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
              {[
                { label: "Dự án hoàn thành", value: "128" },
                { label: "Giờ tiết kiệm / tuần", value: "36h" },
                { label: "Mức độ hài lòng", value: "98%" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-zinc-200 bg-white p-6 text-center"
                >
                  <p className="text-3xl font-bold text-brand">{stat.value}</p>
                  <p className="mt-1 text-sm text-zinc-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
