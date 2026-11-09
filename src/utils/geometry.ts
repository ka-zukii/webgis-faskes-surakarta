import { lonLatToScene, type ScenePoint } from "@/utils/projection";

/** Satu poligon: ring pertama = batas luar, ring berikutnya = lubang. */
export type LonLatRing = number[][];
export type LonLatPolygon = LonLatRing[];

export type ScenePolygon = ScenePoint[][];
export type ScenePolygons = ScenePolygon[];

function isPosition(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

function toRings(value: unknown): LonLatRing[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((ring: unknown) => (Array.isArray(ring) ? ring.filter(isPosition) : []))
    .filter((ring) => ring.length >= 3);
}

/** Mengambil poligon dari geometri GeoJSON Polygon atau MultiPolygon. */
export function polygonsFromGeometry(geometry: { type: string; coordinates: unknown }): LonLatPolygon[] {
  if (geometry.type === "Polygon") {
    const rings = toRings(geometry.coordinates);
    return rings.length > 0 ? [rings] : [];
  }
  if (geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates
      .map((polygon: unknown) => toRings(polygon))
      .filter((rings) => rings.length > 0);
  }
  return [];
}

export function projectPolygons(polygons: LonLatPolygon[]): ScenePolygons {
  return polygons.map((rings) =>
    rings.map((ring) => ring.map(([lon, lat]) => lonLatToScene(lon, lat))),
  );
}

/** Luas bertanda (shoelace) dalam km²; positif atau negatif tergantung arah ring. */
function signedArea(ring: ScenePoint[]): number {
  let sum = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    if (!a || !b) continue;
    sum += a.x * b.z - b.x * a.z;
  }
  return sum / 2;
}

export function polygonAreaKm2(polygons: ScenePolygons): number {
  let total = 0;
  for (const rings of polygons) {
    const outer = rings[0];
    if (!outer) continue;
    total += Math.abs(signedArea(outer));
    for (const hole of rings.slice(1)) total -= Math.abs(signedArea(hole));
  }
  return Math.max(total, 0);
}

function ringCentroid(ring: ScenePoint[]): { point: ScenePoint; area: number } {
  const area = signedArea(ring);
  if (Math.abs(area) < 1e-12) {
    const sum = ring.reduce((acc, p) => ({ x: acc.x + p.x, z: acc.z + p.z }), { x: 0, z: 0 });
    return { point: { x: sum.x / ring.length, z: sum.z / ring.length }, area: 0 };
  }
  let cx = 0;
  let cz = 0;
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    if (!a || !b) continue;
    const cross = a.x * b.z - b.x * a.z;
    cx += (a.x + b.x) * cross;
    cz += (a.z + b.z) * cross;
  }
  return { point: { x: cx / (6 * area), z: cz / (6 * area) }, area: Math.abs(area) };
}

/** Titik pusat berbobot luas dari batas luar seluruh poligon. */
export function polygonCentroid(polygons: ScenePolygons): ScenePoint {
  let weightedX = 0;
  let weightedZ = 0;
  let totalArea = 0;
  for (const rings of polygons) {
    const outer = rings[0];
    if (!outer) continue;
    const { point, area } = ringCentroid(outer);
    weightedX += point.x * area;
    weightedZ += point.z * area;
    totalArea += area;
  }
  if (totalArea === 0) return { x: 0, z: 0 };
  return { x: weightedX / totalArea, z: weightedZ / totalArea };
}

function pointInRing(x: number, z: number, ring: ScenePoint[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const a = ring[i];
    const b = ring[j];
    if (!a || !b) continue;
    const crosses = (a.z > z) !== (b.z > z);
    if (crosses && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

export function pointInPolygons(x: number, z: number, polygons: ScenePolygons): boolean {
  return polygons.some((rings) => {
    const outer = rings[0];
    if (!outer || !pointInRing(x, z, outer)) return false;
    return !rings.slice(1).some((hole) => pointInRing(x, z, hole));
  });
}
