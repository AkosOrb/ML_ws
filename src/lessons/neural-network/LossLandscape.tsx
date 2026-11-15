import { useLayoutEffect, useMemo } from 'react';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Segments } from '../../components/ClassificationScene';
import { E, landscape, LANDSCAPE_MAX, LANDSCAPE_MIN, type Ball } from '../../ml/landscape';



const RES = 80;

function Terrain({ onPick }: { onPick: (x: number, z: number) => void }) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(E * 2, E * 2, RES, RES);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    // low loss = deep blue, middle = teal, high loss = warm yellow
    const stops = [new THREE.Color('#0b1d5c'), new THREE.Color('#1f8f8a'), new THREE.Color('#f4d35e')];
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const v = landscape(pos.getX(i), pos.getZ(i));
      pos.setY(i, v);
      const t = (v - LANDSCAPE_MIN) / (LANDSCAPE_MAX - LANDSCAPE_MIN);
      if (t < 0.5) c.copy(stops[0]).lerp(stops[1], t * 2);
      else c.copy(stops[1]).lerp(stops[2], (t - 0.5) * 2);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh
      geometry={geometry}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        if (e.delta > 4) return;
        e.stopPropagation();
        onPick(e.point.x, e.point.z);
      }}
    >
      <meshStandardMaterial vertexColors roughness={0.7} side={THREE.DoubleSide} />
    </mesh>
  );
}

export function LossLandscapeScene({ ball, trail, onPick }: { ball: Ball; trail: [number, number][]; onPick: (x: number, z: number) => void }) {
  const trailPts = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 1; i < trail.length; i++) {
      const [ax, az] = trail[i - 1];
      const [bx, bz] = trail[i];
      pts.push([ax, landscape(ax, az) + 0.03, az], [bx, landscape(bx, bz) + 0.03, bz]);
    }
    return pts;
  }, [trail]);

  return (
    <Canvas camera={{ position: [-5.5, 7, -6.5], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={['#0f1320']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 10, 3]} intensity={1.3} />
      <Terrain onPick={onPick} />
      {trailPts.length > 0 && <Segments points={trailPts} color="#ffffff" />}
      <mesh position={[ball.x, landscape(ball.x, ball.z) + 0.15, ball.z]}>
        <sphereGeometry args={[0.15, 24, 16]} />
        <meshStandardMaterial color="#ff6b6b" emissive="#ff6b6b" emissiveIntensity={0.3} />
      </mesh>
      <OrbitControls enableDamping makeDefault target={[0, 0.6, 0]} minDistance={4} maxDistance={20} />
    </Canvas>
  );
}
