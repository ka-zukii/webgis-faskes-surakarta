import { formatCoord, formatCount } from "@/utils/format";

interface BottomBarProps {
  lon: number | null;
  lat: number | null;
  zoom: number | null;
  modeLabel: string;
  visibleCount: number;
  totalCount: number;
  unitCount: number;
  renderReady: boolean;
  hoveredName: string | null;
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-muted">{label}</span>
      <span className="font-medium tabular-nums text-ink">{value}</span>
    </div>
  );
}

export default function BottomBar({
  lon,
  lat,
  zoom,
  modeLabel,
  visibleCount,
  totalCount,
  unitCount,
  renderReady,
  hoveredName,
}: BottomBarProps) {
  return (
    <footer className="glass relative z-30 hidden h-9 shrink-0 items-center gap-5 overflow-x-auto border-x-0 border-b-0 px-4 text-[11px] scroll-thin md:flex">
      <Item label="Kamera" value={lon !== null && lat !== null ? `${formatCoord(lat)}, ${formatCoord(lon)}` : "-"} />
      <Item label="Zoom" value={zoom !== null ? `~${zoom}` : "-"} />
      <Item label="Mode" value={modeLabel} />
      <Item label="Objek" value={`${formatCount(visibleCount)} / ${formatCount(totalCount)}`} />
      <Item label="Wilayah" value={`${formatCount(unitCount)} kelurahan`} />
      <Item label="Hover" value={hoveredName ?? "-"} />
      <span className="ml-auto flex items-center gap-1.5 whitespace-nowrap text-muted">
        <span className={`h-1.5 w-1.5 rounded-full ${renderReady ? "bg-success" : "bg-warning animate-pulse"}`} />
        {renderReady ? "Three.js aktif" : "Menginisialisasi render…"}
      </span>
    </footer>
  );
}
