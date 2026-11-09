import type { KelurahanUnit } from "@/features/analysis/units";
import { capacityIndex, capacityScore, totalFacilities, type CapacityWeights } from "@/features/analysis/metrics";

export interface KecamatanStat {
  nama: string;
  kelurahan: number;
  penduduk: number;
  areaKm2: number;
  rs: number;
  puskesmas: number;
  klinik: number;
  apotek: number;
  total: number;
  capacityIndex: number | null;
}

export interface UnitRank {
  nama: string;
  kecamatan: string;
  value: number;
}

export interface CitySummary {
  kelurahan: number;
  penduduk: number;
  rs: number;
  puskesmas: number;
  klinik: number;
  apotek: number;
  total: number;
  highest: UnitRank | null;
  lowest: UnitRank | null;
}

/** Agregat per kecamatan. Indeks dihitung dari total kapasitas dibagi total penduduk. */
export function kecamatanStats(units: KelurahanUnit[], weights: CapacityWeights): KecamatanStat[] {
  const groups = new Map<string, KelurahanUnit[]>();
  for (const unit of units) {
    const list = groups.get(unit.kecamatan) ?? [];
    list.push(unit);
    groups.set(unit.kecamatan, list);
  }

  return [...groups.entries()]
    .map(([nama, members]) => {
      const penduduk = members.reduce((sum, u) => sum + u.penduduk, 0);
      const score = members.reduce((sum, u) => sum + capacityScore(u, weights), 0);
      const rs = members.reduce((sum, u) => sum + u.rs, 0);
      const puskesmas = members.reduce((sum, u) => sum + u.puskesmas, 0);
      const klinik = members.reduce((sum, u) => sum + u.klinik, 0);
      const apotek = members.reduce((sum, u) => sum + u.apotek, 0);
      return {
        nama,
        kelurahan: members.length,
        penduduk,
        areaKm2: members.reduce((sum, u) => sum + u.areaKm2, 0),
        rs,
        puskesmas,
        klinik,
        apotek,
        total: rs + puskesmas + klinik + apotek,
        capacityIndex: penduduk > 0 ? (score / penduduk) * 10000 : null,
      };
    })
    .sort((a, b) => a.nama.localeCompare(b.nama, "id"));
}

export function citySummary(units: KelurahanUnit[], weights: CapacityWeights): CitySummary {
  const ranked: UnitRank[] = [];
  for (const unit of units) {
    const value = capacityIndex(unit, weights);
    if (value !== null) ranked.push({ nama: unit.nama, kecamatan: unit.kecamatan, value });
  }
  ranked.sort((a, b) => b.value - a.value);

  return {
    kelurahan: units.length,
    penduduk: units.reduce((sum, u) => sum + u.penduduk, 0),
    rs: units.reduce((sum, u) => sum + u.rs, 0),
    puskesmas: units.reduce((sum, u) => sum + u.puskesmas, 0),
    klinik: units.reduce((sum, u) => sum + u.klinik, 0),
    apotek: units.reduce((sum, u) => sum + u.apotek, 0),
    total: units.reduce((sum, u) => sum + totalFacilities(u), 0),
    highest: ranked[0] ?? null,
    lowest: ranked[ranked.length - 1] ?? null,
  };
}
