import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/toast-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Flowly — Tự động hóa quy trình làm việc cho doanh nghiệp",
    template: "%s — Flowly",
  },
  description:
    "Flowly giúp đội ngũ của bạn quản lý công việc, tự động hóa quy trình lặp lại và cộng tác hiệu quả hơn trong một nền tảng duy nhất.",
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "vi_VN",
    url: "https://flowly.vn",
    siteName: "Flowly",
    title: "Flowly — Tự động hóa quy trình làm việc",
    description:
      "Tự động hóa webhook, email, Slack, Notion. Cộng tác realtime. Chạy định kỳ.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Flowly — Tự động hóa quy trình làm việc",
    description: "Webhook → Xử lý → Slack/Email/Notion. Cộng tác realtime.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
