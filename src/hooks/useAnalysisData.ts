import { useEffect, useMemo, useState } from "react";
import {
  loadOptionalGeoJson,
  type GeoJsonFeatureCollection,
} from "@/services/geojson.service";
import {
  loadKelurahanTables,
  type KelurahanTables,
} from "@/services/kelurahan-data.service";
import {
  buildKecamatanShapes,
  buildKelurahanUnits,
  type KecamatanShape,
  type KelurahanUnit,
} from "@/features/analysis/units";
import type { HealthcareFacility } from "@/types";

export type AnalysisStatus = "loading" | "ready" | "missing" | "error";

export interface AnalysisData {
  status: AnalysisStatus;
  units: KelurahanUnit[];
  kecamatan: KecamatanShape[];
  populationReady: boolean;
  issues: string[];
  error: string | null;
}

type OptionalState =
  | { state: "available"; data: GeoJsonFeatureCollection }
  | { state: "missing" }
  | { state: "error"; message: string };

interface RawState {
  kelurahan: OptionalState;
  kecamatan: OptionalState;
  tables: { ok: true; data: KelurahanTables } | { ok: false; message: string };
}

const EMPTY: AnalysisData = {
  status: "loading",
  units: [],
  kecamatan: [],
  populationReady: false,
  issues: [],
  error: null,
};

/** Memuat batas wilayah dan tabel penduduk, lalu menggabungkannya dengan titik fasilitas OSM. */
export function useAnalysisData(
  facilities: HealthcareFacility[],
  facilitiesReady: boolean,
): AnalysisData {
  const [raw, setRaw] = useState<RawState | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const tables = loadKelurahanTables(controller.signal).then(
      (data): RawState["tables"] => ({ ok: true, data }),
      (error: unknown): RawState["tables"] => ({
        ok: false,
        message:
          error instanceof Error ? error.message : "Gagal memuat tabel wilayah",
      }),
    );

    Promise.all([
      loadOptionalGeoJson("kelurahan.geojson", controller.signal),
      loadOptionalGeoJson("kecamatan.geojson", controller.signal),
      tables,
    ]).then(([kelurahan, kecamatan, tableResult]) => {
      if (!controller.signal.aborted)
        setRaw({ kelurahan, kecamatan, tables: tableResult });
    });

    return () => controller.abort();
  }, []);

  return useMemo<AnalysisData>(() => {
    if (!raw) return EMPTY;
    if (raw.kelurahan.state === "error") {
      return { ...EMPTY, status: "error", error: raw.kelurahan.message };
    }
    if (raw.kelurahan.state === "missing") {
      return { ...EMPTY, status: "missing" };
    }
    if (!facilitiesReady) return EMPTY;

    const tables = raw.tables.ok ? raw.tables.data : null;
    const { units, issues } = buildKelurahanUnits({
      boundaries: raw.kelurahan.data,
      penduduk: tables?.penduduk ?? [],
      facilities,
    });
    const kecamatan =
      raw.kecamatan.state === "available"
        ? buildKecamatanShapes(raw.kecamatan.data)
        : [];
    const allIssues = raw.tables.ok ? issues : [raw.tables.message, ...issues];

    return {
      status: "ready",
      units,
      kecamatan,
      populationReady:
        tables !== null && units.some((unit) => unit.hasPopulation),
      issues: allIssues,
      error: null,
    };
  }, [raw, facilities, facilitiesReady]);
}
