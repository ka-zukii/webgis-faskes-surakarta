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
      <header className="glass relative z-30 flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-x-0 border-t-0 px-3 py-2 md:h-14 md:flex-nowrap md:gap-4 md:px-4 md:py-0">
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <img
            src="/logo.png"
            alt="Logo SehatMerata"
            className="h-10 w-10 shrink-0 object-contain md:h-16 md:w-16"
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

        <div className="order-last flex w-full min-w-0 justify-center md:order-none md:w-auto md:flex-1 md:px-2">
          <SearchBox items={searchItems} onPick={onSearchPick} />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onStartStory}
            aria-label="Mulai presentasi"
            title={`${statusText} · ${boundaryAvailable ? "Batas wilayah tersedia" : "Batas wilayah belum ada"}`}
            className="flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-2.5 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/20 sm:px-3"
          >
            <Presentation size={14} />
            <span className="hidden sm:inline">Mulai presentasi</span>
          </button>

          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            aria-label="Panduan & Metodologi"
            title="Panduan & Metodologi"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-panel-2/70 px-2.5 py-1.5 text-xs font-medium text-ink transition hover:border-accent/50 hover:text-accent sm:px-3"
          >
            <BookOpen size={14} />
            <span className="hidden sm:inline">Panduan &amp; Metodologi</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            aria-label="Reset kamera"
            title="Reset kamera"
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-panel-2/70 px-2.5 py-1.5 text-xs font-medium text-ink transition hover:border-accent/50 hover:text-accent sm:px-3"
          >
            <RotateCcw size={14} />
            <span className="hidden lg:inline">Reset kamera</span>
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
