import { useMemo, useState } from "react";
import type { KelurahanUnit } from "@/features/analysis/units";
import type { CapacityWeights } from "@/features/analysis/metrics";
import {
  validateEquityConfig,
  DEFAULT_EQUITY_CONFIG,
  type EquityConfig,
  type StandardReference,
  type StandardMethod,
} from "@/features/analysis/equity-config";
import {
  buildEquityReport,
  type StandardResult,
  type StandardStatus,
} from "@/features/analysis/equity-report";
import { formatCount, formatDecimal } from "@/utils/format";

interface EquityPanelProps {
  units: KelurahanUnit[];
  weights: CapacityWeights;
  config: EquityConfig;
  onConfigChange: (next: EquityConfig) => void;
}

const STATUS_STYLE: Record<
  StandardStatus,
  { label: string; className: string }
> = {
  memenuhi: { label: "Memenuhi", className: "text-success bg-success/10" },
  tidak_memenuhi: {
    label: "Tidak memenuhi",
    className: "text-danger bg-danger/10",
  },
  belum_dihitung: {
    label: "Belum dihitung",
    className: "text-muted bg-white/5",
  },
  tidak_aktif: { label: "Tidak aktif", className: "text-muted bg-white/5" },
};

const METHOD_HINT: Record<StandardMethod, string> = {
  rasio_kecamatan: "Dihitung per kecamatan",
  minimal_kecamatan: "Dihitung per kecamatan",
  waktu_tempuh: "Perlu data jaringan jalan",
};

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-panel-2/50 p-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-ink">
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

/** Kurva Lorenz: garis putus-putus adalah kondisi merata sempurna. */
function LorenzChart({
  points,
}: {
  points: { popShare: number; valueShare: number }[];
}) {
  if (points.length < 2) return null;
  const toSvg = (p: { popShare: number; valueShare: number }) =>
    `${(p.popShare * 100).toFixed(2)},${((1 - p.valueShare) * 100).toFixed(2)}`;
  const polyline = points.map(toSvg).join(" ");
  return (
    <svg
      viewBox="-4 -4 108 108"
      className="h-40 w-full overflow-visible"
      role="img"
      aria-label="Kurva Lorenz kapasitas kelurahan"
    >
      <rect
        x="0"
        y="0"
        width="100"
        height="100"
        fill="none"
        stroke="rgba(255,255,255,0.08)"
      />
      <line
        x1="0"
        y1="100"
        x2="100"
        y2="0"
        stroke="rgba(255,255,255,0.35)"
        strokeDasharray="3 3"
      />
      <polyline
        points={polyline}
        fill="none"
        stroke="#22C55E"
        strokeWidth="1.8"
      />
      <text
        x="0"
        y="110"
        fontSize="5"
        fill="currentColor"
        className="text-muted"
      >
        0%
      </text>
      <text
        x="92"
        y="110"
        fontSize="5"
        fill="currentColor"
        className="text-muted"
      >
        100%
      </text>
      <text
        x="-3"
        y="4"
        fontSize="5"
        fill="currentColor"
        className="text-muted"
      >
        100%
      </text>
    </svg>
  );
}

