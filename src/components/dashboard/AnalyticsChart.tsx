export interface ChartSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

export interface ChartRow {
  label: string;
  segments: ChartSegment[];
  /** Teks nilai di ujung baris; jika kosong, jumlah segmen ditampilkan. */
  valueText?: string;
}

interface AnalyticsChartProps {
  title: string;
  rows: ChartRow[];
  legend: { label: string; color: string }[];
  delayMs?: number;
}

/** Grafik batang bertumpuk sederhana (tanpa library) untuk perbandingan antarwilayah. */
export default function AnalyticsChart({ title, rows, legend, delayMs = 0 }: AnalyticsChartProps) {
  const rowTotals = rows.map((row) => row.segments.reduce((sum, s) => sum + s.value, 0));
  const max = Math.max(...rowTotals, 0);

  return (
    <div className="animate-fade-in-up rounded-xl border border-white/5 bg-panel-2/50 p-3" style={{ animationDelay: `${delayMs}ms` }}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-ink">{title}</p>
      </div>

      {legend.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1">
          {legend.map((item) => (
            <span key={item.label} className="flex items-center gap-1.5 text-[10px] text-muted">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {rows.map((row, index) => {
          const total = rowTotals[index] ?? 0;
          const widthPct = max > 0 ? (total / max) * 100 : 0;
          return (
            <li key={row.label}>
              <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                <span className="truncate text-muted">{row.label}</span>
                <span className="shrink-0 tabular-nums text-ink">{row.valueText ?? total.toLocaleString("id-ID")}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/5">
                <div className="flex h-full transition-[width] duration-500 ease-out" style={{ width: `${widthPct}%` }}>
                  {row.segments.map((segment) => {
                    const share = total > 0 ? (segment.value / total) * 100 : 0;
                    return (
                      <div
                        key={segment.key}
                        title={`${segment.label}: ${segment.value}`}
                        style={{ width: `${share}%`, backgroundColor: segment.color }}
                        className="h-full"
                      />
                    );
                  })}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
