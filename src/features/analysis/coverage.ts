import type { HealthcareFacility } from "@/types";
import type { KelurahanUnit } from "@/features/analysis/units";
import { pointInPolygons } from "@/utils/geometry";
import { lonLatToScene, type ScenePoint } from "@/utils/projection";

/** Radius buffer simulasi; bukan standar resmi jangkauan pelayanan kesehatan. */
export const COVERAGE_RADIUS_KM = { puskesmas: 1, hospital: 3 } as const;
export const GRID_STEP_KM = 0.1;

export interface CoverageSite {
  tipe: "puskesmas" | "hospital";
  point: ScenePoint;
  radius: number;
}

export interface CoverageResult {
  sites: CoverageSite[];
  /** Cakupan gabungan (RS 3 km + puskesmas 1 km), persen luas kelurahan. */
  byUnit: Record<string, number | null>;
  /** Cakupan hanya buffer puskesmas 1 km, persen luas kelurahan. */
  puskesmasByUnit: Record<string, number | null>;
  /** Sel di luar seluruh buffer gabungan. Kosong jika RS 3 km menutupi kota. */
  uncovered: ScenePoint[];
  /** Sel di luar buffer puskesmas 1 km; inilah celah akses dasar yang divisualisasikan. */
  uncoveredPuskesmas: ScenePoint[];
  step: number;
  coveredPercent: number;
  puskesmasCoveredPercent: number;
}

/**
 * Menguji cakupan dengan grid sampel 100 m di dalam setiap poligon kelurahan.
 * Sel dihitung terhadap buffer puskesmas (1 km) dan RS (3 km) dari titik OSM.
 */
export function computeCoverage(
  units: KelurahanUnit[],
  facilities: HealthcareFacility[],
  step = GRID_STEP_KM,
): CoverageResult {
  const sites: CoverageSite[] = [];
  for (const facility of facilities) {
    if (facility.tipe === "puskesmas") {
      sites.push({
        tipe: "puskesmas",
        point: lonLatToScene(facility.longitude, facility.latitude),
        radius: COVERAGE_RADIUS_KM.puskesmas,
      });
    } else if (facility.tipe === "hospital") {
      sites.push({
        tipe: "hospital",
        point: lonLatToScene(facility.longitude, facility.latitude),
        radius: COVERAGE_RADIUS_KM.hospital,
      });
    }
  }

  const inRadius = (site: CoverageSite, x: number, z: number) =>
    Math.hypot(site.point.x - x, site.point.z - z) <= site.radius;
  const isCovered = (x: number, z: number): boolean => sites.some((site) => inRadius(site, x, z));
  const isPuskesmasCovered = (x: number, z: number): boolean =>
    sites.some((site) => site.tipe === "puskesmas" && inRadius(site, x, z));

  const byUnit: Record<string, number | null> = {};
  const puskesmasByUnit: Record<string, number | null> = {};
  const uncovered: ScenePoint[] = [];
  const uncoveredPuskesmas: ScenePoint[] = [];
  let totalCells = 0;
  let coveredCells = 0;
  let puskesmasCoveredCells = 0;

  for (const unit of units) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const rings of unit.polygons) {
      for (const p of rings[0] ?? []) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minZ = Math.min(minZ, p.z);
        maxZ = Math.max(maxZ, p.z);
      }
    }

    // Indeks sel global agar setiap sel hanya dihitung sekali walau batas wilayah berdekatan.
    let total = 0;
    let covered = 0;
    let puskesmasCovered = 0;
    for (let i = Math.floor(minX / step); i <= Math.floor(maxX / step); i += 1) {
      for (let j = Math.floor(minZ / step); j <= Math.floor(maxZ / step); j += 1) {
        const cx = (i + 0.5) * step;
        const cz = (j + 0.5) * step;
        if (!pointInPolygons(cx, cz, unit.polygons)) continue;
        total += 1;
        if (isCovered(cx, cz)) {
          covered += 1;
        } else {
          uncovered.push({ x: cx, z: cz });
        }
        if (isPuskesmasCovered(cx, cz)) {
          puskesmasCovered += 1;
        } else {
          uncoveredPuskesmas.push({ x: cx, z: cz });
        }
      }
    }

    byUnit[unit.id] = total > 0 ? (covered / total) * 100 : null;
    puskesmasByUnit[unit.id] = total > 0 ? (puskesmasCovered / total) * 100 : null;
    totalCells += total;
    coveredCells += covered;
    puskesmasCoveredCells += puskesmasCovered;
  }

  return {
    sites,
    byUnit,
    puskesmasByUnit,
    uncovered,
    uncoveredPuskesmas,
    step,
    coveredPercent: totalCells > 0 ? (coveredCells / totalCells) * 100 : 0,
    puskesmasCoveredPercent: totalCells > 0 ? (puskesmasCoveredCells / totalCells) * 100 : 0,
  };
}
