import { useCallback, useEffect, useRef } from "react";
import type { ComponentRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type {
  HealthcareFacility,
  FocusRequest,
  SceneCameraInfo,
  Selection,
  VisibleTypes,
} from "@/types";
import type { KelurahanUnit, KecamatanShape } from "@/features/analysis/units";
import type { UnitStyle } from "@/features/analysis/metrics";
import FacilityLayer from "@/components/map/FacilityLayer";
import KelurahanLayer from "@/components/map/KelurahanLayer";
import KecamatanLayer from "@/components/map/KecamatanLayer";
import CoverageLayer from "@/components/map/CoverageLayer";
import type { CoverageResult } from "@/features/analysis/coverage";
import { sceneToLonLat } from "@/utils/projection";

type OrbitRef = ComponentRef<typeof OrbitControls>;

const DEFAULT_CAMERA_POSITION = new THREE.Vector3(0, 9, 9);
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);
const FOCUS_OFFSET = new THREE.Vector3(0, 2.6, 2.6);
const REPORT_INTERVAL_SECONDS = 0.5;
const REPORT_MIN_DISTANCE_CHANGE = 0.02; // 2% perubahan jarak kamera

interface CameraGoal {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

export interface MapSceneProps {
  facilities: HealthcareFacility[];
  visibleTypes: VisibleTypes;
  facilityLift: Record<string, number>;
  units: KelurahanUnit[];
  unitStyles: Record<string, UnitStyle>;
  showKelurahan: boolean;
  kecamatan: KecamatanShape[];
  showKecamatan: boolean;
  selectedKecamatan: string | null;
  coverage: CoverageResult | null;
  showCoverage: boolean;
  selection: Selection | null;
  hovered: Selection | null;
  focus: FocusRequest | null;
  resetSignal: number;
  onSelect: (selection: Selection | null) => void;
  onHover: (selection: Selection | null) => void;
  onCameraChange: (info: SceneCameraInfo) => void;
  onReady: () => void;
}

interface CameraTween {
  goal: CameraGoal;
  from: THREE.Vector3;
  fromTarget: THREE.Vector3;
  elapsed: number;
  duration: number;
  lift: number;
}

/** Kurva halus di awal dan akhir, sehingga gerakan kamera tidak terasa mendadak. */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Pendekatan zoom semu dari jarak kamera; hanya untuk tampilan status. */
function computeZoom(distance: number): number {
  const safe = Math.max(distance, 0.01);
  return Math.max(1, Math.min(20, Math.round(Math.log2(60 / safe))));
}

type SceneProps = Omit<MapSceneProps, "onReady">;

function SceneContents(props: SceneProps) {
  const {
    facilities,
    visibleTypes,
    facilityLift,
    units,
    unitStyles,
    showKelurahan,
    kecamatan,
    showKecamatan,
    selectedKecamatan,
    coverage,
    showCoverage,
    selection,
    hovered,
    focus,
    resetSignal,
    onSelect,
    onHover,
    onCameraChange,
  } = props;

  const controlsRef = useRef<OrbitRef>(null);
  const goalRef = useRef<CameraGoal | null>(null);
  const tweenRef = useRef<CameraTween | null>(null);
  const lastReportRef = useRef(-Infinity);
  const lastInfoRef = useRef<SceneCameraInfo | null>(null);

  // Callback stabil agar FacilityLayer/KelurahanLayer tidak render ulang setiap frame laporan kamera.
  const handleFacilityHover = useCallback(
    (id: string | null) => onHover(id ? { kind: "facility", id } : null),
    [onHover],
  );
  const handleFacilitySelect = useCallback(
    (id: string) => onSelect({ kind: "facility", id }),
    [onSelect],
  );
  const handleUnitHover = useCallback(
    (id: string | null) => onHover(id ? { kind: "kelurahan", id } : null),
    [onHover],
  );
  const handleUnitSelect = useCallback(
    (id: string) => onSelect({ kind: "kelurahan", id }),
    [onSelect],
  );

  // Reset kamera: transisi halus kembali ke tampilan keseluruhan.
  useEffect(() => {
    if (resetSignal > 0) {
      goalRef.current = {
        position: DEFAULT_CAMERA_POSITION.clone(),
        target: DEFAULT_TARGET.clone(),
      };
    }
  }, [resetSignal]);

  // Terbang ke wilayah yang dipilih.
  useEffect(() => {
    if (!focus) return;
    const target = new THREE.Vector3(focus.x, 0, focus.z);
    goalRef.current = { position: target.clone().add(FOCUS_OFFSET), target };
  }, [focus]);

  useFrame((state, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const goal = goalRef.current;
    if (goal) {
      let tween = tweenRef.current;
      if (!tween || tween.goal !== goal) {
        // Tween baru dimulai dari posisi kamera saat ini, sehingga transisi selalu mulus.
        const distance = state.camera.position.distanceTo(goal.position);
        tween = {
          goal,
          from: state.camera.position.clone(),
          fromTarget: controls.target.clone(),
          elapsed: 0,
          duration: Math.min(2.2, Math.max(1.0, 0.9 + distance * 0.12)),
          lift: Math.min(3, distance * 0.3),
        };
        tweenRef.current = tween;
      }

      tween.elapsed += delta;
      const t = Math.min(tween.elapsed / tween.duration, 1);
      const p = easeInOutCubic(t);
      state.camera.position.lerpVectors(tween.from, goal.position, p);
      // Kamera sedikit naik di tengah perjalanan agar terasa seperti terbang, bukan meluncur datar.
      state.camera.position.y += Math.sin(Math.PI * p) * tween.lift;
      controls.target.lerpVectors(tween.fromTarget, goal.target, p);
      controls.update();

      if (t >= 1) {
        goalRef.current = null;
        tweenRef.current = null;
      }
    }

    const now = state.clock.elapsedTime;
    if (now - lastReportRef.current >= REPORT_INTERVAL_SECONDS) {
      lastReportRef.current = now;
      const { lon, lat } = sceneToLonLat(controls.target.x, controls.target.z);
      const distance = state.camera.position.distanceTo(controls.target);
      const zoom = computeZoom(distance);
      const prev = lastInfoRef.current;
      // Lapor ke React hanya jika berubah berarti, agar App tidak render ulang terus-menerus.
      const changed =
        !prev ||
        Math.abs(prev.lon - lon) > 1e-5 ||
        Math.abs(prev.lat - lat) > 1e-5 ||
        Math.abs(prev.distance - distance) / Math.max(distance, 0.01) >
          REPORT_MIN_DISTANCE_CHANGE ||
        prev.zoom !== zoom;
      if (changed) {
        const info = { lon, lat, distance, zoom };
        lastInfoRef.current = info;
        onCameraChange(info);
      }
    }
  });

  const hoveredFacilityId = hovered?.kind === "facility" ? hovered.id : null;
  const selectedFacilityId =
    selection?.kind === "facility" ? selection.id : null;
  const hoveredUnitId = hovered?.kind === "kelurahan" ? hovered.id : null;
  const selectedUnitId = selection?.kind === "kelurahan" ? selection.id : null;

  return (
    <>
      <color attach="background" args={["#05070B"]} />
      <fog attach="fog" args={["#05070B", 25, 70]} />

      <ambientLight intensity={0.6} />
      <directionalLight position={[6, 12, 6]} intensity={1.1} />
      <pointLight
        position={[-6, 4, -6]}
        color="#00E5FF"
        intensity={0.8}
        distance={30}
      />
      <pointLight
        position={[6, 4, 6]}
        color="#7000FF"
        intensity={0.5}
        distance={30}
      />

      <Grid
        args={[60, 60]}
        cellSize={0.5}
        cellThickness={0.6}
        cellColor="#1E293B"
        sectionSize={2.5}
        sectionThickness={1.2}
        sectionColor="#0E7490"
        fadeDistance={32}
        fadeStrength={1.6}
        position={[0, 0, 0]}
      />

      <KelurahanLayer
        units={units}
        styles={unitStyles}
        visible={showKelurahan}
        hoveredId={hoveredUnitId}
        selectedId={selectedUnitId}
        onHover={handleUnitHover}
        onSelect={handleUnitSelect}
      />

      <KecamatanLayer
        shapes={kecamatan}
        visible={showKecamatan}
        selectedNama={selectedKecamatan}
      />

      <CoverageLayer coverage={coverage} visible={showCoverage} />

      <FacilityLayer
        facilities={facilities}
        visibleTypes={visibleTypes}
        liftById={facilityLift}
        hoveredId={hoveredFacilityId}
        selectedId={selectedFacilityId}
        onHover={handleFacilityHover}
        onSelect={handleFacilitySelect}
      />

      {/* Saat pengguna mulai memutar/menggeser kamera, animasi terbang otomatis dibatalkan
          agar kamera tidak "tertarik balik" ke tujuan lama. */}
      <OrbitControls
        ref={controlsRef}
        makeDefault
        onStart={() => {
          goalRef.current = null;
        }}
        enableDamping
        dampingFactor={0.08}
        minDistance={1.5}
        maxDistance={40}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 0, 0]}
      />
    </>
  );
}

export default function MapScene({
  onReady,
  onSelect,
  ...props
}: MapSceneProps) {
  return (
    <Canvas
      className="h-full w-full"
      camera={{ position: [0, 9, 9], fov: 45, near: 0.1, far: 500 }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
      onCreated={() => onReady()}
      onPointerMissed={() => onSelect(null)}
    >
      <SceneContents {...props} onSelect={onSelect} />
    </Canvas>
  );
}
