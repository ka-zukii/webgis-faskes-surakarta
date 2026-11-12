import { Building2, Pill, Stethoscope, Syringe, X } from "lucide-react";
import type { ChangeEvent, ComponentType } from "react";
import type { FacilityType, VisibleTypes } from "@/types";
import { FACILITY_META, FACILITY_TYPES } from "@/features/facilities/meta";
import { ANALYSIS_MODES, getModeBlockReason, type AnalysisModeId, type DataAvailability } from "@/features/analysis/modes";
import { DEFAULT_WEIGHTS, type CapacityWeights } from "@/features/analysis/metrics";

interface SidebarLeftProps {
  open: boolean;
  onClose: () => void;
  counts: Record<FacilityType, number>;
  visibleTypes: VisibleTypes;
  onToggleType: (type: FacilityType) => void;
  showKelurahan: boolean;
  onToggleKelurahan: () => void;
  showKecamatan: boolean;
  onToggleKecamatan: () => void;
  boundaryAvailable: boolean;
  showCoverage: boolean;
  onToggleCoverage: () => void;
  coverageAvailable: boolean;
  analysisMode: AnalysisModeId;
  onModeChange: (mode: AnalysisModeId) => void;
  availability: DataAvailability;
  weights: CapacityWeights;
  onWeightChange: (key: keyof CapacityWeights, value: number) => void;
  onResetWeights: () => void;
}

const TYPE_ICON: Record<FacilityType, ComponentType<{ size?: number; className?: string }>> = {
  hospital: Building2,
  puskesmas: Stethoscope,
  clinic: Syringe,
  pharmacy: Pill,
};

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{children}</h2>
  );
}

function Switch({ on, disabled = false }: { on: boolean; disabled?: boolean }) {
  return (
    <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${on ? "bg-accent/80" : "bg-white/10"}`}>
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`}
      />
      {disabled && <span className="absolute inset-0 rounded-full" />}
    </span>
  );
}

const WEIGHT_FIELDS: { key: keyof CapacityWeights; label: string }[] = [
  { key: "rumahSakit", label: "Rumah sakit" },
  { key: "puskesmas", label: "Puskesmas" },
  { key: "klinik", label: "Klinik" },
  { key: "apotek", label: "Apotek" },
];

