import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  MapPin,
  Maximize,
  Minimize,
  Presentation,
  RotateCcw,
} from "lucide-react";
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
  onStartStory: () => void;
}

export default function Topbar({
  facilityStatus,
  facilityError,
  sourceTimestamp,
  boundaryAvailable,
  onReset,
  searchItems,
  onSearchPick,
  onStartStory,
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
        ? (facilityError ?? "Data gagal dimuat")
        : `Fasilitas OpenStreetMap · ${formatDateId(sourceTimestamp)}`;

  return (
    <>
      <header className="glass relative z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-x-0 border-t-0 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/logo.png"
            alt="Logo SehatMerata"
            className="h-16 w-16 shrink-0 object-contain"
          />
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="truncate text-[15px] font-semibold tracking-tight">
              SehatMerata
            </span>
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
          <button
            type="button"
            onClick={onStartStory}
            title={`${statusText} · ${boundaryAvailable ? "Batas wilayah tersedia" : "Batas wilayah belum ada"}`}
            className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/20"
          >
            <Presentation size={14} />
            Mulai presentasi
          </button>

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
