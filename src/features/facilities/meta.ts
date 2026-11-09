import type { FacilityType, HealthcareFacility, VisibleTypes } from "@/types";

export const FACILITY_TYPES: readonly FacilityType[] = [
  "hospital",
  "puskesmas",
  "clinic",
  "pharmacy",
];

export interface FacilityMeta {
  label: string;
  color: string;
}

export const FACILITY_META: Record<FacilityType, FacilityMeta> = {
  hospital: { label: "Rumah Sakit", color: "#EF4444" },
  puskesmas: { label: "Puskesmas", color: "#00E5FF" },
  clinic: { label: "Klinik", color: "#7000FF" },
  pharmacy: { label: "Apotek", color: "#22C55E" },
};

export const ALL_VISIBLE: VisibleTypes = {
  hospital: true,
  puskesmas: true,
  clinic: true,
  pharmacy: true,
};

export function countByType(list: readonly HealthcareFacility[]): Record<FacilityType, number> {
  const counts: Record<FacilityType, number> = { hospital: 0, puskesmas: 0, clinic: 0, pharmacy: 0 };
  for (const facility of list) {
    counts[facility.tipe] += 1;
  }
  return counts;
}
