import { X } from "lucide-react";
import type { FacilityType, HealthcareFacility } from "@/types";
import { FACILITY_META, FACILITY_TYPES } from "@/features/facilities/meta";
import type { KecamatanShape, KelurahanUnit } from "@/features/analysis/units";
import {
  capacityIndex,
  capacityScore,
  facilityRatio,
  populationDensity,
  totalFacilities,
  type CapacityWeights,
  type EquityCategory,
} from "@/features/analysis/metrics";
import { formatCoord, formatCount, formatDecimal } from "@/utils/format";
import AnalyticsChart, {
  type ChartRow,
} from "@/components/dashboard/AnalyticsChart";
import { citySummary, kecamatanStats } from "@/features/analysis/stats";
import type { EquityConfig } from "@/features/analysis/equity-config";
import EquityPanel from "@/components/dashboard/EquityPanel";

interface SidebarRightProps {
  open: boolean;
  facility: HealthcareFacility | null;
  unit: KelurahanUnit | null;
  kecamatan: KecamatanShape | null;
  coverageByUnit: Record<string, number | null>;
  puskesmasByUnit: Record<string, number | null>;
  equity: Record<string, EquityCategory | null>;
  units: KelurahanUnit[];
  weights: CapacityWeights;
  counts: Record<FacilityType, number>;
  total: number;
  equityConfig: EquityConfig;
  onEquityConfigChange: (next: EquityConfig) => void;
  onClearSelection: () => void;
}

const NOT_AVAILABLE = "Belum tersedia dalam data";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 py-2 last:border-0">
      <dt className="shrink-0 text-xs text-muted">{label}</dt>
      <dd className="text-right text-sm tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Tutup detail"
      className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted transition hover:bg-white/5 hover:text-ink"
    >
      <X size={15} />
    </button>
  );
}

const EQUITY_STYLE: Record<EquityCategory, string> = {
  Tinggi: "text-success bg-success/10",
  Sedang: "text-warning bg-warning/10",
  Rendah: "text-danger bg-danger/10",
};

function FacilityDetail({
  facility,
  onClear,
}: {
  facility: HealthcareFacility;
  onClear: () => void;
}) {
  const meta = FACILITY_META[facility.tipe];
  return (
    <div className="animate-fade-in-up flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold"
            style={{ backgroundColor: `${meta.color}1f`, color: meta.color }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: meta.color }}
            />
            {meta.label}
          </span>
          <h2
            className="mt-2 font-semibold leading-snug text-white"
            style={{ color: "#FFFFFF" }}
          >
            {facility.nama}
          </h2>
        </div>
        <CloseButton onClick={onClear} />
      </div>

      <dl className="rounded-xl border border-white/5 bg-panel-2/50 px-3">
        <DetailRow label="Jenis" value={meta.label} />
        <DetailRow label="Alamat" value={facility.alamat || NOT_AVAILABLE} />
        <DetailRow
          label="Kelurahan"
          value={facility.kelurahan || "Lihat di peta"}
        />
        <DetailRow
          label="Kecamatan"
          value={facility.kecamatan || "Lihat di peta"}
        />
        <DetailRow
          label="Koordinat"
          value={`${formatCoord(facility.latitude)}, ${formatCoord(facility.longitude)}`}
        />
        <DetailRow
          label="Keyakinan klasifikasi"
          value={facility.keyakinan || NOT_AVAILABLE}
        />
        <DetailRow
          label="Status verifikasi"
          value={facility.statusVerifikasi.replace(/_/g, " ") || NOT_AVAILABLE}
        />
        <DetailRow
          label="Sumber"
          value={
            facility.tipe === "hospital"
              ? "RS Online (Kemenkes)"
              : `OpenStreetMap ${facility.osmRef}`
          }
        />
      </dl>

      <p className="text-[11px] leading-relaxed text-muted">
        Kategori asli:{" "}
        <span className="text-ink/80">{facility.kategoriAsli}</span>.
      </p>
    </div>
  );
}

