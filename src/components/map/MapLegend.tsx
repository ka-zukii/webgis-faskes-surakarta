import type { ModeScale } from "@/features/analysis/metrics";
import { sampleRamp } from "@/features/analysis/metrics";

interface MapLegendProps {
  scale: ModeScale;
}

export default function MapLegend({ scale }: MapLegendProps) {
  if (scale.min === null || scale.max === null) return null;
  const gradient = [0, 0.5, 1].map((t) => sampleRamp(scale.palette, t));
  return (
    <div className="glass pointer-events-none absolute bottom-3 left-3 z-10 w-64 rounded-xl px-3 py-2.5">
      <p className="text-[11px] font-medium text-ink">{scale.label}</p>
      <div
        className="mt-2 h-2 rounded-full"
        style={{ background: `linear-gradient(90deg, ${gradient.join(", ")})` }}
      />
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted">
        <span>{scale.format(scale.min)}</span>
        <span>{scale.format(scale.max)}</span>
      </div>
    </div>
  );
}
