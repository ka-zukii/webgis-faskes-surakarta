import { useCallback, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { PanelRight, Presentation, SlidersHorizontal } from "lucide-react";
import Topbar from "@/components/layout/Topbar";
import SidebarLeft from "@/components/layout/SidebarLeft";
import SidebarRight from "@/components/layout/SidebarRight";
import BottomBar from "@/components/layout/BottomBar";
import MapScene from "@/components/map/MapScene";
import MapLegend from "@/components/map/MapLegend";
import type { SearchItem } from "@/components/layout/SearchBox";
import { useFacilities } from "@/hooks/useFacilities";
import { useAnalysisData } from "@/hooks/useAnalysisData";
import {
  ALL_VISIBLE,
  FACILITY_META,
  countByType,
} from "@/features/facilities/meta";
import {
  ANALYSIS_MODES,
  type AnalysisModeId,
  type DataAvailability,
} from "@/features/analysis/modes";
import {
  buildModeStyles,
  DEFAULT_WEIGHTS,
  type CapacityWeights,
} from "@/features/analysis/metrics";
import { computeCoverage } from "@/features/analysis/coverage";
import { equityCategories } from "@/features/analysis/metrics";
import {
  DEFAULT_EQUITY_CONFIG,
  type EquityConfig,
} from "@/features/analysis/equity-config";
import { lonLatToScene, type ScenePoint } from "@/utils/projection";
import { pointInPolygons } from "@/utils/geometry";
import type {
  FacilityType,
  FocusRequest,
  SceneCameraInfo,
  Selection,
  VisibleTypes,
} from "@/types";
import FacilityTooltip from "@/components/map/FacilityTooltip";
import StoryPanel from "@/components/story/StoryPanel";
import { buildStorySteps } from "@/features/story/steps";

/** Di bawah 768px panel tampil sebagai drawer/bottom sheet dan dimulai dalam keadaan tertutup. */
const isDesktop = () => window.matchMedia("(min-width: 768px)").matches;

function MobileNavButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition ${
        active ? "text-accent" : "text-muted"
      }`}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}

function ChevronToggle({
  open,
  side,
  onClick,
}: {
  open: boolean;
  side: "left" | "right";
  onClick: () => void;
}) {
  const label = `${open ? "Tutup" : "Buka"} panel ${side === "left" ? "kiri" : "kanan"}`;
  const pointsLeft = side === "left" ? open : !open;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`absolute top-3 z-10 hidden h-8 w-8 md:grid place-items-center rounded-lg border border-white/10 bg-panel/80 text-muted backdrop-blur transition hover:text-accent ${
        side === "left" ? "left-3" : "right-3"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={pointsLeft ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
      </svg>
    </button>
  );
}

export default function App() {
  const facilityState = useFacilities();
  const facilitiesReady = facilityState.status === "ready";
  const analysis = useAnalysisData(facilityState.facilities, facilitiesReady);
  const facilities = facilityState.facilities;
  const units = analysis.units;
  const kecamatanShapes = analysis.kecamatan;

  const [visibleTypes, setVisibleTypes] = useState<VisibleTypes>(ALL_VISIBLE);
  const [analysisMode, setAnalysisMode] =
    useState<AnalysisModeId>("persebaran");
  const [weights, setWeights] = useState<CapacityWeights>(DEFAULT_WEIGHTS);
  const [equityConfig, setEquityConfig] = useState<EquityConfig>(
    DEFAULT_EQUITY_CONFIG,
  );
  const [storyIndex, setStoryIndex] = useState<number | null>(null);
  const [showKelurahan, setShowKelurahan] = useState(true);
  const [showKecamatan, setShowKecamatan] = useState(true);
  const [showCoverage, setShowCoverage] = useState(false);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [hovered, setHovered] = useState<Selection | null>(null);
  const [focus, setFocus] = useState<FocusRequest | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [camera, setCamera] = useState<SceneCameraInfo | null>(null);
  const [renderReady, setRenderReady] = useState(false);
  const [leftOpen, setLeftOpen] = useState<boolean>(isDesktop);
  const [rightOpen, setRightOpen] = useState<boolean>(isDesktop);

  const counts = useMemo(() => countByType(facilities), [facilities]);
  const visibleCount = useMemo(
    () => facilities.filter((facility) => visibleTypes[facility.tipe]).length,
    [facilities, visibleTypes],
  );
  const boundaryAvailable = analysis.status === "ready" && units.length > 0;
  const modeStyles = useMemo(
    () => buildModeStyles(units, analysisMode, weights),
    [units, analysisMode, weights],
  );

  /** Ketinggian dasar marker: atap kelurahan tempat fasilitas berada (0 jika di luar semua wilayah). */
  const facilityLift = useMemo(() => {
    const lift: Record<string, number> = {};
    for (const facility of facilities) {
      const p = lonLatToScene(facility.longitude, facility.latitude);
      const unit = units.find((u) => pointInPolygons(p.x, p.z, u.polygons));
      lift[facility.id] = unit
        ? (modeStyles.styles[unit.id]?.height ?? 0) + 0.01
        : 0;
    }
    return lift;
  }, [facilities, units, modeStyles]);

  const coverage = useMemo(
    () =>
      boundaryAvailable && facilitiesReady
        ? computeCoverage(units, facilities)
        : null,
    [boundaryAvailable, facilitiesReady, units, facilities],
  );
  const coverageByUnit = coverage?.byUnit ?? {};
  const equity = useMemo(
    () => equityCategories(units, weights),
    [units, weights],
  );
  const puskesmasByUnit = coverage?.puskesmasByUnit ?? {};

  const selectedFacility =
    selection?.kind === "facility"
      ? (facilities.find((f) => f.id === selection.id) ?? null)
      : null;
  const selectedUnit =
    selection?.kind === "kelurahan"
      ? (units.find((u) => u.id === selection.id) ?? null)
      : null;
  const selectedKecamatan =
    selection?.kind === "kecamatan"
      ? (kecamatanShapes.find((k) => k.nama === selection.id) ?? null)
      : null;

  const hoveredName = useMemo(() => {
    if (!hovered) return null;
    if (hovered.kind === "facility")
      return facilities.find((f) => f.id === hovered.id)?.nama ?? null;
    if (hovered.kind === "kelurahan")
      return units.find((u) => u.id === hovered.id)?.nama ?? null;
    return null;
  }, [hovered, facilities, units]);

  const hoveredFacility = useMemo(
    () =>
      hovered?.kind === "facility"
        ? (facilities.find((f) => f.id === hovered.id) ?? null)
        : null,
    [hovered, facilities],
  );

  const searchItems = useMemo<SearchItem[]>(() => {
    const items: SearchItem[] = [];
    for (const unit of units) {
      items.push({
        key: `k-${unit.id}`,
        label: unit.nama,
        sub: `Kelurahan · ${unit.kecamatan}`,
        selection: { kind: "kelurahan", id: unit.id },
      });
    }
    for (const shape of kecamatanShapes) {
      items.push({
        key: `c-${shape.nama}`,
        label: shape.nama,
        sub: "Kecamatan",
        selection: { kind: "kecamatan", id: shape.nama },
      });
    }
    for (const facility of facilities) {
      items.push({
        key: `f-${facility.id}`,
        label: facility.nama,
        sub: FACILITY_META[facility.tipe].label,
        selection: { kind: "facility", id: facility.id },
      });
    }
    return items;
  }, [units, kecamatanShapes, facilities]);

  const availability: DataAvailability = {
    population: analysis.populationReady,
    boundaries: boundaryAvailable,
  };
  const activeMode = ANALYSIS_MODES.find((mode) => mode.id === analysisMode);

  const pointFor = useCallback(
    (sel: Selection): ScenePoint | null => {
      if (sel.kind === "kelurahan")
        return units.find((u) => u.id === sel.id)?.centroid ?? null;
      if (sel.kind === "kecamatan")
        return kecamatanShapes.find((k) => k.nama === sel.id)?.centroid ?? null;
      const facility = facilities.find((f) => f.id === sel.id);
      return facility
        ? lonLatToScene(facility.longitude, facility.latitude)
        : null;
    },
    [units, kecamatanShapes, facilities],
  );

  /** Memilih objek; `fly` menerbangkan kamera ke objek tersebut. */
  const select = useCallback(
    (next: Selection | null, fly: boolean) => {
      setSelection(next);
      if (!next) return;
      setRightOpen(true);
      if (!isDesktop()) setLeftOpen(false);
      if (!fly) return;
      const point = pointFor(next);
      if (point) setFocus({ x: point.x, z: point.z });
    },
    [pointFor],
  );

  const handleMapSelect = useCallback(
    (next: Selection | null) =>
      select(next, next !== null && next.kind !== "facility"),
    [select],
  );

  /** Membuka satu panel di mobile otomatis menutup panel lainnya. */
  const togglePanel = (side: "left" | "right") => {
    if (side === "left") {
      const next = !leftOpen;
      setLeftOpen(next);
      if (next && !isDesktop()) setRightOpen(false);
    } else {
      const next = !rightOpen;
      setRightOpen(next);
      if (next && !isDesktop()) setLeftOpen(false);
    }
  };

  const closePanels = () => {
    setLeftOpen(false);
    setRightOpen(false);
  };

  const toggleType = useCallback((type: FacilityType) => {
    setVisibleTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  }, []);

  const handleReset = useCallback(() => {
    setSelection(null);
    setFocus(null);
    setResetSignal((value) => value + 1);
  }, []);

  const handleWeightChange = useCallback(
    (key: keyof CapacityWeights, value: number) => {
      setWeights((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleCameraChange = useCallback(
    (info: SceneCameraInfo) => setCamera(info),
    [],
  );

  const storySteps = useMemo(
    () =>
      buildStorySteps({
        units,
        kecamatan: kecamatanShapes,
        weights,
        config: equityConfig,
      }),
    [units, kecamatanShapes, weights, equityConfig],
  );

  const goToStep = useCallback(
    (index: number) => {
      const step = storySteps[index];
      if (!step) return;
      setStoryIndex(index);
      if (step.target) select(step.target, true);
      else handleReset();
    },
    [storySteps, select, handleReset],
  );

  const loading = !facilitiesReady || analysis.status === "loading";

  return (
    <div className="flex h-dvh flex-col bg-base">
      <Topbar
        facilityStatus={facilityState.status}
        facilityError={facilityState.error}
        sourceTimestamp={facilityState.sourceTimestamp}
        boundaryAvailable={boundaryAvailable}
        onReset={handleReset}
        searchItems={searchItems}
        onSearchPick={(item) => select(item.selection, true)}
        onStartStory={() => goToStep(0)}
      />

      <div className="relative flex min-h-0 flex-1 max-md:overflow-hidden">
        {(leftOpen || rightOpen) && (
          <button
            type="button"
            aria-label="Tutup panel"
            onClick={closePanels}
            className="absolute inset-0 z-30 bg-black/50 md:hidden"
          />
        )}

        <SidebarLeft
          open={leftOpen}
          onClose={() => setLeftOpen(false)}
          counts={counts}
          visibleTypes={visibleTypes}
          onToggleType={toggleType}
          showKelurahan={showKelurahan}
          onToggleKelurahan={() => setShowKelurahan((v) => !v)}
          showKecamatan={showKecamatan}
          onToggleKecamatan={() => setShowKecamatan((v) => !v)}
          boundaryAvailable={boundaryAvailable}
          showCoverage={showCoverage}
          onToggleCoverage={() => setShowCoverage((v) => !v)}
          coverageAvailable={coverage !== null}
          analysisMode={analysisMode}
          onModeChange={setAnalysisMode}
          availability={availability}
          weights={weights}
          onWeightChange={handleWeightChange}
          onResetWeights={() => setWeights(DEFAULT_WEIGHTS)}
        />

        <main className="relative min-w-0 flex-1 overflow-hidden">
          <div className="absolute inset-0">
            <MapScene
              facilities={facilities}
              visibleTypes={visibleTypes}
              facilityLift={facilityLift}
              units={units}
              unitStyles={modeStyles.styles}
              showKelurahan={showKelurahan && boundaryAvailable}
              kecamatan={kecamatanShapes}
              showKecamatan={showKecamatan && boundaryAvailable}
              selectedKecamatan={selectedKecamatan?.nama ?? null}
              coverage={coverage}
              showCoverage={showCoverage && coverage !== null}
              selection={selection}
              hovered={hovered}
              focus={focus}
              resetSignal={resetSignal}
              onSelect={handleMapSelect}
              onHover={setHovered}
              onCameraChange={handleCameraChange}
              onReady={() => setRenderReady(true)}
            />
          </div>

          {storyIndex !== null && (
            <StoryPanel
              steps={storySteps}
              index={storyIndex}
              onGo={goToStep}
              onClose={() => setStoryIndex(null)}
            />
          )}

          {loading && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="glass rounded-xl px-4 py-2 text-xs text-muted">
                Memuat data wilayah…
              </div>
            </div>
          )}

          {boundaryAvailable && <MapLegend scale={modeStyles.scale} />}

          <ChevronToggle
            open={leftOpen}
            side="left"
            onClick={() => setLeftOpen((v) => !v)}
          />
          <ChevronToggle
            open={rightOpen}
            side="right"
            onClick={() => setRightOpen((v) => !v)}
          />
        </main>

        <SidebarRight
          open={rightOpen}
          onClose={() => setRightOpen(false)}
          facility={selectedFacility}
          unit={selectedUnit}
          kecamatan={selectedKecamatan}
          coverageByUnit={coverageByUnit}
          puskesmasByUnit={puskesmasByUnit}
          equity={equity}
          units={units}
          weights={weights}
          counts={counts}
          total={facilities.length}
          equityConfig={equityConfig}
          onEquityConfigChange={setEquityConfig}
          onClearSelection={() => setSelection(null)}
        />
      </div>

      <nav className="glass relative z-30 grid shrink-0 grid-cols-3 border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] md:hidden">
        <MobileNavButton
          icon={SlidersHorizontal}
          label="Kontrol"
          active={leftOpen}
          onClick={() => togglePanel("left")}
        />
        <MobileNavButton
          icon={Presentation}
          label="Presentasi"
          active={storyIndex !== null}
          onClick={() => {
            closePanels();
            if (storyIndex !== null) setStoryIndex(null);
            else goToStep(0);
          }}
        />
        <MobileNavButton
          icon={PanelRight}
          label="Detail"
          active={rightOpen}
          onClick={() => togglePanel("right")}
        />
      </nav>

      <BottomBar
        lon={camera?.lon ?? null}
        lat={camera?.lat ?? null}
        zoom={camera?.zoom ?? null}
        modeLabel={activeMode?.label ?? "-"}
        visibleCount={visibleCount}
        totalCount={facilities.length}
        unitCount={units.length}
        renderReady={renderReady}
        hoveredName={hoveredName}
      />
      <FacilityTooltip facility={hoveredFacility} />
    </div>
  );
}
