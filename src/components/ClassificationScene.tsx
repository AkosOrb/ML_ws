import { AdaptiveFov } from './AdaptiveFov';
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { EXTENT, type Sample } from '../ml/datasets';
import { TextSprite } from './TextSprite';

/** Height of the probability surface when P(class 1) = 1. */
export const SURFACE_H = 2.4;
const RES = 48;
const SIZE = EXTENT * 2;

export const CLASS_COLORS = ['#4f9dff', '#ff6b6b'] as const;
const c0 = new THREE.Color(CLASS_COLORS[0]);
const c1 = new THREE.Color(CLASS_COLORS[1]);
const cMid = new THREE.Color('#e8ecf6');

/** Blue → white → red, with a sharper band near 0.5 so the boundary stands out. */
export function probaColor(p: number, out = new THREE.Color()): THREE.Color {
  const q = Math.min(1, Math.max(0, p));
  return q < 0.5 ? out.copy(c0).lerp(cMid, Math.pow(q * 2, 3)) : out.copy(c1).lerp(cMid, Math.pow((1 - q) * 2, 3));
}

/** Scene coordinates: feature x1 → X, x2 → Z, probability → Y (up). */
export const toScene = (x1: number, x2: number, y = 0): [number, number, number] => [x1, y, x2];

function Surface({ proba, opacity }: { proba: (x1: number, x2: number) => number; opacity: number }) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(SIZE, SIZE, RES, RES);
    g.rotateX(-Math.PI / 2); // lie flat in the X–Z plane
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
    return g;
  }, []);

  useLayoutEffect(() => {
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const col = geometry.attributes.color as THREE.BufferAttribute;
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const p = proba(pos.getX(i), pos.getZ(i));
      pos.setY(i, p * SURFACE_H);
      probaColor(p, c);
      col.setXYZ(i, c.r, c.g, c.b);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    geometry.computeVertexNormals();
  }, [geometry, proba]);

  useLayoutEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors transparent opacity={opacity} side={THREE.DoubleSide} roughness={0.8} depthWrite={false} />
    </mesh>
  );
}

const tmp = new THREE.Object3D();
const colors = [new THREE.Color(CLASS_COLORS[0]), new THREE.Color(CLASS_COLORS[1])];

/** Samples drawn at the height of their true label: blue on the floor, red at the top. */
function SamplePoints({ data, dimmed }: { data: Sample[]; dimmed?: Set<number> }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dim = new THREE.Color('#3a4460');
    data.forEach((d, i) => {
      tmp.position.set(...toScene(d.x1, d.x2, d.label * SURFACE_H));
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
      mesh.setColorAt(i, dimmed?.has(i) ? dim : colors[d.label]);
    });
    mesh.count = data.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [data, dimmed]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 500]}>
      <sphereGeometry args={[0.08, 14, 10]} />
      <meshStandardMaterial roughness={0.35} />
    </instancedMesh>
  );
}

/** Rings around selected samples (support vectors, neighbours…). */
export function Rings({ data, indices, color = '#ffd166' }: { data: Sample[]; indices: number[]; color?: string }) {
  return (
    <group>
      {indices.map((i) => (
        <mesh key={i} position={toScene(data[i].x1, data[i].x2, data[i].label * SURFACE_H)} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.14, 0.2, 24]} />
          <meshBasicMaterial color={color} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

/** Thin line segments given as pairs of scene points. */
export function Segments({ points, color = '#ffd166', opacity = 0.9 }: { points: [number, number, number][]; color?: string; opacity?: number }) {
  const geometry = useMemo(() => new THREE.BufferGeometry(), []);
  useLayoutEffect(() => {
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points.flat()), 3));
    geometry.computeBoundingSphere();
  }, [geometry, points]);
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  );
}

interface Props {
  data: Sample[];
  proba: (x1: number, x2: number) => number;
  heightLabel: string;
  surfaceOpacity?: number;
  dimmed?: Set<number>;
  /** Called with feature coordinates when the floor is clicked. */
  onFloorClick?: (x1: number, x2: number) => void;
  children?: ReactNode;
}

/**
 * Shared 3D view for two-feature classifiers: the samples, plus the model's
 * predicted probability of the red class drawn as a height-and-colour surface.
 */
export function ClassificationScene({ data, proba, heightLabel, surfaceOpacity = 0.75, dimmed, onFloorClick, children }: Props) {
  const L = EXTENT + 0.4;
  return (
    <Canvas camera={{ position: [6.5, 6.5, 8], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={['#0f1320']} />
      <AdaptiveFov />
      <ambientLight intensity={0.75} />
      <directionalLight position={[4, 10, 6]} intensity={1.1} />
      <gridHelper args={[SIZE, 12, '#3a4460', '#262d40']} position={[0, -0.01, 0]} />
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          if (!onFloorClick || e.delta > 4) return; // ignore drags
          e.stopPropagation();
          onFloorClick(e.point.x, e.point.z);
        }}
      >
        <planeGeometry args={[SIZE, SIZE]} />
        <meshBasicMaterial color="#141a2b" transparent opacity={0.6} />
      </mesh>
      <Surface proba={proba} opacity={surfaceOpacity} />
      <SamplePoints data={data} dimmed={dimmed} />
      {children}
      <Segments points={[[-L, 0, -L], [-L, SURFACE_H, -L]]} color="#9aa7c7" />
      <TextSprite text="x₁" position={[L + 0.3, 0, -L]} />
      <TextSprite text="x₂" position={[-L, 0, L + 0.3]} />
      <TextSprite text={heightLabel} position={[-L, SURFACE_H + 0.35, -L]} size={0.32} />
      <OrbitControls enableDamping makeDefault target={[0, 0.9, 0]} minDistance={4} maxDistance={25} />
    </Canvas>
  );
}
