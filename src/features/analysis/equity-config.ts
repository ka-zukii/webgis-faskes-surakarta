/**
 * Konfigurasi analisis pemerataan.
 * Angka di sini adalah PARAMETER yang bisa diubah pengguna lewat panel UI.
 * Setiap ambang wajib memiliki sumber; nilai null berarti tidak dipakai.
 */

export type StandardMethod =
  | "rasio_kecamatan"
  | "minimal_kecamatan"
  | "waktu_tempuh";

export type Arah = "lebih_rendah_lebih_baik" | "lebih_tinggi_lebih_baik";

export interface StandardReference {
  id: string;
  label: string;
  /** Cara mengevaluasi ambang terhadap data yang tersedia. */
  method: StandardMethod;
  /** Nilai ambang; null berarti ambang tidak aktif. */
  value: number | null;
  arah: Arah;
  sumber: string;
}

export interface EquityConfig {
  /** Batas kelas Gini: di bawah `rendah` = Rendah, di bawah `sedang` = Sedang, selainnya Tinggi. */
  giniBands: { rendah: number; sedang: number };
  rujukanStandar: StandardReference[];
}

const PERMENKES_19_2024 = "Permenkes No. 19 Tahun 2024";

export const DEFAULT_STANDARDS: StandardReference[] = [
  {
    id: "rasio-penduduk-puskesmas",
    label: "Penduduk per Puskesmas (rasio lokasi)",
    method: "rasio_kecamatan",
    value: 30000,
    arah: "lebih_rendah_lebih_baik",
    sumber: `${PERMENKES_19_2024}, Pasal 10 ayat (3)`,
  },
  {
    id: "minimal-puskesmas-kecamatan",
    label: "Minimal Puskesmas per kecamatan",
    method: "minimal_kecamatan",
    value: 1,
    arah: "lebih_tinggi_lebih_baik",
    sumber: `${PERMENKES_19_2024}, Pasal 10 ayat (1)`,
  },
  {
    id: "waktu-tempuh-puskesmas",
    label: "Waktu tempuh maksimal ke Puskesmas (menit)",
    method: "waktu_tempuh",
    value: 60,
    arah: "lebih_rendah_lebih_baik",
    sumber: `${PERMENKES_19_2024}, Pasal 10 ayat (5) huruf a`,
  },
];

export const DEFAULT_EQUITY_CONFIG: EquityConfig = {
  giniBands: { rendah: 0.2, sedang: 0.4 },
  rujukanStandar: DEFAULT_STANDARDS,
};

export type ConfigIssue = { field: string; message: string };

export function validateEquityConfig(config: EquityConfig): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  const g = config.giniBands;
  if (!(g.rendah > 0 && g.rendah < g.sedang && g.sedang < 1)) {
    issues.push({
      field: "giniBands",
      message: "Harus 0 < rendah < sedang < 1.",
    });
  }
  config.rujukanStandar.forEach((s, i) => {
    if (s.value === null) return;
    if (!Number.isFinite(s.value) || s.value < 0) {
      issues.push({
        field: `rujukanStandar[${i}]`,
        message: `${s.label}: nilai harus angka non-negatif.`,
      });
    }
    if (s.sumber.trim() === "") {
      issues.push({
        field: `rujukanStandar[${i}]`,
        message: `${s.label}: sumber wajib diisi.`,
      });
    }
  });
  return issues;
}

export function giniBandLabel(
  gini: number | null,
  bands: EquityConfig["giniBands"],
): string {
  if (gini === null) return "Tidak tersedia";
  if (gini < bands.rendah) return "Rendah";
  if (gini < bands.sedang) return "Sedang";
  return "Tinggi";
}

/** Apakah nilai memenuhi ambang sesuai arah yang ditetapkan rujukan. */
export function meetsStandard(
  actual: number,
  target: number,
  arah: Arah,
): boolean {
  return arah === "lebih_rendah_lebih_baik"
    ? actual <= target
    : actual >= target;
}
