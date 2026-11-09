/** Data yang dibutuhkan sebuah mode analisis sebelum bisa dihitung. */
export type DataNeed = "population" | "boundaries";

export type AnalysisModeId =
  | "persebaran"
  | "kapasitas"
  | "rasio"
  | "kepadatan"
  | "aksesibilitas";

export interface AnalysisMode {
  id: AnalysisModeId;
  label: string;
  needs: readonly DataNeed[];
}

export const ANALYSIS_MODES: readonly AnalysisMode[] = [
  { id: "persebaran", label: "Persebaran Fasilitas Kesehatan", needs: [] },
  { id: "kapasitas", label: "Indeks Kapasitas Fasilitas Kesehatan", needs: ["population", "boundaries"] },
  { id: "rasio", label: "Rasio Fasilitas terhadap Penduduk", needs: ["population", "boundaries"] },
  { id: "kepadatan", label: "Kepadatan Penduduk", needs: ["population", "boundaries"] },
  { id: "aksesibilitas", label: "Aksesibilitas Fasilitas Kesehatan", needs: ["boundaries"] },
];

export interface DataAvailability {
  population: boolean;
  boundaries: boolean;
}

const NEED_LABEL: Record<DataNeed, string> = {
  population: "data penduduk",
  boundaries: "batas kelurahan",
};

/** Mengembalikan alasan mode belum bisa dijalankan, atau null jika sudah siap. */
export function getModeBlockReason(mode: AnalysisMode, availability: DataAvailability): string | null {
  const missing = mode.needs.filter((need) => !availability[need]);
  if (missing.length === 0) return null;
  return `Membutuhkan ${missing.map((need) => NEED_LABEL[need]).join(" dan ")}`;
}
