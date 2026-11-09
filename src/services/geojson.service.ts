export interface GeoJsonFeature {
  type: "Feature";
  properties: Record<string, unknown> | null;
  geometry: { type: string; coordinates: unknown } | null;
}

export interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

export type OptionalDataResult =
  | { state: "available"; data: GeoJsonFeatureCollection }
  | { state: "missing" }
  | { state: "error"; message: string };

export function dataUrl(fileName: string): string {
  return `${import.meta.env.BASE_URL}data/${fileName}`;
}

function isFeatureCollection(value: unknown): value is GeoJsonFeatureCollection {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { type?: unknown }).type === "FeatureCollection" &&
    Array.isArray((value as { features?: unknown }).features)
  );
}

/**
 * Memuat berkas GeoJSON opsional dari /public/data.
 * Berkas yang belum ada dilaporkan sebagai "missing" (bukan error), sehingga UI
 * dapat menjelaskan kondisi data tanpa membuat poligon tiruan.
 */
export async function loadOptionalGeoJson(
  fileName: string,
  signal?: AbortSignal,
): Promise<OptionalDataResult> {
  try {
    const response = await fetch(dataUrl(fileName), { signal, cache: "no-cache" });
    if (!response.ok) return { state: "missing" };

    // Server dev Vite mengembalikan index.html untuk path yang tidak ada, jadi isi diperiksa langsung
    // (bukan header Content-Type, yang bisa berbeda antar server untuk .geojson).
    const text = await response.text();
    if (text.trimStart().startsWith("<")) return { state: "missing" };

    const payload: unknown = JSON.parse(text);
    if (!isFeatureCollection(payload)) {
      return { state: "error", message: "Berkas bukan FeatureCollection GeoJSON" };
    }
    return { state: "available", data: payload };
  } catch (error) {
    if (signal?.aborted) return { state: "missing" };
    return {
      state: "error",
      message: error instanceof Error ? error.message : "Gagal memuat berkas",
    };
  }
}
