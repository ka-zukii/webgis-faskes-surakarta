import type { Selection } from "@/types";
import type { KecamatanShape, KelurahanUnit } from "@/features/analysis/units";
import {
  capacityIndex,
  type CapacityWeights,
} from "@/features/analysis/metrics";
import { buildEquityReport } from "@/features/analysis/equity-report";
import type { EquityConfig } from "@/features/analysis/equity-config";
import { citySummary } from "@/features/analysis/stats";
import { formatCount, formatDecimal } from "@/utils/format";

export interface StoryFact {
  label: string;
  value: string;
}

export interface StoryStep {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  facts: StoryFact[];
  /** Objek yang diterbangi kamera. null berarti kembali ke tampilan kota. */
  target: Selection | null;
  caveat?: string;
}

interface StoryInput {
  units: KelurahanUnit[];
  kecamatan: KecamatanShape[];
  weights: CapacityWeights;
  config: EquityConfig;
}

const dash = (value: number | null, digits = 3) =>
  value === null ? "-" : formatDecimal(value, digits);

/**
 * Menyusun langkah presentasi dari data yang sama dengan panel pemerataan.
 * Tidak ada angka yang dikarang: setiap nilai berasal dari perhitungan.
 */
export function buildStorySteps({
  units,
  weights,
  config,
}: StoryInput): StoryStep[] {
  if (units.length === 0) return [];

  const report = buildEquityReport(units, weights, config);
  const summary = citySummary(units, weights);
  const steps: StoryStep[] = [];

  // 1. Pembuka: gambaran kota.
  steps.push({
    id: "kota",
    eyebrow: "Pembuka",
    title: "Layanan kesehatan Kota Surakarta",
    body: `Kota ini terdiri dari ${formatCount(summary.kelurahan)} kelurahan dengan ${formatCount(summary.penduduk)} penduduk (2024) dan ${formatCount(summary.total)} fasilitas kesehatan yang tercatat.`,
    facts: [
      { label: "Rumah sakit", value: formatCount(summary.rs) },
      { label: "Puskesmas", value: formatCount(summary.puskesmas) },
      { label: "Klinik", value: formatCount(summary.klinik) },
      { label: "Apotek", value: formatCount(summary.apotek) },
    ],
    target: null,
    caveat:
      "Jumlah Puskesmas dan klinik berasal dari OpenStreetMap dan perlu diverifikasi.",
  });

  // 2. Ketimpangan antar kelurahan.
  const { capacity } = report;
  steps.push({
    id: "ketimpangan",
    eyebrow: "Pemerataan",
    title: "Seberapa merata kapasitas layanan?",
    body:
      capacity.gini === null
        ? "Data belum cukup untuk menghitung ketimpangan."
        : `Indeks Gini kapasitas antar kelurahan adalah ${dash(capacity.gini)}, termasuk kelas ${report.giniLabel.toLowerCase()}. Nilai 0 berarti merata sempurna, dan makin mendekati 1 makin timpang.`,
    facts: [
      { label: "Gini", value: dash(capacity.gini) },
      { label: "Theil", value: dash(capacity.theil) },
      {
        label: "Maks / min",
        value:
          capacity.maxMinRatio === null
            ? "-"
            : `${formatDecimal(capacity.maxMinRatio, 1)}×`,
      },
      { label: "Kelurahan dinilai", value: formatCount(capacity.n) },
    ],
    target: null,
  });

  // 3. Satu langkah per kecamatan, dari beban Puskesmas tertinggi.
  const ratioStandard = config.rujukanStandar.find(
    (s) => s.method === "rasio_kecamatan",
  );
  const standard = ratioStandard?.value ?? null;
  const rows = report.kecamatan
    .filter((k) => k.penduduk > 0)
    .sort(
      (a, b) =>
        (b.pendudukPerPuskesmas ?? Number.MAX_SAFE_INTEGER) -
        (a.pendudukPerPuskesmas ?? Number.MAX_SAFE_INTEGER),
    );

  rows.forEach((k, i) => {
    const per = k.pendudukPerPuskesmas;
    const rounded = per === null ? null : Math.round(per);
    let body: string;
    let status: string;
    if (per === null) {
      body = `${k.nama} belum memiliki Puskesmas menurut data OpenStreetMap, sehingga rasio tidak bisa dihitung.`;
      status = "Tanpa Puskesmas";
    } else if (standard === null) {
      body = `Setiap Puskesmas di ${k.nama} melayani sekitar ${formatCount(rounded!)} penduduk.`;
      status = "Tanpa ambang";
    } else if (per <= standard) {
      body = `Setiap Puskesmas melayani sekitar ${formatCount(rounded!)} penduduk, masih di bawah ambang ${formatCount(standard)} menurut Permenkes 19/2024 Pasal 10 ayat (3).`;
      status = "Memenuhi";
    } else {
      body = `Setiap Puskesmas melayani sekitar ${formatCount(rounded!)} penduduk, melewati ambang ${formatCount(standard)} menurut Permenkes 19/2024 Pasal 10 ayat (3).`;
      status = "Melewati ambang";
    }
    steps.push({
      id: `kecamatan-${k.nama}`,
      eyebrow: `Kecamatan ${i + 1} dari ${rows.length}`,
      title: k.nama,
      body,
      facts: [
        { label: "Penduduk (2024)", value: formatCount(k.penduduk) },
        { label: "Puskesmas", value: formatCount(k.puskesmas) },
        {
          label: "Per Puskesmas",
          value: rounded === null ? "-" : formatCount(rounded),
        },
        { label: "Status", value: status },
      ],
      target: { kind: "kecamatan", id: k.nama },
      caveat:
        "Jumlah Puskesmas dari OpenStreetMap, perlu diverifikasi dengan daftar resmi.",
    });
  });

  // 4. Kelurahan dengan indeks kapasitas terendah.
  const ranked = units
    .map((u) => ({ unit: u, value: capacityIndex(u, weights) }))
    .filter(
      (r): r is { unit: KelurahanUnit; value: number } => r.value !== null,
    )
    .sort((a, b) => a.value - b.value);
  const lowest = ranked[0];
  if (lowest) {
    const u = lowest.unit;
    const nearest = u.nearestKm.puskesmas;
    steps.push({
      id: `kelurahan-${u.id}`,
      eyebrow: "Prioritas",
      title: `${u.nama}, ${u.kecamatan}`,
      body: `Kelurahan ini memiliki indeks kapasitas ${formatDecimal(lowest.value, 1)}, terendah dari ${formatCount(ranked.length)} kelurahan yang memiliki data penduduk.`,
      facts: [
        { label: "Indeks kapasitas", value: formatDecimal(lowest.value, 1) },
        { label: "Penduduk (2024)", value: formatCount(u.penduduk) },
        {
          label: "Fasilitas di wilayah",
          value: formatCount(u.rs + u.puskesmas + u.klinik + u.apotek),
        },
        {
          label: "Puskesmas terdekat",
          value: nearest === null ? "-" : `${formatDecimal(nearest, 2)} km`,
        },
      ],
      target: { kind: "kelurahan", id: u.id },
      caveat:
        "Jarak dihitung garis lurus dari pusat wilayah, bukan waktu tempuh.",
    });
  }

  // 5. Penutup.
  const failing = rows.filter(
    (k) =>
      k.pendudukPerPuskesmas !== null &&
      standard !== null &&
      k.pendudukPerPuskesmas > standard,
  ).length;
  steps.push({
    id: "penutup",
    eyebrow: "Penutup",
    title: "Catatan metodologi",
    body: `${formatCount(failing)} dari ${formatCount(rows.length)} kecamatan melewati ambang rasio Puskesmas. Hasil ini bergantung pada data OpenStreetMap, BPS 2024, dan ambang Permenkes 19/2024, sehingga sebaiknya dipakai sebagai bahan diskusi.`,
    facts: [
      { label: "Penduduk", value: "BPS 2024" },
      { label: "Fasilitas", value: "OpenStreetMap" },
      { label: "Ambang", value: "Permenkes 19/2024" },
    ],
    target: null,
  });

  return steps;
}
