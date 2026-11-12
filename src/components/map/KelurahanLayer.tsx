import { memo, useEffect, useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { KelurahanUnit } from "@/features/analysis/units";
import type { UnitStyle } from "@/features/analysis/metrics";
import {
  buildExtrudedGeometries,
  buildRingOutlines,
} from "@/components/map/buildings";

interface KelurahanLayerProps {
  units: KelurahanUnit[];
  styles: Record<string, UnitStyle>;
  visible: boolean;
  hoveredId: string | null;
  selectedId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

interface UnitMeshProps {
  unit: KelurahanUnit;
  style: UnitStyle;
  active: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}

const UnitMesh = memo(function UnitMesh({
  unit,
  style,
  active,
  onHover,
  onSelect,
}: UnitMeshProps) {
  const geometries = useMemo(
    () => buildExtrudedGeometries(unit.polygons),
    [unit.polygons],
  );
  const topOutlines = useMemo(
    () => buildRingOutlines(unit.polygons, 1),
    [unit.polygons],
  );
  const baseOutlines = useMemo(
    () => buildRingOutlines(unit.polygons, 0),
    [unit.polygons],
  );

  useEffect(() => {
    return () => {
      geometries.forEach((g) => g.dispose());
      topOutlines.forEach((g) => g.dispose());
      baseOutlines.forEach((g) => g.dispose());
    };
  }, [geometries, topOutlines, baseOutlines]);

  return (
    <group scale={[1, style.height, 1]} position={[0, 0.002, 0]}>
      {geometries.map((geometry, index) => (
        <mesh
          key={index}
          geometry={geometry}
          onPointerOver={(event: ThreeEvent<PointerEvent>) => {
            event.stopPropagation();
            document.body.style.cursor = "pointer";
            onHover(unit.id);
          }}
          onPointerOut={() => {
            document.body.style.cursor = "";
            onHover(null);
          }}
          onClick={(event: ThreeEvent<MouseEvent>) => {
            event.stopPropagation();
            onSelect(unit.id);
          }}
        >
          <meshStandardMaterial
            color={style.color}
            emissive={style.color}
            emissiveIntensity={active ? 0.55 : 0.12}
            transparent
            opacity={active ? 0.95 : 0.82}
            roughness={0.5}
            metalness={0.1}
          />
        </mesh>
      ))}
      {topOutlines.map((geometry, index) => (
        <lineLoop key={`top-${index}`} geometry={geometry}>
          <lineBasicMaterial
            color={active ? "#FFFFFF" : "#CBD5E1"}
            transparent
            opacity={active ? 1 : 0.7}
          />
        </lineLoop>
      ))}
      {baseOutlines.map((geometry, index) => (
        <lineLoop key={`base-${index}`} geometry={geometry}>
          <lineBasicMaterial color="#00E5FF" transparent opacity={0.5} />
        </lineLoop>
      ))}
    </group>
  );
});

export default function KelurahanLayer({
  units,
  styles,
  visible,
  hoveredId,
  selectedId,
  onHover,
  onSelect,
}: KelurahanLayerProps) {
  const labelId = hoveredId ?? selectedId;
  const labelUnit = labelId
    ? (units.find((u) => u.id === labelId) ?? null)
    : null;
  const labelStyle = labelUnit ? styles[labelUnit.id] : undefined;

  return (
    <group name="kelurahan" visible={visible}>
      {labelUnit && (
        <Html
          position={[
            labelUnit.centroid.x,
            (labelStyle?.height ?? 0.05) + 0.08,
            labelUnit.centroid.z,
          ]}
          center
          zIndexRange={[30, 0]}
          style={{ pointerEvents: "none" }}
        >
          <div
            className="whitespace-nowrap rounded-md border border-white/20 bg-black/80 px-2 py-1 text-xs font-semibold shadow-lg"
            style={{ color: "#FFFFFF" }}
          >
            {labelUnit.nama}
          </div>
        </Html>
      )}
      {units.map((unit) => {
        const style = styles[unit.id] ?? {
          value: null,
          height: 0.05,
          color: "#334155",
        };
        const active = hoveredId === unit.id || selectedId === unit.id;
        return (
          <UnitMesh
            key={unit.id}
            unit={unit}
            style={style}
            active={active}
            onHover={onHover}
            onSelect={onSelect}
          />
        );
      })}
    </group>
  );
}
