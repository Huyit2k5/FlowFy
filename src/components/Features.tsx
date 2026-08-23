const features = [
  {
    title: "Tự động hóa quy trình",
    description:
      "Thiết lập workflow tự động cho các tác vụ lặp lại, tiết kiệm hàng chục giờ làm việc mỗi tuần.",
    icon: "⚡",
  },
  {
    title: "Cộng tác thời gian thực",
    description:
      "Đội ngũ cùng làm việc trên một không gian chung, bình luận và cập nhật tiến độ tức thì.",
    icon: "👥",
  },
  {
    title: "Báo cáo & phân tích",
    description:
      "Dashboard trực quan giúp bạn theo dõi hiệu suất và ra quyết định dựa trên dữ liệu.",
    icon: "📊",
  },
  {
    title: "Tích hợp linh hoạt",
    description:
      "Kết nối với hơn 50 công cụ phổ biến như Slack, Google Workspace, Notion và nhiều hơn nữa.",
    icon: "🔗",
  },
  {
    title: "Bảo mật doanh nghiệp",
    description:
      "Mã hóa đầu cuối, phân quyền chi tiết và tuân thủ các tiêu chuẩn bảo mật quốc tế.",
    icon: "🔒",
  },
  {
    title: "Hỗ trợ 24/7",
    description:
      "Đội ngũ hỗ trợ luôn sẵn sàng giúp bạn giải quyết vấn đề mọi lúc, mọi nơi.",
    icon: "💬",
  },
];

export default function Features() {
  return (
    <section id="features" className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">
            Tính năng
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Mọi thứ bạn cần để vận hành trơn tru
          </p>
          <p className="mt-4 text-lg text-zinc-600">
            Flowly tập hợp đầy đủ công cụ để đội ngũ của bạn làm việc hiệu
            quả hơn mỗi ngày.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-zinc-200 p-8 transition-all hover:border-brand/30 hover:shadow-lg hover:shadow-indigo-50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-2xl">
                {feature.icon}
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
