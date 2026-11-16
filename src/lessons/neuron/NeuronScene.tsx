import { useLayoutEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { AdaptiveFov } from '../../components/AdaptiveFov';
import { Segments } from '../../components/ClassificationScene';
import { TextSprite } from '../../components/TextSprite';
import { localizeNumbers, useLang } from '../../i18n/i18n';
import { activate, gateData, type Gate, type NeuronActivation, type TwoInputNeuron } from '../../ml/neuron';

type V3 = [number, number, number];
const POS = '#e8553a';
const NEG = '#4f9dff';
const DARK = new THREE.Color('#2b2b2b');
const LIT = new THREE.Color('#e8553a');
const up = new THREE.Vector3(0, 1, 0);

/** A cylinder from a to b: used for the weighted connections (thicker = bigger weight). */
function Rod({ a, b, radius, color }: { a: V3; b: V3; radius: number; color: string }) {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const dir = vb.clone().sub(va);
    return {
      pos: va.clone().add(vb).multiplyScalar(0.5),
      quat: new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize()),
      len: dir.length(),
    };
  }, [a, b]);
  return (
    <mesh position={pos} quaternion={quat}>
      <cylinderGeometry args={[radius, radius, len, 12]} />
      <meshStandardMaterial color={color} roughness={0.5} />
    </mesh>
  );
}

const fmt = (v: number, lang: 'hu' | 'en') => localizeNumbers(v.toFixed(2), lang);

/* ------------------------------------------------------------------ */
/* View 1: one neuron, from inputs through the weighted sum to the output */
/* ------------------------------------------------------------------ */

const PLOT_X0 = 1.4;
const PLOT_W = 4.2;
const Z_RANGE = 5; // the plot shows z from −5 to 5
const PLOT_Y0 = -1.2;
const PLOT_H = 2.4; // f(z) = 1 is this high

const plotX = (z: number) => PLOT_X0 + ((Math.max(-Z_RANGE, Math.min(Z_RANGE, z)) + Z_RANGE) / (2 * Z_RANGE)) * PLOT_W;
const plotY = (f: number) => PLOT_Y0 + Math.max(-0.6, Math.min(1.6, f)) * PLOT_H;

