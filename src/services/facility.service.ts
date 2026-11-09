import type { FacilityType, HealthcareFacility } from "@/types";
import { dataUrl } from "@/services/geojson.service";

const KATEGORI_TO_TIPE: Record<string, FacilityType> = {
  rumah_sakit: "hospital",
  puskesmas: "puskesmas",
  klinik: "clinic",
  apotek: "pharmacy",
};

export interface FacilityDataset {
  facilities: HealthcareFacility[];
  sourceTimestamp: string;
  attribution: string;
  skipped: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/** Mengubah GeoJSON hasil klasifikasi HealthMap menjadi daftar fasilitas bertipe. */
export function parseFacilityCollection(raw: unknown): FacilityDataset {
  if (!isRecord(raw) || !Array.isArray(raw.features)) {
    throw new Error("Format GeoJSON fasilitas tidak valid");
  }

  const facilities: HealthcareFacility[] = [];
  let skipped = 0;

  raw.features.forEach((feature: unknown, index: number) => {
    if (!isRecord(feature) || !isRecord(feature.geometry) || !isRecord(feature.properties)) {
      skipped += 1;
      return;
    }

    const { geometry, properties } = feature;
    if (geometry.type !== "Point" || !Array.isArray(geometry.coordinates)) {
      skipped += 1;
      return;
    }

    const [lon, lat] = geometry.coordinates as unknown[];
    if (typeof lon !== "number" || typeof lat !== "number") {
      skipped += 1;
      return;
    }

    const kategori = asString(properties.kategori_healthmap);
    const tipe = KATEGORI_TO_TIPE[kategori];
    if (!tipe) {
      skipped += 1;
      return;
    }

    const osmRef = asString(properties["@id"]);
    facilities.push({
      id: `${osmRef || "fac"}-${index}`,
      nama: asString(properties.name, "Tanpa nama"),
      tipe,
      alamat: "",
      kelurahan: "",
      kecamatan: "",
      latitude: lat,
      longitude: lon,
      kategoriAsli: kategori,
      keyakinan: asString(properties.keyakinan_klasifikasi),
      statusVerifikasi: asString(properties.status_verifikasi),
      osmRef,
    });
  });

  return {
    facilities,
    sourceTimestamp: asString(raw.source_timestamp),
    attribution: asString(raw.attribution),
    skipped,
  };
}

export async function loadFacilities(signal?: AbortSignal): Promise<FacilityDataset> {
  const response = await fetch(dataUrl("healthmap-fasilitas-utama.geojson"), { signal });
  if (!response.ok) {
    throw new Error(`Gagal memuat data fasilitas (HTTP ${response.status})`);
  }
  const raw: unknown = await response.json();
  return parseFacilityCollection(raw);
}