function KelurahanDetail({
  unit,
  units,
  weights,
  equity,
  coverage,
  coveragePkm,
  onClear,
}: {
  unit: KelurahanUnit;
  units: KelurahanUnit[];
  weights: CapacityWeights;
  equity: Record<string, EquityCategory | null>;
  coverage: number | null;
  coveragePkm: number | null;
  onClear: () => void;
}) {
  const index = capacityIndex(unit, weights);
  const ratio = facilityRatio(unit);
  const density = populationDensity(unit);
  const category = equity[unit.id] ?? null;
  const fmtKm = (v: number | null) =>
    v === null ? "-" : `${formatDecimal(v, 2)} km`;
  const pct = (v: number | null) =>
    v === null ? "-" : `${formatDecimal(v, 1)}%`;

  return (
    <div className="animate-fade-in-up flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex rounded-md bg-accent/10 px-2 py-0.5 text-[11px] font-semibold text-accent">
            Kelurahan · {unit.kecamatan}
          </span>
          <h2
            className="mt-2 font-semibold leading-snug text-white"
            style={{ color: "#FFFFFF" }}
          >
            {unit.nama}
          </h2>
        </div>
        <CloseButton onClick={onClear} />
      </div>

      <dl className="rounded-xl border border-white/5 bg-panel-2/50 px-3">
        <DetailRow label="Kecamatan" value={unit.kecamatan} />
        <DetailRow
          label="Penduduk (2024)"
          value={
            unit.hasPopulation ? formatCount(unit.penduduk) : NOT_AVAILABLE
          }
        />
        <DetailRow
          label="Luas wilayah"
          value={`${formatDecimal(unit.areaKm2, 2)} km²`}
        />
        <DetailRow
          label="Kepadatan"
          value={
            density === null
              ? "-"
              : `${formatCount(Math.round(density))} jiwa/km²`
          }
        />
        <DetailRow
          label="Rumah sakit (RS Online)"
          value={formatCount(unit.rs)}
        />
        <DetailRow
          label="Puskesmas (OpenStreetMap)"
          value={formatCount(unit.puskesmas)}
        />
        <DetailRow
          label="Klinik (OpenStreetMap)"
          value={formatCount(unit.klinik)}
        />
        <DetailRow
          label="Apotek (OpenStreetMap)"
          value={formatCount(unit.apotek)}
        />
        <DetailRow
          label="Total fasilitas"
          value={formatCount(totalFacilities(unit))}
        />
        <DetailRow
          label="Indeks kapasitas"
          value={index === null ? "-" : formatDecimal(index, 1)}
        />
        <DetailRow
          label="Fasilitas per 10.000 penduduk"
          value={ratio === null ? "-" : formatDecimal(ratio, 1)}
        />
        <DetailRow label="Kategori pemerataan" value={category ?? "-"} />
        <DetailRow
          label="Cakupan gabungan RS 3 km + puskesmas 1 km"
          value={pct(coverage)}
        />
        <DetailRow
          label="Cakupan puskesmas 1 km saja"
          value={pct(coveragePkm)}
        />
        <DetailRow label="Jarak RS terdekat" value={fmtKm(unit.nearestKm.rs)} />
        <DetailRow
          label="Jarak puskesmas terdekat"
          value={fmtKm(unit.nearestKm.puskesmas)}
        />
        <DetailRow
          label="Jarak klinik terdekat"
          value={fmtKm(unit.nearestKm.klinik)}
        />
      </dl>

      {category && (
        <span
          className={`w-fit rounded-md px-2 py-1 text-[11px] font-semibold ${EQUITY_STYLE[category]}`}
        >
          Kapasitas {category.toLowerCase()} dibanding {units.length} kelurahan
        </span>
      )}

      <p className="text-[11px] leading-relaxed text-muted">
        Jarak dihitung garis lurus dari pusat wilayah ke titik fasilitas
        terdekat, bukan waktu tempuh. RS dan puskesmas memakai titik fasilitas
        di dalam wilayah.
      </p>
    </div>
  );
}

