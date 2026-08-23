const testimonials = [
  {
    quote:
      "Flowly đã thay đổi hoàn toàn cách đội ngũ chúng tôi làm việc. Chúng tôi tiết kiệm được hơn 15 giờ mỗi tuần nhờ tự động hóa.",
    name: "Nguyễn Minh Anh",
    role: "Giám đốc vận hành, TechViet",
  },
  {
    quote:
      "Giao diện trực quan, dễ dùng ngay cả với người không rành công nghệ. Đội hỗ trợ phản hồi cực nhanh.",
    name: "Trần Quốc Bảo",
    role: "Founder, Bloom Studio",
  },
  {
    quote:
      "Chúng tôi đã thử nhiều công cụ khác nhau nhưng Flowly là lựa chọn phù hợp nhất cho quy mô doanh nghiệp của mình.",
    name: "Lê Thị Hương",
    role: "Trưởng phòng nhân sự, Sunrise Corp",
  },
];

export default function Testimonials() {
  return (
    <section id="testimonials" className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">
            Khách hàng nói gì
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Được đội ngũ trên khắp thế giới tin dùng
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="flex flex-col justify-between rounded-2xl border border-zinc-200 p-8"
            >
              <blockquote className="text-sm leading-relaxed text-zinc-700">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-light text-sm font-semibold text-white">
                  {t.name.charAt(0)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {t.name}
                  </p>
                  <p className="text-xs text-zinc-500">{t.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
