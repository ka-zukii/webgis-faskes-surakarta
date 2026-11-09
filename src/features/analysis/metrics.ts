import type { AnalysisModeId } from "@/features/analysis/modes";
import type { KelurahanUnit } from "@/features/analysis/units";
import { formatCount, formatDecimal } from "@/utils/format";

export interface CapacityWeights {
  rumahSakit: number;
  puskesmas: number;
  klinik: number;
  apotek: number;
}

/** Bobot awal analisis; parameter konfigurasi, bukan standar resmi kapasitas pelayanan. */
export const DEFAULT_WEIGHTS: CapacityWeights = {
  rumahSakit: 10,
  puskesmas: 5,
  klinik: 2,
  apotek: 1,
};

export const MIN_HEIGHT_KM = 0.05;
export const MAX_HEIGHT_KM = 0.9;
export const NO_DATA_COLOR = "#334155";

export function totalFacilities(unit: KelurahanUnit): number {
  return unit.rs + unit.puskesmas + unit.klinik + unit.apotek;
}

export function capacityScore(unit: KelurahanUnit, weights: CapacityWeights): number {
  return (
    unit.rs * weights.rumahSakit +
    unit.puskesmas * weights.puskesmas +
    unit.klinik * weights.klinik +
    unit.apotek * weights.apotek
  );
}

/** Indeks kapasitas = (kapasitas / penduduk) × 10.000. */
export function capacityIndex(unit: KelurahanUnit, weights: CapacityWeights): number | null {
  if (!unit.hasPopulation || unit.penduduk <= 0) return null;
  return (capacityScore(unit, weights) / unit.penduduk) * 10000;
}

/** Jumlah seluruh fasilitas per 10.000 penduduk. */
export function facilityRatio(unit: KelurahanUnit): number | null {
  if (!unit.hasPopulation || unit.penduduk <= 0) return null;
  return (totalFacilities(unit) / unit.penduduk) * 10000;
}

export function populationDensity(unit: KelurahanUnit): number | null {
  if (!unit.hasPopulation || unit.areaKm2 <= 0) return null;
  return unit.penduduk / unit.areaKm2;
}

/** Jarak garis lurus ke fasilitas terdekat (RS, puskesmas, klinik), dalam km. */
export function nearestAccessKm(unit: KelurahanUnit): number | null {
  const values = [unit.nearestKm.rs, unit.nearestKm.puskesmas, unit.nearestKm.klinik].filter(
    (v): v is number => v !== null,
  );
  return values.length > 0 ? Math.min(...values) : null;
}

type Palette = "sequential" | "diverging";

interface ModeMeta {
  label: string;
  palette: Palette;
  /** Jika false, nilai tinggi dianggap buruk (warna dibalik). */
  higherIsBetter: boolean;
  format: (value: number) => string;
}

export const MODE_META: Record<AnalysisModeId, ModeMeta> = {
  persebaran: {
    label: "Jumlah fasilitas",
    palette: "sequential",
    higherIsBetter: true,
    format: (v) => `${formatCount(Math.round(v))} fasilitas`,
  },
  kapasitas: {
    label: "Indeks kapasitas",
    palette: "diverging",
    higherIsBetter: true,
    format: (v) => formatDecimal(v, 1),
  },
  rasio: {
    label: "Fasilitas per 10.000 penduduk",
    palette: "diverging",
    higherIsBetter: true,
    format: (v) => formatDecimal(v, 1),
  },
  kepadatan: {
    label: "Kepadatan penduduk (jiwa/km²)",
    palette: "sequential",
    higherIsBetter: true,
    format: (v) => `${formatCount(Math.round(v))} jiwa/km²`,
  },
  aksesibilitas: {
    label: "Jarak ke fasilitas terdekat (km)",
    palette: "diverging",
    higherIsBetter: false,
    format: (v) => `${formatDecimal(v, 2)} km`,
  },
};

