import { useEffect, useState } from "react";
import { loadFacilities } from "@/services/facility.service";
import type { HealthcareFacility, LoadStatus } from "@/types";

export interface FacilityState {
  status: LoadStatus;
  facilities: HealthcareFacility[];
  sourceTimestamp: string;
  skipped: number;
  error: string | null;
}

const INITIAL: FacilityState = {
  status: "loading",
  facilities: [],
  sourceTimestamp: "",
  skipped: 0,
  error: null,
};

export function useFacilities(): FacilityState {
  const [state, setState] = useState<FacilityState>(INITIAL);

  useEffect(() => {
    const controller = new AbortController();

    loadFacilities(controller.signal)
      .then((dataset) => {
        setState({
          status: "ready",
          facilities: dataset.facilities,
          sourceTimestamp: dataset.sourceTimestamp,
          skipped: dataset.skipped,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          ...INITIAL,
          status: "error",
          error: error instanceof Error ? error.message : "Gagal memuat data",
        });
      });

    return () => controller.abort();
  }, []);

  return state;
}
