import Papa from "papaparse";
import { dataUrl } from "@/services/geojson.service";

export interface PopulationRow {
  kecamatan: string;
  kelurahan: string;
  penduduk: number;
}

export interface KelurahanTables {
  penduduk: PopulationRow[];
}

function toCount(value: string | undefined): number {
  const parsed = Number((value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

async function fetchRows(fileName: string, signal?: AbortSignal): Promise<Record<string, string>[]> {
  const response = await fetch(dataUrl(fileName), { signal, cache: "no-cache" });
  if (!response.ok) throw new Error(`${fileName} tidak ditemukan (HTTP ${response.status})`);

  const text = await response.text();
  // Server dev Vite mengembalikan index.html untuk path yang tidak ada.
  if (text.trimStart().startsWith("<")) throw new Error(`${fileName} bukan berkas CSV`);

  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), {
    header: true,
    skipEmptyLines: true,
  });
  return parsed.data;
}

/** Memuat tabel penduduk per kelurahan (BPS 2024). Fasilitas diambil dari OSM. */
export async function loadKelurahanTables(signal?: AbortSignal): Promise<KelurahanTables> {
  const pendudukRows = await fetchRows("penduduk_kelurahan_2024.csv", signal);

  return {
    penduduk: pendudukRows
      .filter((row) => (row.kelurahan ?? "").trim() !== "")
      .map((row) => ({
        kecamatan: (row.kecamatan ?? "").trim(),
        kelurahan: row.kelurahan.trim(),
        penduduk: toCount(row.jumlah_penduduk_2024),
      })),
  };
}
