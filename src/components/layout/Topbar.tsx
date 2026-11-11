import { useCallback, useEffect, useState } from "react";
import { BookOpen, MapPin, Maximize, Minimize, RotateCcw } from "lucide-react";
import type { LoadStatus } from "@/types";
import { formatDateId } from "@/utils/format";
import SearchBox, { type SearchItem } from "@/components/layout/SearchBox";
import GuideModal from "@/components/layout/GuideModal";

interface TopbarProps {
  facilityStatus: LoadStatus;
  facilityError: string | null;
  sourceTimestamp: string;
  boundaryAvailable: boolean;
  onReset: () => void;
  searchItems: SearchItem[];
  onSearchPick: (item: SearchItem) => void;
}

const STATUS_DOT: Record<LoadStatus, string> = {
  loading: "bg-warning animate-pulse",
  ready: "bg-success",
  error: "bg-danger",
};

export default function Topbar({
  facilityStatus,
  facilityError,
  sourceTimestamp,
  boundaryAvailable,
  onReset,
  searchItems,
  onSearchPick,
}: TopbarProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const closeGuide = useCallback(() => setGuideOpen(false), []);

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    } else {
      void document.documentElement.requestFullscreen().catch(() => undefined);
    }
  };

  const statusText =
    facilityStatus === "loading"
      ? "Memuat data fasilitas…"
      : facilityStatus === "error"
        ? facilityError ?? "Data gagal dimuat"
        : `Fasilitas OpenStreetMap · ${formatDateId(sourceTimestamp)}`;

  return (
    <>
    <header className="glass relative z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-x-0 border-t-0 px-4">
      <div className="flex min-w-0 items-center gap-3">
        <div
          aria-hidden
          className="grid h-8 w-8 place-items-center rounded-lg bg-linear-to-br from-accent to-accent-2 shadow-[0_0_18px_-2px_rgb(0_229_255/0.6)]"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-base" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="truncate text-[15px] font-semibold tracking-tight">HealthMap Solo</span>
          <span className="hidden rounded-md border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-widest text-accent sm:inline">
            3D WEBGIS
          </span>
        </div>
        <div className="ml-2 hidden items-center gap-1.5 text-sm text-muted md:flex">
          <MapPin size={14} />
          <span>Kota Surakarta</span>
        </div>
      </div>

      <div className="hidden min-w-0 flex-1 justify-center px-2 md:flex">
        <SearchBox items={searchItems} onPick={onSearchPick} />
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-3 rounded-lg border border-white/5 bg-panel-2/60 px-3 py-1.5 text-xs text-muted lg:flex">
          <span className="flex items-center gap-1.5" title={facilityError ?? undefined}>
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[facilityStatus]}`} />
            {statusText}
          </span>
          <span className="h-3 w-px bg-white/10" />
          <span className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${boundaryAvailable ? "bg-success" : "bg-warning"}`} />
            {boundaryAvailable ? "Batas wilayah tersedia" : "Batas wilayah belum ada"}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setGuideOpen(true)}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-panel-2/70 px-3 py-1.5 text-xs font-medium text-ink transition hover:border-accent/50 hover:text-accent"
        >
          <BookOpen size={14} />
          Panduan &amp; Metodologi
        </button>

        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-panel-2/70 px-3 py-1.5 text-xs font-medium text-ink transition hover:border-accent/50 hover:text-accent"
        >
          <RotateCcw size={14} />
          Reset kamera
        </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Keluar layar penuh" : "Layar penuh"}
          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-panel-2/70 text-ink transition hover:border-accent/50 hover:text-accent"
        >
          {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
        </button>
      </div>
    </header>
      <GuideModal open={guideOpen} onClose={closeGuide} />
    </>
  );
}
