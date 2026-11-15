import { useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Segments } from '../../components/ClassificationScene';
import { TextSprite } from '../../components/TextSprite';
import type { Img } from '../../ml/conv';

const CELL = 0.3;
const MAX_H = 1.6;
const tmp = new THREE.Object3D();
const c = new THREE.Color();

/** One activation map drawn as a grid of bars lying in the X–Z plane, centred at `center`. */
function MapBars({ img, center, color, scale }: { img: Img; center: [number, number]; color: string; scale: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const n = img.size;
    const base = new THREE.Color('#1c2335');
    const top = new THREE.Color(color);
    for (let i = 0; i < n * n; i++) {
      const v = Math.min(1, Math.abs(img.px[i]) / (scale || 1));
      const h = 0.04 + v * MAX_H;
      tmp.position.set(center[0] + ((i % n) - n / 2 + 0.5) * CELL, h / 2, center[1] + (Math.floor(i / n) - n / 2 + 0.5) * CELL);
      tmp.scale.set(1, h, 1);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
      mesh.setColorAt(i, c.copy(base).lerp(top, Math.sqrt(v)));
    }
    mesh.count = n * n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [img, center, color, scale]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 400]}>
      <boxGeometry args={[CELL * 0.9, 1, CELL * 0.9]} />
      <meshStandardMaterial roughness={0.6} />
    </instancedMesh>
  );
}

function Frame({ center, cells, offset, y = 0.02 }: { center: [number, number]; cells: number; offset: [number, number]; y?: number }) {
  const [cx, cz] = center;
  const s = cells * CELL;
  const x0 = cx + offset[0];
  const z0 = cz + offset[1];
  const pts: [number, number, number][] = [
    [x0, y, z0], [x0 + s, y, z0],
    [x0 + s, y, z0], [x0 + s, y, z0 + s],
    [x0 + s, y, z0 + s], [x0, y, z0 + s],
    [x0, y, z0 + s], [x0, y, z0],
  ];
  return <Segments points={pts} color="#ffd166" opacity={1} />;
}

export interface MapSpec {
  conv: Img;
  pooled: Img;
  color: string;
  label: string;
}

interface Props {
  input: Img;
  maps: MapSpec[];
  probe: { x: number; y: number };
  labels: { input: string; conv: string; pool: string };
}

const INPUT_C: [number, number] = [-10, 0];
const convCenter = (k: number, K: number): [number, number] => [0, (k - (K - 1) / 2) * 6.2];
const poolCenter = (k: number, K: number): [number, number] => [9, (k - (K - 1) / 2) * 6.2];

export function CnnScene({ input, maps, probe, labels }: Props) {
  const K = maps.length;
  const scales = useMemo(() => maps.map((m) => Math.max(1e-6, ...Array.from(m.conv.px))), [maps]);
  const inN = input.size;
  const convN = inN - 2;

  // corners of the input window → each output cell
  const links = useMemo(() => {
    const segs: [number, number, number][] = [];
    const wx = INPUT_C[0] + (probe.x - inN / 2 + 1.5) * CELL;
    const wz = INPUT_C[1] + (probe.y - inN / 2 + 1.5) * CELL;
    maps.forEach((_, k) => {
      const [cx, cz] = convCenter(k, K);
      const ox = cx + (probe.x - convN / 2 + 0.5) * CELL;
      const oz = cz + (probe.y - convN / 2 + 0.5) * CELL;
      segs.push([wx, 0.3, wz], [ox, 0.3, oz]);
    });
    return segs;
  }, [probe, maps, K, inN, convN]);

  const spanZ = Math.max(8, K * 6.2);
  return (
    <Canvas camera={{ position: [-3, 9 + spanZ * 0.35, 9 + spanZ * 0.45], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={['#0f1320']} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 12, 6]} intensity={1.1} />
      <MapBars img={input} center={INPUT_C} color="#e8ecf6" scale={1} />
      <Frame center={INPUT_C} cells={3} offset={[(probe.x - inN / 2) * CELL, (probe.y - inN / 2) * CELL]} />
      <TextSprite text={labels.input} position={[INPUT_C[0], 0.2, INPUT_C[1] + inN * CELL * 0.5 + 0.9]} size={0.6} />
      {maps.map((m, k) => {
        const cc = convCenter(k, K);
        const pc = poolCenter(k, K);
        return (
          <group key={k}>
            <MapBars img={m.conv} center={cc} color={m.color} scale={scales[k]} />
            <Frame center={cc} cells={1} offset={[(probe.x - convN / 2) * CELL, (probe.y - convN / 2) * CELL]} />
            <TextSprite text={m.label} position={[cc[0] - convN * CELL * 0.5 - 1.6, 0.2, cc[1]]} size={0.5} color={m.color} />
            <MapBars img={m.pooled} center={pc} color={m.color} scale={scales[k]} />
          </group>
        );
      })}
      <TextSprite text={labels.conv} position={[0, 0.2, -spanZ / 2 - 0.9]} size={0.6} />
      <TextSprite text={labels.pool} position={[9, 0.2, -spanZ / 2 - 0.9]} size={0.6} />
      <Segments points={links} color="#ffd166" opacity={0.8} />
      <OrbitControls enableDamping makeDefault target={[0, 0, 0]} minDistance={6} maxDistance={45} />
    </Canvas>
  );
}
