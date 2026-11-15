import { AdaptiveFov } from '../../components/AdaptiveFov';
import { useMemo } from 'react';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Segments } from '../../components/ClassificationScene';
import { TextSprite } from '../../components/TextSprite';
import { displayPos, mixedPos, type Token } from '../../ml/attention';

const ACCENT = '#b07cff';
const SPACING = 1.5;

function Arc({ from, to, weight }: { from: number; to: number; weight: number }) {
  const geometry = useMemo(() => {
    const a = new THREE.Vector3(from, 0.3, -0.25);
    const b = new THREE.Vector3(to, 0.3, -0.25);
    const h = 1 + Math.abs(to - from) * 0.4;
    const curve = new THREE.QuadraticBezierCurve3(a, new THREE.Vector3((from + to) / 2, h, -0.8), b);
    return new THREE.TubeGeometry(curve, 40, 0.015 + 0.11 * weight, 8, false);
  }, [from, to, weight]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.3 + weight} transparent opacity={0.15 + 0.85 * weight} />
    </mesh>
  );
}

function ArcsView({ tokens, weights, selected, onSelect }: { tokens: Token[]; weights: number[]; selected: number; onSelect: (i: number) => void }) {
  const n = tokens.length;
  const x = (j: number) => (j - (n - 1) / 2) * SPACING;
  return (
    <group>
      {tokens.map((t, j) => (
        <group key={j}>
          <mesh
            position={[x(j), 0.15, 0]}
            onClick={(e: ThreeEvent<MouseEvent>) => {
              e.stopPropagation();
              onSelect(j);
            }}
          >
            <boxGeometry args={[1.25, 0.3, 0.6]} />
            <meshStandardMaterial color={j === selected ? ACCENT : '#2a3248'} emissive={j === selected ? ACCENT : '#000000'} emissiveIntensity={0.3} />
          </mesh>
          <TextSprite text={t.text} position={[x(j), 0.6, 0]} size={0.3} color={j === selected ? '#ffffff' : '#c3cbe0'} />
          {/* weight bar in front of each token */}
          <mesh position={[x(j), 0.02 + weights[j] * 1.2, 1.6]}>
            <boxGeometry args={[0.5, 0.04 + weights[j] * 2.4, 0.5]} />
            <meshStandardMaterial color={ACCENT} transparent opacity={0.35 + 0.65 * weights[j]} />
          </mesh>
          {weights[j] >= 0.05 && (
            <TextSprite text={`${Math.round(weights[j] * 100)}%`} position={[x(j), 0.3 + weights[j] * 2.4, 1.6]} size={0.24} color="#e6d7ff" />
          )}
          {j !== selected && weights[j] > 0.005 && <Arc from={x(selected)} to={x(j)} weight={weights[j]} />}
        </group>
      ))}
    </group>
  );
}

function SpaceView({ tokens, weights, selected, axisLabels }: { tokens: Token[]; weights: number[]; selected: number; axisLabels: string[] }) {
  const mixed = mixedPos(tokens, weights);
  const original = displayPos(tokens[selected]);
  return (
    <group>
      <gridHelper args={[7, 14, '#2a3248', '#1c2335']} position={[0, -0.6, 0]} />
      {tokens.map((t, j) => {
        const p = displayPos(t);
        return (
          <group key={j}>
            <mesh position={p}>
              <sphereGeometry args={[0.1 + 0.12 * weights[j], 20, 14]} />
              <meshStandardMaterial color={j === selected ? '#ffffff' : '#9aa7c7'} />
            </mesh>
            <TextSprite text={t.text} position={[p[0], p[1] + 0.32, p[2]]} size={0.26} />
            {weights[j] > 0.01 && <Segments points={[mixed, p]} color={ACCENT} opacity={Math.min(1, 0.15 + weights[j])} />}
          </group>
        );
      })}
      <Segments points={[original, mixed]} color="#ffd166" opacity={1} />
      <mesh position={mixed}>
        <octahedronGeometry args={[0.22]} />
        <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.6} />
      </mesh>
      <TextSprite text={axisLabels[0]} position={[3.4, -0.6, 0]} size={0.24} color="#6b7591" />
      <TextSprite text={axisLabels[1]} position={[0, 2.9, 0]} size={0.24} color="#6b7591" />
      <TextSprite text={axisLabels[2]} position={[0, -0.6, 3.4]} size={0.24} color="#6b7591" />
    </group>
  );
}

interface Props {
  view: 'arcs' | 'space';
  tokens: Token[];
  weights: number[];
  selected: number;
  onSelect: (i: number) => void;
  axisLabels: string[];
}

export function AttentionScene({ view, tokens, weights, selected, onSelect, axisLabels }: Props) {
  const wide = tokens.length * SPACING;
  return (
    <Canvas camera={view === 'arcs' ? { position: [-0.6, 7, wide * 0.62 + 4], fov: 45 } : { position: [5, 3.5, 6], fov: 45 }} dpr={[1, 2]} key={view}>
      <color attach="background" args={['#0f1320']} />
      <AdaptiveFov />
      <ambientLight intensity={0.75} />
      <directionalLight position={[3, 8, 5]} intensity={1.1} />
      {view === 'arcs' ? (
        <ArcsView tokens={tokens} weights={weights} selected={selected} onSelect={onSelect} />
      ) : (
        <SpaceView tokens={tokens} weights={weights} selected={selected} axisLabels={axisLabels} />
      )}
      <OrbitControls enableDamping makeDefault target={view === 'arcs' ? [-0.6, 0.2, 0.3] : [0, 0.6, 0]} minDistance={3} maxDistance={30} />
    </Canvas>
  );
}
