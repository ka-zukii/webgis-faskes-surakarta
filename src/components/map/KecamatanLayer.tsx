import { useEffect, useMemo } from "react";
import type { KecamatanShape } from "@/features/analysis/units";
import { buildFlatGeometries, buildRingOutlines } from "@/components/map/buildings";

interface KecamatanLayerProps {
  shapes: KecamatanShape[];
  visible: boolean;
  selectedNama: string | null;
}

function KecamatanOutline({ shape, active }: { shape: KecamatanShape; active: boolean }) {
  const fills = useMemo(() => buildFlatGeometries(shape.polygons), [shape.polygons]);
  const outlines = useMemo(() => buildRingOutlines(shape.polygons, 0), [shape.polygons]);

  useEffect(() => {
    return () => {
      fills.forEach((g) => g.dispose());
      outlines.forEach((g) => g.dispose());
    };
  }, [fills, outlines]);

  return (
    <group position={[0, 0.012, 0]}>
      {fills.map((geometry, index) => (
        <mesh key={index} geometry={geometry} position={[0, -0.01, 0]}>
          <meshBasicMaterial
            color={active ? "#00E5FF" : "#7000FF"}
            transparent
            opacity={active ? 0.16 : 0.08}
            depthWrite={false}
          />
        </mesh>
      ))}
      {outlines.map((geometry, index) => (
        <lineLoop key={index} geometry={geometry}>
          <lineBasicMaterial color={active ? "#FFFFFF" : "#A78BFA"} transparent opacity={0.9} />
        </lineLoop>
      ))}
    </group>
  );
}

export default function KecamatanLayer({ shapes, visible, selectedNama }: KecamatanLayerProps) {
  return (
    <group name="kecamatan" visible={visible}>
      {shapes.map((shape) => (
        <KecamatanOutline key={shape.nama} shape={shape} active={selectedNama === shape.nama} />
      ))}
    </group>
  );
}
