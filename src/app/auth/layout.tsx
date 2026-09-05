import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden bg-white px-6 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 blur-3xl"
      >
        <div className="mx-auto h-[420px] w-[720px] rounded-full bg-gradient-to-tr from-brand-light via-brand to-purple-300 opacity-20" />
      </div>
      <Link href="/" className="absolute left-6 top-6 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-light text-sm font-bold text-white">
          F
        </span>
        <span className="text-lg font-bold tracking-tight">Flowly</span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}