function KecamatanDetail({
  shape,
  units,
  weights,
  coverageByUnit,
  puskesmasByUnit,
  onClear,
}: {
  shape: KecamatanShape;
  units: KelurahanUnit[];
  weights: CapacityWeights;
  coverageByUnit: Record<string, number | null>;
  puskesmasByUnit: Record<string, number | null>;
  onClear: () => void;
}) {
  const members = units.filter((u) => u.kecamatan === shape.nama);
  const penduduk = members.reduce((sum, u) => sum + u.penduduk, 0);
  const area = members.reduce((sum, u) => sum + u.areaKm2, 0);
  const rs = members.reduce((sum, u) => sum + u.rs, 0);
  const puskesmas = members.reduce((sum, u) => sum + u.puskesmas, 0);
  const klinik = members.reduce((sum, u) => sum + u.klinik, 0);
  const apotek = members.reduce((sum, u) => sum + u.apotek, 0);
  const total = rs + puskesmas + klinik + apotek;
  const score = members.reduce((sum, u) => sum + capacityScore(u, weights), 0);
  const index = penduduk > 0 ? (score / penduduk) * 10000 : null;
  const ratio = penduduk > 0 ? (total / penduduk) * 10000 : null;

  const areaWeighted = (
    values: Record<string, number | null>,
  ): number | null => {
    const withValue = members.filter(
      (u) => values[u.id] !== null && values[u.id] !== undefined,
    );
    const withArea = withValue.reduce((sum, u) => sum + u.areaKm2, 0);
    if (withArea <= 0) return null;
    return (
      withValue.reduce((sum, u) => sum + (values[u.id] ?? 0) * u.areaKm2, 0) /
      withArea
    );
  };
  const coverage = areaWeighted(coverageByUnit);
  const coveragePkm = areaWeighted(puskesmasByUnit);

  return (
    <div className="animate-fade-in-up flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-flex rounded-md bg-violet-500/15 px-2 py-0.5 text-[11px] font-semibold text-violet-300">
            Kecamatan · {members.length} kelurahan
          </span>
          <h2
            className="mt-2 font-semibold leading-snug text-white"
            style={{ color: "#FFFFFF" }}
          >
            {shape.nama}
          </h2>
        </div>
        <CloseButton onClick={onClear} />
      </div>

      <dl className="rounded-xl border border-white/5 bg-panel-2/50 px-3">
        <DetailRow
          label="Penduduk (2024)"
          value={penduduk > 0 ? formatCount(penduduk) : NOT_AVAILABLE}
        />
        <DetailRow
          label="Luas wilayah"
          value={`${formatDecimal(area, 2)} km²`}
        />
        <DetailRow
          label="Kepadatan"
          value={
            penduduk > 0 && area > 0
              ? `${formatCount(Math.round(penduduk / area))} jiwa/km²`
              : "-"
          }
        />
        <DetailRow label="Rumah sakit (RS Online)" value={formatCount(rs)} />
        <DetailRow
          label="Puskesmas (OpenStreetMap)"
          value={formatCount(puskesmas)}
        />
        <DetailRow label="Klinik (OpenStreetMap)" value={formatCount(klinik)} />
        <DetailRow label="Apotek (OpenStreetMap)" value={formatCount(apotek)} />
        <DetailRow label="Total fasilitas" value={formatCount(total)} />
        <DetailRow
          label="Indeks kapasitas"
          value={index === null ? "-" : formatDecimal(index, 1)}
        />
        <DetailRow
          label="Fasilitas per 10.000 penduduk"
          value={ratio === null ? "-" : formatDecimal(ratio, 1)}
        />
        <DetailRow
          label="Cakupan gabungan RS 3 km + puskesmas 1 km"
          value={coverage === null ? "-" : `${formatDecimal(coverage, 1)}%`}
        />
        <DetailRow
          label="Cakupan puskesmas 1 km saja"
          value={
            coveragePkm === null ? "-" : `${formatDecimal(coveragePkm, 1)}%`
          }
        />
      </dl>

      <div>
        <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-muted">
          Kelurahan
        </p>
        <div className="flex flex-wrap gap-1.5">
          {members.map((u) => (
            <span
              key={u.id}
              className="rounded-md border border-white/10 bg-panel-2/60 px-2 py-0.5 text-[11px] text-ink"
            >
              {u.nama}
            </span>
          ))}
        </div>
      </div>

      <p className="text-[11px] leading-relaxed text-muted">
        Cakupan kecamatan adalah rata-rata tertimbang luas kelurahan. Buffer 1
        km (puskesmas) dan 3 km (RS) adalah parameter simulasi, bukan standar
        resmi.
      </p>
    </div>
  );
}

