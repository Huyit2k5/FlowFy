const columns = [
  {
    title: "Sản phẩm",
    links: ["Tính năng", "Bảng giá", "Tích hợp", "Đổi mới"],
  },
  {
    title: "Công ty",
    links: ["Về chúng tôi", "Tuyển dụng", "Blog", "Liên hệ"],
  },
  {
    title: "Tài nguyên",
    links: ["Tài liệu", "Hướng dẫn", "Cộng đồng", "Trạng thái hệ thống"],
  },
  {
    title: "Pháp lý",
    links: ["Điều khoản dịch vụ", "Chính sách bảo mật", "Bảo mật"],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <a href="#" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-light text-sm font-bold text-white">
                F
              </span>
              <span className="text-lg font-bold tracking-tight text-foreground">
                Flowly
              </span>
            </a>
            <p className="mt-4 max-w-xs text-sm text-zinc-500">
              Nền tảng tự động hóa quy trình làm việc cho đội ngũ hiện đại.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold text-foreground">
                {col.title}
              </h3>
              <ul className="mt-4 flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-zinc-500 transition-colors hover:text-brand"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-zinc-200 pt-8 sm:flex-row">
          <p className="text-sm text-zinc-500">
            © {new Date().getFullYear()} Flowly, Inc. Đã đăng ký bản quyền.
          </p>
          <div className="flex items-center gap-6">
            {["Twitter", "LinkedIn", "Facebook"].map((social) => (
              <a
                key={social}
                href="#"
                className="text-sm text-zinc-500 transition-colors hover:text-brand"
              >
                {social}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
