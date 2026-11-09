import { useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { HealthcareFacility, VisibleTypes } from "@/types";
import { FACILITY_META } from "@/features/facilities/meta";
import { lonLatToScene } from "@/utils/projection";

interface FacilityLayerProps {
  facilities: HealthcareFacility[];
  visibleTypes: VisibleTypes;
  /** Ketinggian atap kelurahan tempat fasilitas berada; marker diangkat ke atas atap agar tidak tertutup poligon. */
  liftById: Record<string, number>;
  hoveredId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

interface FacilityMarkerProps {
  facility: HealthcareFacility;
  lift: number;
  highlighted: boolean;
  selected: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

function FacilityMarker({ facility, lift, highlighted, selected, onHover, onSelect }: FacilityMarkerProps) {
  const { x, z } = lonLatToScene(facility.longitude, facility.latitude);
  const color = FACILITY_META[facility.tipe].color;
  const active = highlighted || selected;

  return (
    <group position={[x, lift, z]}>
      <mesh
        position={[0, 0.06, 0]}
        scale={active ? 1.8 : 1}
        onPointerOver={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          document.body.style.cursor = "pointer";
          onHover(facility.id);
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
          onHover(null);
        }}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          event.stopPropagation();
          onSelect(facility.id);
        }}
      >
        <cylinderGeometry args={[0.03, 0.03, 0.12, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={active ? 1.1 : 0.35}
          roughness={0.35}
          metalness={0.15}
        />
      </mesh>
      {active && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
          <ringGeometry args={[0.07, 0.1, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  );
}

export default function FacilityLayer({
  facilities,
  visibleTypes,
  liftById,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
}: FacilityLayerProps) {
  const visible = useMemo(
    () => facilities.filter((facility) => visibleTypes[facility.tipe]),
    [facilities, visibleTypes],
  );

  return (
    <group name="facilities">
      {visible.map((facility) => (
        <FacilityMarker
          key={facility.id}
          facility={facility}
          lift={liftById[facility.id] ?? 0}
          highlighted={hoveredId === facility.id}
          selected={selectedId === facility.id}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}