export function NeuronInsideScene({ x, w, b, act, labels }: { x: number[]; w: number[]; b: number; act: NeuronActivation; labels: { sum: string; out: string } }) {
  const { lang } = useLang();
  const z = x.reduce((s, xi, i) => s + xi * w[i], b);
  const y = activate(act, z);
  const inPos: V3[] = x.map((_, i) => [-5.6, (1 - i) * 1.8, 0]);
  const sumPos: V3 = [-1.2, 0, 0];
  const outPos: V3 = [7.2, 0, 0];

  const curve = useMemo(() => {
    const pts: V3[] = [];
    for (let k = 0; k < 120; k++) {
      const z0 = -Z_RANGE + (k / 120) * 2 * Z_RANGE;
      const z1 = -Z_RANGE + ((k + 1) / 120) * 2 * Z_RANGE;
      pts.push([plotX(z0), plotY(activate(act, z0)), 0], [plotX(z1), plotY(activate(act, z1)), 0]);
    }
    return pts;
  }, [act]);

  const axes: V3[] = [
    [PLOT_X0, PLOT_Y0, 0], [PLOT_X0 + PLOT_W, PLOT_Y0, 0], // f = 0
    [plotX(0), PLOT_Y0 - 0.6 * PLOT_H, 0], [plotX(0), PLOT_Y0 + 1.6 * PLOT_H, 0], // z = 0
  ];
  const marker: V3 = [plotX(z), plotY(y), 0];
  const guides: V3[] = [
    [marker[0], PLOT_Y0, 0], marker,
    marker, [PLOT_X0 + PLOT_W + 0.2, marker[1], 0],
  ];
  const yNorm = act === 'linear' || act === 'relu' ? Math.min(1, Math.abs(y) / 3) : Math.abs(y);

  return (
    <Canvas camera={{ position: [0.6, 1.2, 13.5], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={['#1c1c1c']} />
      <AdaptiveFov />
      <ambientLight intensity={0.75} />
      <directionalLight position={[2, 6, 10]} intensity={1.1} />

      {inPos.map((p, i) => (
        <group key={i}>
          <mesh position={p}>
            <sphereGeometry args={[0.32, 24, 16]} />
            <meshStandardMaterial color={new THREE.Color().copy(DARK).lerp(new THREE.Color('#f3f1ec'), Math.min(1, Math.abs(x[i]))).getStyle()} roughness={0.4} />
          </mesh>
          <TextSprite text={`x${'₁₂₃'[i]} = ${fmt(x[i], lang)}`} position={[p[0] - 1.25, p[1], 0]} size={0.28} />
          <Rod a={p} b={sumPos} radius={0.02 + Math.min(0.12, Math.abs(w[i]) * 0.04)} color={w[i] >= 0 ? POS : NEG} />
          <TextSprite
            text={`w${'₁₂₃'[i]} = ${fmt(w[i], lang)}  →  ${fmt(w[i] * x[i], lang)}`}
            position={[p[0] + (sumPos[0] - p[0]) * 0.42, p[1] + (sumPos[1] - p[1]) * 0.42 + (p[1] < 0 ? -1 : 1) * (0.28 + Math.abs((sumPos[1] - p[1]) / (sumPos[0] - p[0])) * 1.2), 0]}
            size={0.22}
            color={w[i] >= 0 ? '#ff9a80' : '#8cc0ff'}
          />
        </group>
      ))}

      {/* bias: a constant input of 1 */}
      <Rod a={[-1.2, -2.2, 0]} b={sumPos} radius={0.02 + Math.min(0.12, Math.abs(b) * 0.04)} color={b >= 0 ? POS : NEG} />
      <TextSprite text={`b = ${fmt(b, lang)}`} position={[-1.2, -2.5, 0]} size={0.24} color={b >= 0 ? '#ff9a80' : '#8cc0ff'} />

      <mesh position={sumPos}>
        <sphereGeometry args={[0.55, 32, 20]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.4} />
      </mesh>
      <TextSprite text="Σ" position={[sumPos[0], 0.02, 0.6]} size={0.5} color="#f3f1ec" />
      <TextSprite text={`${labels.sum}: z = ${fmt(z, lang)}`} position={[sumPos[0] + 0.4, 1.35, 0]} size={0.24} />

      <Segments points={[[sumPos[0] + 0.55, 0, 0], [marker[0], PLOT_Y0, 0]]} color="#ffd166" opacity={0.6} />
      <Segments points={axes} color="#6a6a6a" opacity={1} />
      <Segments points={curve} color="#f3f1ec" opacity={1} />
      <Segments points={guides} color="#ffd166" opacity={0.9} />
      <mesh position={marker}>
        <sphereGeometry args={[0.13, 16, 12]} />
        <meshBasicMaterial color="#ffd166" />
      </mesh>
      <TextSprite text="z" position={[PLOT_X0 + PLOT_W + 0.25, PLOT_Y0, 0]} size={0.26} />
      <TextSprite text="f(z)" position={[plotX(0), PLOT_Y0 + 1.6 * PLOT_H + 0.3, 0]} size={0.26} />

      <mesh position={outPos}>
        <sphereGeometry args={[0.45, 32, 20]} />
        <meshStandardMaterial color={new THREE.Color().copy(DARK).lerp(LIT, yNorm).getStyle()} emissive={LIT} emissiveIntensity={yNorm * 0.4} roughness={0.4} />
      </mesh>
      <Segments points={[[PLOT_X0 + PLOT_W + 0.2, marker[1], 0], [outPos[0] - 0.45, 0, 0]]} color="#ffd166" opacity={0.6} />
      <TextSprite text={`${labels.out}: y = ${fmt(y, lang)}`} position={[outPos[0], 0.85, 0]} size={0.26} color="#f3f1ec" />

      <OrbitControls enableDamping makeDefault target={[0.8, 0.2, 0]} minDistance={5} maxDistance={30} />
    </Canvas>
  );
}

/* ------------------------------------------------------------------ */
/* View 2: a two-input neuron's output over the whole input plane       */
/* ------------------------------------------------------------------ */

const LO = -0.5;
const HI = 1.5;
const S = 4; // world size of the [LO, HI] square
const H = 2.2; // height for output 1
const toW = (v: number) => ((v - LO) / (HI - LO) - 0.5) * S;

function OutputSurface({ n }: { n: TwoInputNeuron }) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(S, S, 40, 40);
    g.rotateX(-Math.PI / 2);
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
    return g;
  }, []);
  useLayoutEffect(() => {
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const col = geometry.attributes.color as THREE.BufferAttribute;
    const c = new THREE.Color();
    const blue = new THREE.Color(NEG);
    const red = new THREE.Color(POS);
    const mid = new THREE.Color('#f3f1ec');
    for (let i = 0; i < pos.count; i++) {
      const a = (pos.getX(i) / S + 0.5) * (HI - LO) + LO;
      const b = (pos.getZ(i) / S + 0.5) * (HI - LO) + LO;
      const p = activate('sigmoid', n.w1 * a + n.w2 * b + n.b);
      pos.setY(i, p * H);
      if (p < 0.5) c.copy(blue).lerp(mid, Math.pow(p * 2, 3));
      else c.copy(red).lerp(mid, Math.pow((1 - p) * 2, 3));
      col.setXYZ(i, c.r, c.g, c.b);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    geometry.computeVertexNormals();
  }, [geometry, n]);
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors transparent opacity={0.8} side={THREE.DoubleSide} roughness={0.8} depthWrite={false} />
    </mesh>
  );
}

