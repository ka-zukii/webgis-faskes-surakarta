/**
 * Proyeksi ekuirektangular lokal berpusat di Kota Surakarta.
 * Satuan scene adalah kilometer: x ke timur, z ke selatan (utara = -z).
 * Akurat untuk area kota berskala ±10 km; untuk wilayah lebih luas gunakan proyeksi Mercator.
 */
export const SURAKARTA_CENTER = { lon: 110.8267, lat: -7.5666 } as const;

const KM_PER_DEG_LAT = 110.574;
const KM_PER_DEG_LON = 111.32 * Math.cos((SURAKARTA_CENTER.lat * Math.PI) / 180);

export interface ScenePoint {
  x: number;
  z: number;
}

export function lonLatToScene(lon: number, lat: number): ScenePoint {
  return {
    x: (lon - SURAKARTA_CENTER.lon) * KM_PER_DEG_LON,
    z: -(lat - SURAKARTA_CENTER.lat) * KM_PER_DEG_LAT,
  };
}

export function sceneToLonLat(x: number, z: number): { lon: number; lat: number } {
  return {
    lon: SURAKARTA_CENTER.lon + x / KM_PER_DEG_LON,
    lat: SURAKARTA_CENTER.lat - z / KM_PER_DEG_LAT,
  };
}
