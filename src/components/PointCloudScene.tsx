import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Vec3 } from '../ml/data3d';

/** Distinct colours for up to 10 clusters (colour-blind-friendly first). */
export const CLUSTER_COLORS = ['#4f9dff', '#ff6b6b', '#3ccf91', '#ffb547', '#b07cff', '#36d6e7', '#ff7ac6', '#c7d36f', '#ff9f5a', '#9aa7c7'];
export const UNASSIGNED = '#6b7591';

const tmp = new THREE.Object3D();
const col = new THREE.Color();

export function Points({ points, colors, radius = 0.07 }: { points: Vec3[]; colors: string[]; radius?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    points.forEach((p, i) => {
      tmp.position.set(p[0], p[1], p[2]);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
      mesh.setColorAt(i, col.set(colors[i] ?? UNASSIGNED));
    });
    mesh.count = points.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [points, colors]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 1000]}>
      <sphereGeometry args={[radius, 12, 10]} />
      <meshStandardMaterial roughness={0.4} />
    </instancedMesh>
  );
}

/** Wireframe cube marking the data space. */
function Bounds({ size }: { size: number }) {
  return (
    <lineSegments>
      <edgesGeometry args={[new THREE.BoxGeometry(size, size, size)]} />
      <lineBasicMaterial color="#2a3248" />
    </lineSegments>
  );
}

export function PointCloudScene({ children, bounds = 7, camera = [7, 5, 8] }: { children: ReactNode; bounds?: number; camera?: Vec3 }) {
  return (
    <Canvas camera={{ position: camera, fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={['#0f1320']} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 10, 6]} intensity={1.1} />
      <Bounds size={bounds} />
      {children}
      <OrbitControls enableDamping makeDefault autoRotate autoRotateSpeed={0.4} minDistance={3} maxDistance={25} />
    </Canvas>
  );
}