export function GateScene({ n, gate, labels }: { n: TwoInputNeuron; gate: Gate; labels: { x1: string; x2: string; height: string } }) {
  // the line where w1·x1 + w2·x2 + b = 0, clipped to the square
  const line = useMemo((): V3[] => {
    const pts: V3[] = [];
    if (Math.abs(n.w2) > 1e-6) {
      for (const a of [LO, HI]) {
        const b = -(n.w1 * a + n.b) / n.w2;
        pts.push([toW(a), 0.02, toW(Math.max(LO, Math.min(HI, b)))]);
      }
    } else if (Math.abs(n.w1) > 1e-6) {
      const a = -n.b / n.w1;
      pts.push([toW(a), 0.02, toW(LO)], [toW(a), 0.02, toW(HI)]);
    }
    return pts;
  }, [n]);
  const data = gateData(gate);
  return (
    <Canvas camera={{ position: [4.2, 4.4, 5.6], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={['#1c1c1c']} />
      <AdaptiveFov />
      <ambientLight intensity={0.75} />
      <directionalLight position={[4, 10, 6]} intensity={1.1} />
      <gridHelper args={[S, 8, '#4a4a4a', '#333333']} position={[0, -0.01, 0]} />
      <OutputSurface n={n} />
      {line.length === 2 && <Segments points={line} color="#ffd166" opacity={1} />}
      {data.map((d) => {
        const p = activate('sigmoid', n.w1 * d.x[0] + n.w2 * d.x[1] + n.b);
        const ok = (p >= 0.5 ? 1 : 0) === d.y;
        return (
          <group key={d.x.join()}>
            <mesh position={[toW(d.x[0]), d.y * H, toW(d.x[1])]}>
              <sphereGeometry args={[0.13, 20, 14]} />
              <meshStandardMaterial color={d.y ? POS : NEG} roughness={0.35} />
            </mesh>
            <mesh position={[toW(d.x[0]), d.y * H, toW(d.x[1])]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.2, 0.26, 28]} />
              <meshBasicMaterial color={ok ? '#3ccf91' : '#ffd166'} side={THREE.DoubleSide} />
            </mesh>
            <TextSprite text={`(${d.x[0]},${d.x[1]}) → ${d.y}`} position={[toW(d.x[0]), d.y * H + 0.4, toW(d.x[1])]} size={0.2} />
          </group>
        );
      })}
      <TextSprite text={labels.x1} position={[S / 2 + 0.4, 0, -S / 2]} />
      <TextSprite text={labels.x2} position={[-S / 2, 0, S / 2 + 0.4]} />
      <Segments points={[[-S / 2, 0, -S / 2], [-S / 2, H, -S / 2]]} color="#b3b3b3" />
      <TextSprite text={labels.height} position={[-S / 2, H + 0.35, -S / 2]} size={0.26} />
      <OrbitControls enableDamping makeDefault target={[0, 0.8, 0]} minDistance={3} maxDistance={20} />
    </Canvas>
  );
}
