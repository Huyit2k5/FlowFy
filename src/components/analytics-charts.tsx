"use client";

interface BarChartProps {
  data: Array<{ date: string; value: number; secondary?: number }>;
  height?: number;
  color?: string;
  secondaryColor?: string;
  label?: string;
}

export function BarChart({ data, height = 160, color = "hsl(222 70% 50%)", secondaryColor = "hsl(0 70% 50%)", label }: BarChartProps) {
  if (data.length === 0) return <p className="text-sm text-zinc-400">Chưa có dữ liệu</p>;

  const w = 600;
  const h = height;
  const pad = { top: 10, bottom: 24, left: 36, right: 10 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barW = Math.max(2, (chartW / data.length) * 0.7);
  const gap = chartW / data.length;

  return (
    <div>
      {label && <p className="mb-1 text-xs font-medium text-zinc-500">{label}</p>}
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={label || "bar chart"}>
        {/* Y axis */}
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={h - pad.bottom} stroke="#e4e4e7" />
        <line x1={pad.left} y1={h - pad.bottom} x2={w - pad.right} y2={h - pad.bottom} stroke="#e4e4e7" />
        {/* Y labels */}
        <text x={pad.left - 4} y={pad.top + 4} textAnchor="end" className="fill-zinc-400" fontSize={9}>{maxVal}</text>
        <text x={pad.left - 4} y={h - pad.bottom} textAnchor="end" className="fill-zinc-400" fontSize={9}>0</text>
        {/* Bars */}
        {data.map((d, i) => {
          const x = pad.left + i * gap + (gap - barW) / 2;
          const barH = (d.value / maxVal) * chartH;
          const y = h - pad.bottom - barH;
          return (
            <g key={d.date}>
              <rect x={x} y={y} width={barW} height={barH} fill={color} rx={2} opacity={0.85} />
              {d.secondary !== undefined && (
                <rect x={x} y={h - pad.bottom - (d.secondary / maxVal) * chartH} width={barW} height={(d.secondary / maxVal) * chartH} fill={secondaryColor} rx={2} opacity={0.5} />
              )}
              {i % Math.ceil(data.length / 7) === 0 && (
                <text x={x + barW / 2} y={h - pad.bottom + 12} textAnchor="middle" className="fill-zinc-400" fontSize={8}>
                  {d.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: string;
}

export function StatCard({ label, value, sub, icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center gap-2">
        {icon && <span className="text-lg" aria-hidden>{icon}</span>}
        <p className="text-xs font-medium text-zinc-500">{label}</p>
      </div>
      <p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}