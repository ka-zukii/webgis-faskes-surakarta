import { useEffect, useState } from "react";
import type { HealthcareFacility } from "@/types";
import { FACILITY_META } from "@/features/facilities/meta";

interface FacilityTooltipProps {
  facility: HealthcareFacility | null;
}

/** Jarak vertikal tooltip di atas kursor (px). */
const GAP_PX = 16;

/** Tooltip kecil yang mengikuti kursor dan muncul di atasnya saat marker fasilitas di-hover. */
export default function FacilityTooltip({ facility }: FacilityTooltipProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onMove = (event: PointerEvent) =>
      setPos({ x: event.clientX, y: event.clientY });
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  // Perangkat sentuh tidak punya hover; tooltip hanya mengganggu saat menggeser peta.
  const touchOnly = window.matchMedia("(pointer: coarse)").matches;
  if (!facility || !pos || touchOnly) return null;

  const meta = FACILITY_META[facility.tipe];
  const lokasi = [facility.kelurahan, facility.kecamatan]
    .filter(Boolean)
    .join(", ");

  return (
    <div
      className="glass pointer-events-none fixed z-50 max-w-60 rounded-lg border border-white/10 px-3 py-2 shadow-lg"
      style={{
        left: pos.x,
        top: pos.y - GAP_PX,
        transform: "translate(-50%, -100%)",
      }}
    >
      <div
        className="flex items-center gap-1.5 text-[11px] font-semibold"
        style={{ color: meta.color }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: meta.color }}
        />
        {meta.label}
      </div>
      <p className="mt-0.5 text-xs font-medium leading-snug text-ink">
        {facility.nama}
      </p>
      {lokasi && <p className="mt-0.5 text-[11px] text-muted">{lokasi}</p>}
    </div>
  );
}
