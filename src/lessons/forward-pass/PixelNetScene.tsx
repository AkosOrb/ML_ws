import { useLayoutEffect, useMemo, useRef } from 'react';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { AdaptiveFov } from '../../components/AdaptiveFov';
import { TextSprite } from '../../components/TextSprite';
import { GRID, pixelForward, type PixelNet } from '../../ml/pixelNet';

type V3 = [number, number, number];

const CELL = 0.42;
const INPUT_X = -6.2;
const OUT_X = 5.2;
const BAR_LEN = 3;
const POS = new THREE.Color('#e8553a');
const NEG = new THREE.Color('#4f9dff');
const BG = new THREE.Color('#1c1c1c');
const DARK = new THREE.Color('#2b2b2b');
const LIT = new THREE.Color('#e8553a');
const PAPER = new THREE.Color('#f3f1ec');
const MARK = new THREE.Color('#ffd166');

const tmp = new THREE.Object3D();
const col = new THREE.Color();

/** Where each neuron of each layer sits in the scene. */
function layout(sizes: number[]): V3[][] {
  const L = sizes.length - 1;
  return sizes.map((n, l) => {
    if (l === 0)
      return Array.from({ length: n }, (_, i): V3 => [INPUT_X + ((i % GRID) - (GRID - 1) / 2) * CELL, ((GRID - 1) / 2 - Math.floor(i / GRID)) * CELL, 0]);
    const x = l === L ? OUT_X : -2.4 + ((l - 1) * 4.8) / Math.max(1, L - 2);
    const gap = l === L ? 1.0 : Math.min(0.62, 6.4 / Math.max(1, n - 1));
    return Array.from({ length: n }, (_, i): V3 => [x, ((n - 1) / 2 - i) * gap, 0]);
  });
}

/** Line segments with one colour per segment (brightness stands in for opacity on the dark background). */
function ColoredLines({ segs }: { segs: { a: V3; b: V3; c: THREE.Color }[] }) {
  const geometry = useMemo(() => new THREE.BufferGeometry(), []);
  useLayoutEffect(() => {
    const pos = new Float32Array(segs.length * 6);
    const cs = new Float32Array(segs.length * 6);
    segs.forEach((s, k) => {
      pos.set([...s.a, ...s.b], k * 6);
      cs.set([s.c.r, s.c.g, s.c.b, s.c.r, s.c.g, s.c.b], k * 6);
    });
    geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(cs, 3));
    geometry.computeBoundingSphere();
  }, [geometry, segs]);
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial vertexColors />
    </lineSegments>
  );
}

function InputPixels({ x, pos, marked }: { x: Float64Array; pos: V3[]; marked?: Set<number> }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    x.forEach((v, i) => {
      const d = 0.06 + v * 0.34;
      tmp.position.set(pos[i][0], pos[i][1], d / 2 - 0.2);
      tmp.scale.set(1, 1, d);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
      mesh.setColorAt(i, marked?.has(i) ? MARK : v ? PAPER : DARK);
    });
    mesh.count = x.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [x, pos, marked]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, GRID * GRID]}>
      <boxGeometry args={[CELL * 0.9, CELL * 0.9, 1]} />
      <meshStandardMaterial roughness={0.6} />
    </instancedMesh>
  );
}

interface Props {
  net: PixelNet;
  input: Float64Array;
  /** How far the signal has travelled: 0 = only the input, number of weight layers = all the way to the output. */
  phase: number;
  classNames: string[];
  layerNames: string[];
  selected?: number;
  onSelect?: (i: number) => void;
  marked?: Set<number>;
}

/**
 * The whole network in 3D: the input image on the left, hidden neurons in the
 * middle (bigger and brighter = more active), output probabilities on the right.
 * Lines show the strongest contributions w·a: orange pushes up, blue pushes down.
 */
