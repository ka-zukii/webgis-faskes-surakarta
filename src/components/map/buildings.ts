import * as THREE from "three";
import type { ScenePolygons } from "@/utils/geometry";

function toShapePoints(ring: { x: number; z: number }[]): THREE.Vector2[] {
  // Shape berada di bidang XY; y shape = -z scene. Setelah rotateX(-π/2), bidang kembali ke XZ.
  return ring.map((p) => new THREE.Vector2(p.x, -p.z));
}

function toShape(rings: ScenePolygons[number]): THREE.Shape | null {
  const [outer, ...holes] = rings;
  if (!outer || outer.length < 3) return null;
  const shape = new THREE.Shape(toShapePoints(outer));
  shape.holes = holes.filter((h) => h.length >= 3).map((h) => new THREE.Path(toShapePoints(h)));
  return shape;
}

/**
 * Ekstrusi tinggi 1 satuan (alas y=0, atap y=1). Tinggi sebenarnya diterapkan lewat
 * scale.y pada group, sehingga perubahan tinggi tidak membangun ulang geometri.
 */
export function buildExtrudedGeometries(polygons: ScenePolygons): THREE.ExtrudeGeometry[] {
  const result: THREE.ExtrudeGeometry[] = [];
  for (const rings of polygons) {
    const shape = toShape(rings);
    if (!shape) continue;
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
    geometry.rotateX(-Math.PI / 2);
    result.push(geometry);
  }
  return result;
}

/** Datar (bidang XZ) untuk area kecamatan. */
export function buildFlatGeometries(polygons: ScenePolygons): THREE.ShapeGeometry[] {
  const result: THREE.ShapeGeometry[] = [];
  for (const rings of polygons) {
    const shape = toShape(rings);
    if (!shape) continue;
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);
    result.push(geometry);
  }
  return result;
}

/** Garis batas setiap ring (luar dan lubang) pada ketinggian y tertentu. */
export function buildRingOutlines(polygons: ScenePolygons, y: number): THREE.BufferGeometry[] {
  const lines: THREE.BufferGeometry[] = [];
  for (const rings of polygons) {
    for (const ring of rings) {
      if (ring.length < 3) continue;
      const points = ring.map((p) => new THREE.Vector3(p.x, y, p.z));
      lines.push(new THREE.BufferGeometry().setFromPoints(points));
    }
  }
  return lines;
}