export default function SidebarLeft({
  open,
  onClose,
  counts,
  visibleTypes,
  onToggleType,
  showKelurahan,
  onToggleKelurahan,
  showKecamatan,
  onToggleKecamatan,
  boundaryAvailable,
  showCoverage,
  onToggleCoverage,
  coverageAvailable,
  analysisMode,
  onModeChange,
  availability,
  weights,
  onWeightChange,
  onResetWeights,
}: SidebarLeftProps) {
  const weightsDiffer = WEIGHT_FIELDS.some(({ key }) => weights[key] !== DEFAULT_WEIGHTS[key]);

  return (
    <aside
      aria-hidden={!open}
      className={`glass relative z-20 h-full shrink-0 overflow-hidden border-y-0 border-l-0 transition-[width,opacity,transform] duration-300 ease-out max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:w-[min(18rem,88vw)] max-md:shadow-2xl ${
        open ? "w-72 opacity-100 max-md:translate-x-0" : "w-0 border-r-0 opacity-0 max-md:-translate-x-full"
      }`}
    >
      <div className="scroll-thin flex h-full w-72 max-md:w-full flex-col gap-6 overflow-y-auto p-4 pt-14 max-md:pt-4">
        <div className="flex items-center justify-between md:hidden">
          <h2 className="text-sm font-semibold text-ink">Panel kontrol</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel kontrol"
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-muted"
          >
            <X size={15} />
          </button>
        </div>

        <section>
          <SectionTitle>Map Layers</SectionTitle>
          <ul className="flex flex-col gap-1.5">
            {FACILITY_TYPES.map((type) => {
              const Icon = TYPE_ICON[type];
              const meta = FACILITY_META[type];
              const on = visibleTypes[type];
              return (
                <li key={type}>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    onClick={() => onToggleType(type)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                      on
                        ? "border-white/10 bg-panel-2/70 hover:border-white/20"
                        : "border-transparent bg-transparent text-muted hover:bg-panel-2/40"
                    }`}
                  >
                    <span
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                      style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
                    >
                      <Icon size={15} />
                    </span>
                    <span className="flex-1 text-sm font-medium">{meta.label}</span>
                    <span className="text-xs tabular-nums text-muted">{counts[type]}</span>
                    <Switch on={on} />
                  </button>
                </li>
              );
            })}
          </ul>

          <ul className="mt-2 flex flex-col gap-1.5">
            <li>
              <button
                type="button"
                role="switch"
                aria-checked={showKelurahan}
                disabled={!boundaryAvailable}
                onClick={onToggleKelurahan}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-panel-2/70 px-3 py-2.5 text-left transition hover:border-white/20 disabled:opacity-50"
              >
                <span className="flex-1 text-sm font-medium">Batas administrasi kelurahan</span>
                <Switch on={showKelurahan && boundaryAvailable} />
              </button>
            </li>
            <li>
              <button
                type="button"
                role="switch"
                aria-checked={showKecamatan}
                disabled={!boundaryAvailable}
                onClick={onToggleKecamatan}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-panel-2/70 px-3 py-2.5 text-left transition hover:border-white/20 disabled:opacity-50"
              >
                <span className="flex-1 text-sm font-medium">Batas administrasi kecamatan</span>
                <Switch on={showKecamatan && boundaryAvailable} />
              </button>
            </li>
            <li>
              <button
                type="button"
                role="switch"
                aria-checked={showCoverage}
                disabled={!coverageAvailable}
                onClick={onToggleCoverage}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-panel-2/70 px-3 py-2.5 text-left transition hover:border-white/20 disabled:opacity-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">Healthcare Coverage</span>
                  <span className="block text-[11px] text-muted">Merah: di luar buffer 1 km puskesmas (simulasi)</span>
                </span>
                <Switch on={showCoverage && coverageAvailable} />
              </button>
            </li>
          </ul>
        </section>

        <section>
          <SectionTitle>Analysis Mode</SectionTitle>
          <ul className="flex flex-col gap-1.5" role="radiogroup" aria-label="Mode analisis">
            {ANALYSIS_MODES.map((mode) => {
              const reason = getModeBlockReason(mode, availability);
              const disabled = reason !== null;
              const active = analysisMode === mode.id;
              return (
                <li key={mode.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={disabled}
                    onClick={() => onModeChange(mode.id)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                      active
                        ? "border-accent/50 bg-accent/10 shadow-[0_0_20px_-8px_rgb(0_229_255/0.7)]"
                        : "border-white/5 bg-panel-2/40 hover:border-white/15"
                    } disabled:opacity-50`}
                  >
                    <span className={`block text-sm font-medium ${active ? "text-accent" : "text-ink"}`}>
                      {mode.label}
                    </span>
                    {disabled && <span className="mt-0.5 block text-[11px] text-warning/90">{reason}</span>}
                  </button>
                </li>
              );
            })}
          </ul>

          {analysisMode === "kapasitas" && (
            <div className="animate-fade-in-up mt-3 rounded-xl border border-white/10 bg-panel-2/50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold text-ink">Bobot kapasitas</p>
                <button
                  type="button"
                  onClick={onResetWeights}
                  disabled={!weightsDiffer}
                  className="text-[11px] text-accent transition hover:underline disabled:text-muted disabled:no-underline"
                >
                  Reset bobot
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {WEIGHT_FIELDS.map(({ key, label }) => (
                  <label key={key} className="flex flex-col gap-1">
                    <span className="text-[11px] text-muted">{label}</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={weights[key]}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => {
                        const next = Number(event.target.value);
                        onWeightChange(key, Number.isFinite(next) && next >= 0 ? next : 0);
                      }}
                      className="rounded-lg border border-white/10 bg-base/60 px-2 py-1.5 text-sm tabular-nums text-ink outline-none transition focus:border-accent/60"
                    />
                  </label>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-muted">
                Bobot adalah parameter analisis yang dapat diatur, bukan standar resmi kapasitas pelayanan medis.
              </p>
            </div>
          )}
        </section>

        <section>
          <SectionTitle>Sumber Data</SectionTitle>
          <dl className="flex flex-col gap-2 rounded-xl border border-white/10 bg-panel-2/50 px-3 py-2.5 text-[11px] leading-relaxed">
            <div className="flex items-start justify-between gap-3">
              <dt className="shrink-0 text-muted">Kependudukan (2024)</dt>
              <dd className="text-right text-ink/90">BPS Kota Surakarta</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="shrink-0 text-muted">Rumah sakit</dt>
              <dd className="text-right text-ink/90">RS Online (Kemenkes)</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="shrink-0 text-muted">Puskesmas</dt>
              <dd className="text-right text-ink/90">OpenStreetMap</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="shrink-0 text-muted">Klinik pratama</dt>
              <dd className="text-right text-ink/90">OpenStreetMap</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="shrink-0 text-muted">Apotek</dt>
              <dd className="text-right text-ink/90">OpenStreetMap</dd>
            </div>
            <div className="flex items-start justify-between gap-3 border-t border-white/5 pt-2">
              <dt className="shrink-0 text-muted">Koordinat lokasi</dt>
              <dd className="text-right text-ink/90">Google Maps</dd>
            </div>
          </dl>
        </section>
      </div>
    </aside>
  );
}