function StandardRow({ result }: { result: StandardResult }) {
  const style = STATUS_STYLE[result.status];
  const { standard } = result;
  return (
    <li className="rounded-xl border border-white/5 bg-panel-2/50 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-ink">{standard.label}</p>
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-semibold ${style.className}`}
        >
          {style.label}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted">
        Ambang: {standard.value === null ? "-" : formatCount(standard.value)} ·{" "}
        {METHOD_HINT[standard.method]}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted">
        {result.note}
      </p>
      {result.failing.length > 0 && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-danger">
          Belum memenuhi: {result.failing.join("; ")}
        </p>
      )}
      <p className="mt-1.5 text-[10px] leading-relaxed text-muted">
        Sumber: {standard.sumber}
      </p>
    </li>
  );
}

function SettingsForm({
  config,
  onChange,
  onReset,
}: {
  config: EquityConfig;
  onChange: (next: EquityConfig) => void;
  onReset: () => void;
}) {
  const issues = useMemo(() => validateEquityConfig(config), [config]);

  const setBand = (key: "rendah" | "sedang", raw: string) => {
    const value = raw === "" ? NaN : Number(raw);
    onChange({ ...config, giniBands: { ...config.giniBands, [key]: value } });
  };

  const setStandardValue = (id: string, raw: string) => {
    const value = raw.trim() === "" ? null : Number(raw);
    onChange({
      ...config,
      rujukanStandar: config.rujukanStandar.map((s: StandardReference) =>
        s.id === id ? { ...s, value } : s,
      ),
    });
  };

  const inputClass =
    "w-full rounded-md border border-white/10 bg-panel-2/60 px-2 py-1 text-sm tabular-nums text-ink outline-none focus:border-accent";

  return (
    <div className="flex flex-col gap-3 pt-2">
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-[11px] text-muted">
          Batas Gini rendah
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            className={inputClass}
            value={
              Number.isFinite(config.giniBands.rendah)
                ? config.giniBands.rendah
                : ""
            }
            onChange={(e) => setBand("rendah", e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-muted">
          Batas Gini sedang
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            className={inputClass}
            value={
              Number.isFinite(config.giniBands.sedang)
                ? config.giniBands.sedang
                : ""
            }
            onChange={(e) => setBand("sedang", e.target.value)}
          />
        </label>
      </div>

      {config.rujukanStandar.map((s) => (
        <label
          key={s.id}
          className="flex flex-col gap-1 text-[11px] text-muted"
        >
          {s.label}
          <input
            type="number"
            min="0"
            placeholder="Kosongkan untuk nonaktifkan"
            className={inputClass}
            value={s.value ?? ""}
            onChange={(e) => setStandardValue(s.id, e.target.value)}
          />
        </label>
      ))}

      {issues.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-md border border-danger/30 bg-danger/5 p-2 text-[11px] text-danger">
          {issues.map((issue) => (
            <li key={issue.field}>{issue.message}</li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onReset}
        className="w-fit rounded-md border border-white/10 px-2.5 py-1 text-[11px] text-muted transition hover:bg-white/5 hover:text-ink"
      >
        Kembalikan ke rujukan awal
      </button>
    </div>
  );
}

export default function EquityPanel({
  units,
  weights,
  config,
  onConfigChange,
}: EquityPanelProps) {
  const [showSettings, setShowSettings] = useState(false);
  const report = useMemo(
    () => buildEquityReport(units, weights, config),
    [units, weights, config],
  );
  const { capacity } = report;
  const fmt = (v: number | null, digits = 3) =>
    v === null ? "-" : formatDecimal(v, digits);

  return (
    <section
      className="animate-fade-in-up flex flex-col gap-3"
      style={{ animationDelay: "100ms" }}
    >
      <div>
        <h3 className="text-sm font-semibold">Pemerataan layanan</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          Ketimpangan indeks kapasitas antar {capacity.n} kelurahan.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Metric
          label="Gini"
          value={fmt(capacity.gini)}
          hint={`Kelas ${report.giniLabel}`}
        />
        <Metric label="Theil" value={fmt(capacity.theil)} hint="0 = merata" />
        <Metric
          label="Koefisien variasi"
          value={
            capacity.coefficientOfVariation === null
              ? "-"
              : `${formatDecimal(capacity.coefficientOfVariation * 100, 1)}%`
          }
        />
        <Metric
          label="Maks / min"
          value={
            capacity.maxMinRatio === null
              ? "-"
              : `${formatDecimal(capacity.maxMinRatio, 1)}×`
          }
        />
      </div>

      <div className="rounded-xl border border-white/5 bg-panel-2/50 p-3">
        <p className="mb-2 text-[11px] text-muted">
          Kurva Lorenz indeks kapasitas
        </p>
        <LorenzChart points={report.lorenz} />
      </div>

      <div>
        <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-muted">
          Rujukan standar
        </p>
        <ul className="flex flex-col gap-2">
          {report.standards.map((r) => (
            <StandardRow key={r.standard.id} result={r} />
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-muted">
          Penduduk per Puskesmas per kecamatan
        </p>
        <div className="overflow-hidden rounded-xl border border-white/5">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-panel-2/60 text-muted">
              <tr>
                <th className="px-2 py-1.5 font-medium">Kecamatan</th>
                <th className="px-2 py-1.5 text-right font-medium">
                  Puskesmas
                </th>
                <th className="px-2 py-1.5 text-right font-medium">
                  Per Puskesmas
                </th>
              </tr>
            </thead>
            <tbody>
              {report.kecamatan.map((k) => (
                <tr key={k.nama} className="border-t border-white/5">
                  <td className="px-2 py-1.5 text-ink">{k.nama}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {k.puskesmas}
                  </td>
                  <td className="px-2 py-1.5 text-right tabular-nums">
                    {k.pendudukPerPuskesmas === null
                      ? "-"
                      : formatCount(Math.round(k.pendudukPerPuskesmas))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowSettings((v) => !v)}
          aria-expanded={showSettings}
          className="text-[11px] font-medium text-accent hover:underline"
        >
          {showSettings
            ? "Tutup pengaturan ambang"
            : "Atur ambang dan batas kelas"}
        </button>
        {showSettings && (
          <SettingsForm
            config={config}
            onChange={onConfigChange}
            onReset={() => onConfigChange(DEFAULT_EQUITY_CONFIG)}
          />
        )}
      </div>

      <ul className="flex flex-col gap-1 text-[11px] leading-relaxed text-muted">
        {report.dataNotes.map((note) => (
          <li key={note}>• {note}</li>
        ))}
      </ul>
    </section>
  );
}
