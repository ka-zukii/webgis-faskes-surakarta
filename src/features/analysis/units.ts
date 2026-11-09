import type { BpsFacilityRow, PopulationRow } from "@/services/kelurahan-data.service";
import type { GeoJsonFeatureCollection } from "@/services/geojson.service";
import type { FacilityType, HealthcareFacility } from "@/types";
import { lonLatToScene, type ScenePoint } from "@/utils/projection";
import {
  pointInPolygons,
  polygonAreaKm2,
  polygonCentroid,
  polygonsFromGeometry,
  projectPolygons,
  type ScenePolygons,
} from "@/utils/geometry";
import { normalizeName, stripPrefix } from "@/utils/text";

export interface KelurahanUnit {
  /** Kunci unik (nama ternormalisasi). */
  id: string;
  nama: string;
  kecamatan: string;
  polygons: ScenePolygons;
  centroid: ScenePoint;
  areaKm2: number;
  hasPopulation: boolean;
  penduduk: number;
  /** RS umum + RS khusus, sumber BPS 2024. */
  rs: number;
  /** Sumber BPS 2024. */
  puskesmas: number;
  /** Titik OSM yang jatuh di dalam poligon kelurahan. */
  klinik: number;
  /** Titik OSM yang jatuh di dalam poligon kelurahan. */
  apotek: number;
  /** Jarak garis lurus dari pusat kelurahan ke titik OSM terdekat (km). */
  nearestKm: { rs: number | null; puskesmas: number | null; klinik: number | null };
}

export interface KecamatanShape {
  nama: string;
  polygons: ScenePolygons;
  centroid: ScenePoint;
}

export interface UnitBuildInput {
  boundaries: GeoJsonFeatureCollection;
  penduduk: PopulationRow[];
  bps: BpsFacilityRow[];
  facilities: HealthcareFacility[];
}

export interface UnitBuildResult {
  units: KelurahanUnit[];
  issues: string[];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function distanceKm(a: ScenePoint, b: ScenePoint): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function buildKelurahanUnits(input: UnitBuildInput): UnitBuildResult {
  const issues: string[] = [];
  const pendudukByKey = new Map(input.penduduk.map((row) => [normalizeName(row.kelurahan), row]));
  const bpsByKey = new Map(input.bps.map((row) => [normalizeName(row.kelurahan), row]));

  const facilityPoints = input.facilities.map((facility) => ({
    tipe: facility.tipe,
    point: lonLatToScene(facility.longitude, facility.latitude),
  }));

  const units: KelurahanUnit[] = [];
  let unassignedOsm = 0;

  for (const feature of input.boundaries.features) {
    const props = feature.properties ?? {};
    const nama = stripPrefix(asString(props.Kelurahan) || asString(props.name), "Kelurahan");
    const kecamatan = stripPrefix(asString(props.Kecamatan), "Kecamatan");
    if (!nama || !feature.geometry) {
      issues.push("Fitur batas tanpa nama atau geometri dilewati");
      continue;
    }

    const polygons = projectPolygons(polygonsFromGeometry(feature.geometry));
    if (polygons.length === 0) {
      issues.push(`Geometri kosong: ${nama}`);
      continue;
    }

    const key = normalizeName(nama);
    const penduduk = pendudukByKey.get(key);
    const bps = bpsByKey.get(key);
    if (!penduduk) issues.push(`Data penduduk tidak ditemukan: ${nama}`);
    if (!bps) issues.push(`Data fasilitas BPS tidak ditemukan: ${nama}`);

    const insideTypes: FacilityType[] = [];
    for (const { tipe, point } of facilityPoints) {
      if (pointInPolygons(point.x, point.z, polygons)) insideTypes.push(tipe);
    }
    const count = (tipe: FacilityType) => insideTypes.filter((t) => t === tipe).length;

    const centroid = polygonCentroid(polygons);
    const nearest = (tipe: FacilityType): number | null => {
      let best: number | null = null;
      for (const fp of facilityPoints) {
        if (fp.tipe !== tipe) continue;
        const d = distanceKm(centroid, fp.point);
        if (best === null || d < best) best = d;
      }
      return best;
    };

    units.push({
      id: key,
      nama,
      kecamatan,
      polygons,
      centroid,
      areaKm2: polygonAreaKm2(polygons),
      hasPopulation: Boolean(penduduk),
      penduduk: penduduk?.penduduk ?? 0,
      rs: bps ? bps.rsUmum + bps.rsKhusus : 0,
      puskesmas: bps?.puskesmas ?? 0,
      klinik: count("clinic"),
      apotek: count("pharmacy"),
      nearestKm: {
        rs: nearest("hospital"),
        puskesmas: nearest("puskesmas"),
        klinik: nearest("clinic"),
      },
    });
  }

  for (const fp of facilityPoints) {
    if (!units.some((unit) => pointInPolygons(fp.point.x, fp.point.z, unit.polygons))) {
      unassignedOsm += 1;
    }
  }
  if (unassignedOsm > 0) {
    issues.push(`${unassignedOsm} titik OSM berada di luar poligon kelurahan`);
  }

  return { units, issues };
}

export function buildKecamatanShapes(boundaries: GeoJsonFeatureCollection): KecamatanShape[] {
  const shapes: KecamatanShape[] = [];
  for (const feature of boundaries.features) {
    if (!feature.geometry) continue;
    const nama = stripPrefix(asString(feature.properties?.Kecamatan) || asString(feature.properties?.name), "Kecamatan");
    const polygons = projectPolygons(polygonsFromGeometry(feature.geometry));
    if (nama && polygons.length > 0) shapes.push({ nama, polygons, centroid: polygonCentroid(polygons) });
  }
  return shapes;
}
