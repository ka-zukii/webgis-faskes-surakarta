import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { CoverageResult } from "@/features/analysis/coverage";
import type { ScenePoint } from "@/utils/projection";

interface CoverageLayerProps {
  coverage: CoverageResult | null;
  visible: boolean;
}

const SITE_COLOR = { puskesmas: "#00E5FF", hospital: "#EF4444" } as const;

/** Satu segitiga-pasangan per sel di luar cakupan, digabung dalam satu BufferGeometry. */
function buildUncoveredGeometry(cells: ScenePoint[], step: number): THREE.BufferGeometry {
  const h = step * 0.47;
  const positions = new Float32Array(cells.length * 6 * 3);
  let o = 0;
  const push = (x: number, z: number) => {
    positions[o] = x;
    positions[o + 1] = 0;
    positions[o + 2] = z;
    o += 3;
  };
  for (const c of cells) {
    const x0 = c.x - h;
    const x1 = c.x + h;
    const z0 = c.z - h;
    const z1 = c.z + h;
    push(x0, z0);
    push(x1, z0);
    push(x1, z1);
    push(x0, z0);
    push(x1, z1);
    push(x0, z1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geometry;
}

export default function CoverageLayer({ coverage, visible }: CoverageLayerProps) {
  const uncoveredGeometry = useMemo(
    () => (coverage ? buildUncoveredGeometry(coverage.uncoveredPuskesmas, coverage.step) : null),
    [coverage],
  );

  useEffect(() => {
    return () => {
      uncoveredGeometry?.dispose();
    };
  }, [uncoveredGeometry]);

  if (!coverage) return null;

  return (
    <group name="coverage" visible={visible}>
      {uncoveredGeometry && (
        <mesh geometry={uncoveredGeometry} position={[0, 0.005, 0]}>
          <meshBasicMaterial color="#F43F5E" transparent opacity={0.3} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      )}
      {coverage.sites.map((site, index) => {
        const color = SITE_COLOR[site.tipe];
        return (
          <group key={index} position={[site.point.x, 0.008, site.point.z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[site.radius, 64]} />
              <meshBasicMaterial color={color} transparent opacity={0.07} depthWrite={false} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[site.radius - 0.012, site.radius, 96]} />
              <meshBasicMaterial color={color} transparent opacity={0.55} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