export function PixelNetScene({ net, input, phase, classNames, layerNames, selected, onSelect, marked }: Props) {
  const outs = useMemo(() => pixelForward(net, input), [net, input]);
  const pos = useMemo(() => layout(net.sizes), [net.sizes]);
  const L = net.sizes.length - 1;
  const reach = (l: number) => Math.min(1, Math.max(0, phase - l)); // progress of weight layer l

  const segs = useMemo(() => {
    const out: { a: V3; b: V3; c: THREE.Color }[] = [];
    for (let l = 0; l < L; l++) {
      const f = reach(l);
      if (f <= 0) continue;
      const nIn = net.sizes[l];
      const all: { i: number; o: number; v: number }[] = [];
      for (let o = 0; o < net.sizes[l + 1]; o++)
        for (let i = 0; i < nIn; i++) {
          const v = net.W[l][o * nIn + i] * outs[l][i];
          if (v !== 0) all.push({ i, o, v });
        }
      all.sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
      const top = all.slice(0, l === 0 ? 90 : 70);
      const max = Math.abs(top[0]?.v ?? 1) || 1;
      for (const e of top) {
        const a = pos[l][e.i];
        const b = pos[l + 1][e.o];
        const end: V3 = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
        const k = 0.15 + 0.85 * Math.abs(e.v) / max;
        out.push({ a, b: end, c: BG.clone().lerp(e.v > 0 ? POS : NEG, k) });
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [net, outs, pos, phase, L]);

  return (
    <Canvas camera={{ position: [1.2, 1.2, 15.5], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={['#1c1c1c']} />
      <AdaptiveFov />
      <ambientLight intensity={0.75} />
      <directionalLight position={[2, 6, 10]} intensity={1.1} />

      <InputPixels x={input} pos={pos[0]} marked={marked} />
      <ColoredLines segs={segs} />

      {pos.slice(1).map((layer, li) => {
        const l = li + 1;
        const vals = outs[l];
        const lit = reach(l - 1) >= 1;
        const isOut = l === L;
        const max = Math.max(1e-6, ...Array.from(vals));
        return layer.map((p, i) => {
          const v = lit ? (isOut ? vals[i] : vals[i] / max) : 0;
          const r = 0.16 + 0.14 * v;
          return (
            <group key={`${l}-${i}`}>
              <mesh
                position={p}
                onClick={
                  l === 1 && onSelect
                    ? (e: ThreeEvent<MouseEvent>) => {
                        e.stopPropagation();
                        onSelect(i);
                      }
                    : undefined
                }
              >
                <sphereGeometry args={[r, 20, 14]} />
                <meshStandardMaterial color={col.copy(DARK).lerp(LIT, v).getStyle()} emissive={LIT} emissiveIntensity={v * 0.35} roughness={0.4} />
              </mesh>
              {l === 1 && selected === i && (
                <mesh position={p}>
                  <torusGeometry args={[0.36, 0.035, 8, 32]} />
                  <meshBasicMaterial color="#ffd166" />
                </mesh>
              )}
              {isOut && (
                <>
                  <mesh position={[p[0] + 0.45 + (BAR_LEN * v) / 2, p[1], 0]}>
                    <boxGeometry args={[Math.max(0.02, BAR_LEN * v), 0.22, 0.22]} />
                    <meshStandardMaterial color={v >= 0.5 ? '#e8553a' : '#8a8a8a'} roughness={0.5} />
                  </mesh>
                  <TextSprite
                    text={`${classNames[i]}${lit ? ` ${Math.round(vals[i] * 100)}%` : ''}`}
                    position={[p[0] + 0.45 + BAR_LEN / 2, p[1] + 0.34, 0]}
                    size={0.26}
                    color={lit && v >= 0.5 ? '#f3f1ec' : '#a8a8a8'}
                  />
                </>
              )}
            </group>
          );
        });
      })}

      {layerNames.map((name, l) => {
        const top = l === 0 ? (GRID / 2) * CELL : pos[l][0][1] + 0.45;
        const x = l === 0 ? INPUT_X : l === L ? OUT_X + 1.6 : pos[l][0][0];
        return <TextSprite key={l} text={name} position={[x, Math.max(top, 1.7) + 0.5, 0]} size={0.27} color="#d4d4d4" />;
      })}
      <OrbitControls enableDamping makeDefault target={[0.2, 1, 0]} minDistance={5} maxDistance={30} />
    </Canvas>
  );
}

/** The 7×7 input weights of one first-layer neuron: what pattern makes it fire. */
export function WeightMap({ net, neuron, label }: { net: PixelNet; neuron: number; label: string }) {
  const w = net.W[0].subarray(neuron * GRID * GRID, (neuron + 1) * GRID * GRID);
  const max = Math.max(1e-6, ...Array.from(w, Math.abs));
  const cell = 14;
  return (
    <svg className="weight-map" viewBox={`0 0 ${GRID * cell} ${GRID * cell}`} role="img" aria-label={label}>
      {Array.from(w, (v, i) => (
        <rect
          key={i}
          x={(i % GRID) * cell}
          y={Math.floor(i / GRID) * cell}
          width={cell - 1}
          height={cell - 1}
          fill={col.copy(DARK).lerp(v > 0 ? POS : NEG, Math.abs(v) / max).getStyle()}
        />
      ))}
    </svg>
  );
}