function Summary({
  units,
  weights,
  counts,
  total,
  equityConfig,
  onEquityConfigChange,
}: {
  units: KelurahanUnit[];
  weights: CapacityWeights;
  counts: Record<FacilityType, number>;
  total: number;
  equityConfig: EquityConfig;
  onEquityConfigChange: (next: EquityConfig) => void;
}) {
  const city = citySummary(units, weights);
  const stats = kecamatanStats(units, weights);
  const population = city.penduduk;

  const facilityRows: ChartRow[] = stats.map((st) => ({
    label: st.nama,
    segments: [
      {
        key: "rs",
        label: "RS",
        value: st.rs,
        color: FACILITY_META.hospital.color,
      },
      {
        key: "pus",
        label: "Puskesmas",
        value: st.puskesmas,
        color: FACILITY_META.puskesmas.color,
      },
      {
        key: "klinik",
        label: "Klinik",
        value: st.klinik,
        color: FACILITY_META.clinic.color,
      },
      {
        key: "apotek",
        label: "Apotek",
        value: st.apotek,
        color: FACILITY_META.pharmacy.color,
      },
    ],
  }));
  const indexRows: ChartRow[] = stats.map((st) => ({
    label: st.nama,
    segments: [
      {
        key: "idx",
        label: "Indeks",
        value: st.capacityIndex ?? 0,
        color: "#22C55E",
      },
    ],
    valueText:
      st.capacityIndex === null ? "-" : formatDecimal(st.capacityIndex, 1),
  }));
  const density = stats.map((st) => ({
    label: st.nama,
    segments: [
      { key: "pdd", label: "Penduduk", value: st.penduduk, color: "#7000FF" },
    ],
    valueText: st.penduduk > 0 ? formatCount(st.penduduk) : "-",
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="animate-fade-in-up">
        <h2
          className="font-semibold text-white"
          style={{ color: "#FFFFFF" }}
        >
          Dashboard Kota Surakarta
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Pilih kelurahan, kecamatan, atau marker fasilitas pada peta untuk
          melihat detailnya.
        </p>
      </div>

      <div
        className="animate-fade-in-up grid grid-cols-2 gap-2"
        style={{ animationDelay: "40ms" }}
      >
        {FACILITY_TYPES.map((type) => (
          <div
            key={type}
            className="rounded-xl border border-white/5 bg-panel-2/50 p-3"
          >
            <p className="text-[11px] text-muted">
              {FACILITY_META[type].label}
            </p>
            <p
              className="mt-1 text-xl font-semibold tabular-nums"
              style={{ color: FACILITY_META[type].color }}
            >
              {formatCount(counts[type])}
            </p>
          </div>
        ))}
      </div>

      <dl
        className="animate-fade-in-up rounded-xl border border-white/5 bg-panel-2/50 px-3"
        style={{ animationDelay: "80ms" }}
      >
        <DetailRow label="Total fasilitas" value={formatCount(total)} />
        <DetailRow label="Kelurahan" value={formatCount(city.kelurahan)} />
        <DetailRow label="Kecamatan" value={formatCount(stats.length)} />
        <DetailRow
          label="Penduduk (2024)"
          value={population > 0 ? formatCount(population) : NOT_AVAILABLE}
        />
        <DetailRow
          label="RS / puskesmas"
          value={`${formatCount(city.rs)} / ${formatCount(city.puskesmas)}`}
        />
        <DetailRow
          label="Rasio per 10.000 penduduk"
          value={
            population > 0
              ? formatDecimal((city.total / population) * 10000, 1)
              : "-"
          }
        />
      </dl>

      <EquityPanel
        units={units}
        weights={weights}
        config={equityConfig}
        onConfigChange={onEquityConfigChange}
      />

      {city.highest && city.lowest && (
        <div
          className="animate-fade-in-up flex flex-col gap-2"
          style={{ animationDelay: "120ms" }}
        >
          <div className="rounded-xl border border-success/20 bg-success/5 px-3 py-2.5">
            <p className="text-[11px] text-muted">Indeks kapasitas tertinggi</p>
            <p className="text-sm font-medium text-ink">
              {city.highest.nama}{" "}
              <span className="text-success tabular-nums">
                ({formatDecimal(city.highest.value, 1)})
              </span>
            </p>
          </div>
          <div className="rounded-xl border border-danger/20 bg-danger/5 px-3 py-2.5">
            <p className="text-[11px] text-muted">Indeks kapasitas terendah</p>
            <p className="text-sm font-medium text-ink">
              {city.lowest.nama}{" "}
              <span className="text-danger tabular-nums">
                ({formatDecimal(city.lowest.value, 1)})
              </span>
            </p>
          </div>
        </div>
      )}

      <AnalyticsChart
        title="Fasilitas per kecamatan"
        delayMs={160}
        legend={[
          { label: "RS (RS Online)", color: FACILITY_META.hospital.color },
          {
            label: "Puskesmas (OpenStreetMap)",
            color: FACILITY_META.puskesmas.color,
          },
          {
            label: "Klinik (OpenStreetMap)",
            color: FACILITY_META.clinic.color,
          },
          {
            label: "Apotek (OpenStreetMap)",
            color: FACILITY_META.pharmacy.color,
          },
        ]}
        rows={facilityRows}
      />

      <AnalyticsChart
        title="Indeks kapasitas per kecamatan"
        delayMs={200}
        legend={[{ label: "Indeks kapasitas", color: "#22C55E" }]}
        rows={indexRows}
      />

      <AnalyticsChart
        title="Penduduk per kecamatan (2024)"
        delayMs={240}
        legend={[{ label: "Jumlah penduduk", color: "#7000FF" }]}
        rows={density}
      />

      <p
        className="animate-fade-in-up text-[11px] leading-relaxed text-muted"
        style={{ animationDelay: "280ms" }}
      >
        Indeks kapasitas bergantung pada bobot di sidebar kiri. Seluruh
        fasilitas dihitung dari titik fasilitas di dalam wilayah kelurahan.
      </p>
    </div>
  );
}

export default function SidebarRight({
  open,
  facility,
  unit,
  kecamatan,
  coverageByUnit,
  puskesmasByUnit,
  equity,
  units,
  weights,
  counts,
  total,
  equityConfig,
  onEquityConfigChange,
  onClearSelection,
}: SidebarRightProps) {
  return (
    <aside
      aria-hidden={!open}
      className={`glass relative z-20 h-full shrink-0 overflow-hidden border-y-0 border-r-0 transition-[width,opacity] duration-300 ease-out ${
        open ? "w-80 opacity-100" : "w-0 border-l-0 opacity-0"
      }`}
    >
      <div className="scroll-thin h-full w-80 overflow-y-auto p-4 pt-14">
        {facility && (
          <FacilityDetail
            key={facility.id}
            facility={facility}
            onClear={onClearSelection}
          />
        )}
        {!facility && unit && (
          <KelurahanDetail
            key={unit.id}
            unit={unit}
            units={units}
            weights={weights}
            equity={equity}
            coverage={coverageByUnit[unit.id] ?? null}
            coveragePkm={puskesmasByUnit[unit.id] ?? null}
            onClear={onClearSelection}
          />
        )}
        {!facility && !unit && kecamatan && (
          <KecamatanDetail
            key={kecamatan.nama}
            shape={kecamatan}
            units={units}
            weights={weights}
            coverageByUnit={coverageByUnit}
            puskesmasByUnit={puskesmasByUnit}
            onClear={onClearSelection}
          />
        )}
        {!facility && !unit && !kecamatan && (
          <Summary
            units={units}
            weights={weights}
            counts={counts}
            total={total}
            equityConfig={equityConfig}
            onEquityConfigChange={onEquityConfigChange}
          />
        )}
      </div>
    </aside>
  );
}
