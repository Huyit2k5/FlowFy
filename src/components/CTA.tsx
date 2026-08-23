export default function CTA() {
  return (
    <section id="cta" className="relative overflow-hidden bg-brand py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand via-brand-dark to-purple-700 opacity-90"
      />
      <div className="relative mx-auto max-w-3xl px-6 text-center lg:px-8">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Sẵn sàng tối ưu quy trình làm việc của bạn?
        </h2>
        <p className="mt-4 text-lg text-indigo-100">
          Tham gia cùng hơn 2.000 doanh nghiệp đang sử dụng Flowly để làm
          việc hiệu quả hơn mỗi ngày.
        </p>
        <form className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row">
          <input
            type="email"
            required
            placeholder="Nhập email công ty của bạn"
            className="w-full rounded-full border-0 px-5 py-3 text-sm text-foreground shadow-sm outline-none placeholder:text-zinc-400"
          />
          <button
            type="submit"
            className="shrink-0 rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand transition-colors hover:bg-indigo-50"
          >
            Dùng thử miễn phí
          </button>
        </form>
        <p className="mt-4 text-xs text-indigo-100">
          Không cần thẻ tín dụng · Hủy bất cứ lúc nào
        </p>
      </div>
    </section>
  );
}