export function getModeValue(
  mode: AnalysisModeId,
  unit: KelurahanUnit,
  weights: CapacityWeights,
): number | null {
  switch (mode) {
    case "persebaran":
      return totalFacilities(unit);
    case "kapasitas":
      return capacityIndex(unit, weights);
    case "rasio":
      return facilityRatio(unit);
    case "kepadatan":
      return populationDensity(unit);
    case "aksesibilitas":
      return nearestAccessKm(unit);
  }
}

const PALETTES: Record<Palette, string[]> = {
  sequential: ["#0E7490", "#00E5FF", "#7000FF"],
  diverging: ["#EF4444", "#F59E0B", "#22C55E"],
};

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
}

/** Interpolasi linear sepanjang palet warna; t di rentang 0..1. */
export function sampleRamp(stops: string[], t: number): string {
  const clamped = Math.min(Math.max(t, 0), 1);
  const position = clamped * (stops.length - 1);
  const index = Math.min(Math.floor(position), stops.length - 2);
  const frac = position - index;
  const from = hexToRgb(stops[index] ?? stops[0] ?? "#000000");
  const to = hexToRgb(stops[index + 1] ?? stops[stops.length - 1] ?? "#000000");
  return rgbToHex([
    from[0] + (to[0] - from[0]) * frac,
    from[1] + (to[1] - from[1]) * frac,
    from[2] + (to[2] - from[2]) * frac,
  ]);
}

export interface UnitStyle {
  value: number | null;
  height: number;
  color: string;
}

export interface ModeScale {
  min: number | null;
  max: number | null;
  label: string;
  format: (value: number) => string;
  palette: string[];
}

export interface ModeStyles {
  styles: Record<string, UnitStyle>;
  scale: ModeScale;
}

/** Menghitung tinggi dan warna tiap kelurahan untuk satu mode analisis. */
export function buildModeStyles(
  units: KelurahanUnit[],
  mode: AnalysisModeId,
  weights: CapacityWeights,
): ModeStyles {
  const meta = MODE_META[mode];
  const palette = PALETTES[meta.palette];
  const values = units.map((unit) => getModeValue(mode, unit, weights));
  const present = values.filter((v): v is number => v !== null);
  const min = present.length > 0 ? Math.min(...present) : null;
  const max = present.length > 0 ? Math.max(...present) : null;

  const styles: Record<string, UnitStyle> = {};
  units.forEach((unit, index) => {
    const value = values[index] ?? null;
    if (value === null || min === null || max === null) {
      styles[unit.id] = { value: null, height: MIN_HEIGHT_KM, color: NO_DATA_COLOR };
      return;
    }
    const t = max === min ? 0.5 : (value - min) / (max - min);
    const colorT = meta.higherIsBetter ? t : 1 - t;
    styles[unit.id] = {
      value,
      height: MIN_HEIGHT_KM + t * (MAX_HEIGHT_KM - MIN_HEIGHT_KM),
      color: sampleRamp(palette, colorT),
    };
  });

  return {
    styles,
    scale: { min, max, label: meta.label, format: meta.format, palette },
  };
}

export type EquityCategory = "Tinggi" | "Sedang" | "Rendah";

/** Kategori pemerataan dibagi tertil berdasarkan indeks kapasitas antarkelurahan. */
export function equityCategories(
  units: KelurahanUnit[],
  weights: CapacityWeights,
): Record<string, EquityCategory | null> {
  const ranked = units
    .map((unit) => ({ id: unit.id, value: capacityIndex(unit, weights) }))
    .filter((r): r is { id: string; value: number } => r.value !== null)
    .sort((a, b) => b.value - a.value);

  const result: Record<string, EquityCategory | null> = {};
  for (const unit of units) result[unit.id] = null;

  const n = ranked.length;
  ranked.forEach((item, index) => {
    if (index < n / 3) result[item.id] = "Tinggi";
    else if (index < (2 * n) / 3) result[item.id] = "Sedang";
    else result[item.id] = "Rendah";
  });
  return result;
}
