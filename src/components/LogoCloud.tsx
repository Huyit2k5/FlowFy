const logos = ["Acme", "Nova", "Zenith", "Orbit", "Vertex", "Lumen"];

export default function LogoCloud() {
  return (
    <section className="border-y border-zinc-100 bg-zinc-50/60 py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-zinc-500">
          Được tin dùng bởi hơn 2.000 doanh nghiệp trên toàn thế giới
        </p>
        <div className="mt-8 grid grid-cols-2 items-center justify-items-center gap-8 sm:grid-cols-3 lg:grid-cols-6">
          {logos.map((logo) => (
            <span
              key={logo}
              className="text-xl font-bold tracking-tight text-zinc-300 select-none"
            >
              {logo}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
