/**
 * Indikator ketimpangan (pemerataan) antar unit analisis.
 * Modul ini murni: tidak bergantung pada React, Three.js, atau berkas data.
 * Input berupa daftar nilai per kelurahan (misalnya indeks kapasitas).
 */

export interface EquityMetrics {
  /** Jumlah unit yang dipakai (nilai null dan non-finit dibuang). */
  n: number;
  mean: number;
  min: number;
  max: number;
  /** Gini 0 (merata) sampai 1 (timpang). */
  gini: number | null;
  /** Theil T; 0 merata, makin besar makin timpang. Nilai 0 diabaikan sesuai definisi. */
  theil: number | null;
  /** Koefisien variasi = simpangan baku populasi / rata-rata. */
  coefficientOfVariation: number | null;
  /** Rasio nilai maksimum terhadap minimum positif; null jika tidak terdefinisi. */
  maxMinRatio: number | null;
}

export interface LorenzPoint {
  /** Proporsi kumulatif unit (0 sampai 1), unit diurutkan dari nilai terkecil. */
  popShare: number;
  /** Proporsi kumulatif nilai (0 sampai 1). */
  valueShare: number;
}

export function cleanValues(
  values: ReadonlyArray<number | null | undefined>,
): number[] {
  return values.filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0,
  );
}

/**
 * Gini dengan rumus selisih berurutan:
 * G = (2 * Σ i·x_i) / (n * Σ x_i) − (n + 1) / n, dengan x terurut naik dan i mulai dari 1.
 * Mengembalikan null jika tidak ada unit atau total nilai nol.
 */
export function giniCoefficient(values: ReadonlyArray<number>): number | null {
  const xs = [...values].sort((a, b) => a - b);
  const n = xs.length;
  if (n === 0) return null;
  const total = xs.reduce((sum, x) => sum + x, 0);
  if (total === 0) return 0;
  let weighted = 0;
  for (let i = 0; i < n; i++) weighted += (i + 1) * xs[i];
  return (2 * weighted) / (n * total) - (n + 1) / n;
}

/** Indeks Theil T. Unit bernilai 0 tidak ikut dijumlahkan karena 0·ln(0) = 0 secara konvensi. */
export function theilIndex(values: ReadonlyArray<number>): number | null {
  const n = values.length;
  if (n === 0) return null;
  const mu = values.reduce((sum, x) => sum + x, 0) / n;
  if (mu === 0) return 0;
  let acc = 0;
  for (const x of values) {
    if (x <= 0) continue;
    const r = x / mu;
    acc += r * Math.log(r);
  }
  return acc / n;
}

export function coefficientOfVariation(
  values: ReadonlyArray<number>,
): number | null {
  const n = values.length;
  if (n === 0) return null;
  const mu = values.reduce((sum, x) => sum + x, 0) / n;
  if (mu === 0) return null;
  const variance = values.reduce((sum, x) => sum + (x - mu) ** 2, 0) / n;
  return Math.sqrt(variance) / mu;
}

export function maxMinRatio(values: ReadonlyArray<number>): number | null {
  const positive = values.filter((x) => x > 0);
  if (positive.length === 0) return null;
  return Math.max(...values) / Math.min(...positive);
}

export function computeEquity(
  values: ReadonlyArray<number | null | undefined>,
): EquityMetrics {
  const xs = cleanValues(values);
  const n = xs.length;
  if (n === 0) {
    return {
      n: 0,
      mean: NaN,
      min: NaN,
      max: NaN,
      gini: null,
      theil: null,
      coefficientOfVariation: null,
      maxMinRatio: null,
    };
  }
  const mean = xs.reduce((sum, x) => sum + x, 0) / n;
  return {
    n,
    mean,
    min: Math.min(...xs),
    max: Math.max(...xs),
    gini: giniCoefficient(xs),
    theil: theilIndex(xs),
    coefficientOfVariation: coefficientOfVariation(xs),
    maxMinRatio: maxMinRatio(xs),
  };
}

/**
 * Titik kurva Lorenz. Unit diurutkan dari nilai terkecil; garis diagonal berarti merata.
 * Titik awal (0, 0) disertakan untuk memudahkan penggambaran.
 */
export function lorenzCurve(
  values: ReadonlyArray<number | null | undefined>,
): LorenzPoint[] {
  const xs = cleanValues(values).sort((a, b) => a - b);
  const n = xs.length;
  if (n === 0) return [];
  const total = xs.reduce((sum, x) => sum + x, 0);
  const points: LorenzPoint[] = [{ popShare: 0, valueShare: 0 }];
  let cum = 0;
  for (let i = 0; i < n; i++) {
    cum += xs[i];
    points.push({
      popShare: (i + 1) / n,
      valueShare: total === 0 ? (i + 1) / n : cum / total,
    });
  }
  return points;
}
