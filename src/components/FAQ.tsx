"use client";

import { useState } from "react";

const faqs = [
  {
    question: "Flowly có phù hợp với doanh nghiệp nhỏ không?",
    answer:
      "Có. Flowly được thiết kế để phù hợp với mọi quy mô, từ đội nhóm 2-3 người đến doanh nghiệp hàng trăm nhân viên. Gói Miễn phí là điểm khởi đầu lý tưởng cho các đội nhóm nhỏ.",
  },
  {
    question: "Tôi có cần kỹ năng kỹ thuật để sử dụng không?",
    answer:
      "Không. Flowly có giao diện kéo-thả trực quan, không yêu cầu biết lập trình. Đội ngũ hỗ trợ cũng luôn sẵn sàng giúp bạn trong quá trình triển khai.",
  },
  {
    question: "Tôi có thể hủy gói đăng ký bất cứ lúc nào không?",
    answer:
      "Có, bạn có thể nâng cấp, hạ cấp hoặc hủy gói đăng ký bất cứ lúc nào mà không phát sinh phí ẩn.",
  },
  {
    question: "Dữ liệu của tôi có được bảo mật không?",
    answer:
      "Flowly sử dụng mã hóa đầu cuối và tuân thủ các tiêu chuẩn bảo mật quốc tế như SOC 2 và GDPR để đảm bảo dữ liệu của bạn luôn an toàn.",
  },
  {
    question: "Flowly có hỗ trợ tích hợp với công cụ tôi đang dùng không?",
    answer:
      "Flowly tích hợp sẵn với hơn 50 công cụ phổ biến như Slack, Google Workspace, Notion, Trello và nhiều hơn nữa. Bạn cũng có thể dùng API để tích hợp tùy chỉnh.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">
            FAQ
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Câu hỏi thường gặp
          </p>
        </div>

        <div className="mt-12 divide-y divide-zinc-200 border-t border-b border-zinc-200">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={faq.question}>
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between gap-4 py-6 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-base font-semibold text-foreground">
                    {faq.question}
                  </span>
                  <span
                    className={`shrink-0 text-xl text-brand transition-transform ${
                      isOpen ? "rotate-45" : ""
                    }`}
                    aria-hidden
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <p className="pb-6 text-sm leading-relaxed text-zinc-600">
                    {faq.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
