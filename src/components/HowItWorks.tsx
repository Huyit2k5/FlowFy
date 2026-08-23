const steps = [
  {
    number: "01",
    title: "Kết nối dữ liệu",
    description:
      "Import dữ liệu và kết nối các công cụ hiện có của bạn chỉ trong vài phút, không cần kỹ năng kỹ thuật.",
  },
  {
    number: "02",
    title: "Thiết lập quy trình",
    description:
      "Sử dụng trình tạo workflow kéo-thả trực quan để tự động hóa các tác vụ lặp lại của đội ngũ.",
  },
  {
    number: "03",
    title: "Theo dõi & tối ưu",
    description:
      "Xem báo cáo hiệu suất theo thời gian thực và liên tục cải thiện quy trình làm việc.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-zinc-50/60 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">
            Quy trình
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Bắt đầu chỉ với 3 bước đơn giản
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-10 sm:grid-cols-3">
          {steps.map((step, idx) => (
            <div key={step.number} className="relative text-center sm:text-left">
              <span className="text-5xl font-bold text-brand/15">
                {step.number}
              </span>
              <h3 className="mt-4 text-xl font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                {step.description}
              </p>
              {idx < steps.length - 1 && (
                <span
                  aria-hidden
                  className="absolute right-[-20px] top-6 hidden text-2xl text-zinc-300 sm:block"
                >
                  →
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
