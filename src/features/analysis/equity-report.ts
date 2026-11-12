import {
  capacityIndex,
  type CapacityWeights,
} from "@/features/analysis/metrics";
import {
  computeEquity,
  lorenzCurve,
  type EquityMetrics,
  type LorenzPoint,
} from "@/features/analysis/equity";
import {
  giniBandLabel,
  meetsStandard,
  type EquityConfig,
  type StandardReference,
} from "@/features/analysis/equity-config";
import type { KelurahanUnit } from "@/features/analysis/units";
import { kecamatanStats } from "@/features/analysis/stats";

export type StandardStatus =
  | "memenuhi"
  | "tidak_memenuhi"
  | "belum_dihitung"
  | "tidak_aktif";

export interface KecamatanCheck {
  nama: string;
  penduduk: number;
  puskesmas: number;
  /** null jika kecamatan tidak punya Puskesmas (rasio tidak terdefinisi). */
  pendudukPerPuskesmas: number | null;
}

export interface StandardResult {
  standard: StandardReference;
  status: StandardStatus;
  /** Jumlah unit yang dievaluasi, misalnya kecamatan berpenduduk. */
  evaluated: number;
  /** Nama unit yang tidak memenuhi ambang, sudah diformat untuk ditampilkan. */
  failing: string[];
  note: string;
}

export interface EquityReport {
  capacity: EquityMetrics;
  giniLabel: string;
  lorenz: LorenzPoint[];
  kecamatan: KecamatanCheck[];
  standards: StandardResult[];
  dataNotes: string[];
}

const DATA_NOTES = [
  "Jumlah Puskesmas berasal dari OpenStreetMap. Verifikasi dengan daftar resmi Dinas Kesehatan sebelum dipakai untuk keputusan.",
  "Penduduk berasal dari BPS Kota Surakarta, data 2024.",
  "Rasio penduduk per Puskesmas adalah pertimbangan lokasi menurut Permenkes, bukan kuota wajib per wilayah.",
];

/** Menghitung seluruh indikator pemerataan dari data kelurahan dan konfigurasi. */
export function buildEquityReport(
  units: KelurahanUnit[],
  weights: CapacityWeights,
  config: EquityConfig,
): EquityReport {
  const capacityValues = units.map((u) => capacityIndex(u, weights));
  const capacity = computeEquity(capacityValues);

  const kecamatan: KecamatanCheck[] = kecamatanStats(units, weights).map(
    (st) => ({
      nama: st.nama,
      penduduk: st.penduduk,
      puskesmas: st.puskesmas,
      pendudukPerPuskesmas:
        st.puskesmas > 0 && st.penduduk > 0 ? st.penduduk / st.puskesmas : null,
    }),
  );

  const standards = config.rujukanStandar.map((std) =>
    evaluateStandard(std, kecamatan),
  );

  return {
    capacity,
    giniLabel: giniBandLabel(capacity.gini, config.giniBands),
    lorenz: lorenzCurve(capacityValues),
    kecamatan,
    standards,
    dataNotes: DATA_NOTES,
  };
}

function evaluateStandard(
  std: StandardReference,
  kecamatan: KecamatanCheck[],
): StandardResult {
  const base = { standard: std, evaluated: 0, failing: [] as string[] };
  if (std.value === null) {
    return { ...base, status: "tidak_aktif", note: "Ambang belum diisi." };
  }
  const target = std.value;

  if (std.method === "rasio_kecamatan") {
    const populated = kecamatan.filter((k) => k.penduduk > 0);
    const failing = populated.filter(
      (k) =>
        k.pendudukPerPuskesmas === null ||
        !meetsStandard(k.pendudukPerPuskesmas, target, std.arah),
    );
    return {
      standard: std,
      evaluated: populated.length,
      failing: failing.map((k) =>
        k.pendudukPerPuskesmas === null
          ? `${k.nama} (tanpa Puskesmas)`
          : `${k.nama} (${Math.round(k.pendudukPerPuskesmas).toLocaleString("id-ID")} per Puskesmas)`,
      ),
      status: failing.length === 0 ? "memenuhi" : "tidak_memenuhi",
      note: `Dievaluasi per kecamatan dengan penduduk 2024. Ambang ${target.toLocaleString("id-ID")} penduduk per Puskesmas.`,
    };
  }

  if (std.method === "minimal_kecamatan") {
    const failing = kecamatan.filter((k) => k.puskesmas < target);
    return {
      standard: std,
      evaluated: kecamatan.length,
      failing: failing.map((k) => `${k.nama} (${k.puskesmas} Puskesmas)`),
      status: failing.length === 0 ? "memenuhi" : "tidak_memenuhi",
      note: `Dievaluasi per kecamatan. Minimal ${target} Puskesmas per kecamatan.`,
    };
  }

  // waktu_tempuh: butuh jaringan jalan, belum tersedia di proyek ini.
  return {
    ...base,
    status: "belum_dihitung",
    note: "Membutuhkan data jaringan jalan untuk menghitung waktu tempuh. Belum tersedia di proyek ini.",
  };
}
