import { useMemo } from 'react';
import * as THREE from 'three';
import { CLASS_COLORS, Segments } from '../../components/ClassificationScene';
import { PointCloudScene, Points } from '../../components/PointCloudScene';
import type { Vec3 } from '../../ml/data3d';
import { EXTENT, type Sample } from '../../ml/datasets';
import { mlpActivations, type Mlp } from '../../ml/mlp';

const S = 2.6; // scene units per activation unit (tanh lives in [-1, 1])
const GRID_LINES = 13;
const GRID_SAMPLES = 40;

/** Where a 2D input point sits after `layer` layers (fractional = in between). */
function embed(acts: Float64Array[], layer: number): Vec3 {
  const at = (l: number): Vec3 => {
    if (l === 0) return [(acts[0][0] / EXTENT) * S, 0, (acts[0][1] / EXTENT) * S];
    const a = acts[l];
    return [a[0] * S, (a[2] ?? 0) * S, (a[1] ?? 0) * S];
  };
  const lo = Math.floor(layer);
  const hi = Math.min(Math.ceil(layer), acts.length - 2);
  const t = layer - lo;
  const p = at(lo);
  if (t === 0 || lo === hi) return p;
  const q = at(hi);
  return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
}

/** The output neuron's decision plane w·h + b = 0, drawn in the last hidden layer's space. */
function DecisionPlane({ model }: { model: Mlp }) {
  const L = model.W.length - 1;
  const w = model.W[L];
  const b = model.B[L][0];
  const geometry = useMemo(() => {
    // scene coords: x = h0, y = h2, z = h1
    const n = new THREE.Vector3(w[0], w[2] ?? 0, w[1] ?? 0);
    const len = n.length() || 1;
    n.divideScalar(len);
    const centre = n.clone().multiplyScalar((-b / len) * S);
    const u = new THREE.Vector3(1, 0, 0).cross(n);
    if (u.lengthSq() < 1e-6) u.set(0, 1, 0).cross(n);
    u.normalize();
    const v = n.clone().cross(u).normalize();
    const R = S * 1.25;
    const corner = (a: number, c: number) => centre.clone().addScaledVector(u, a * R).addScaledVector(v, c * R).toArray();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...corner(-1, -1), ...corner(1, -1), ...corner(1, 1), ...corner(-1, 1)]), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    return g;
  }, [w, b]);
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color="#e8ecf6" transparent opacity={0.1} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

interface Props {
  model: Mlp;
  data: Sample[];
  layer: number;
  showGrid: boolean;
  showPlane: boolean;
  version: number;
}

export function LayerSpaceScene({ model, data, layer, showGrid, showPlane, version }: Props) {
  const points = useMemo(() => data.map((d) => embed(mlpActivations(model, d.x1, d.x2), layer)), [model, data, layer, version]); // eslint-disable-line react-hooks/exhaustive-deps
  const colors = useMemo(() => data.map((d) => CLASS_COLORS[d.label]), [data]);

  const grid = useMemo(() => {
    if (!showGrid) return [];
    const segs: Vec3[] = [];
    for (let i = 0; i < GRID_LINES; i++) {
      const c = -EXTENT + (2 * EXTENT * i) / (GRID_LINES - 1);
      for (const vertical of [true, false]) {
        let prev: Vec3 | null = null;
        for (let j = 0; j <= GRID_SAMPLES; j++) {
          const t = -EXTENT + (2 * EXTENT * j) / GRID_SAMPLES;
          const [x1, x2] = vertical ? [c, t] : [t, c];
          const p = embed(mlpActivations(model, x1, x2), layer);
          if (prev) segs.push(prev, p);
          prev = p;
        }
      }
    }
    return segs;
  }, [model, layer, showGrid, version]); // eslint-disable-line react-hooks/exhaustive-deps

  const lastHidden = model.sizes.length - 2;
  return (
    <PointCloudScene bounds={S * 2.2} camera={[6.5, 5, 7.5]}>
      {grid.length > 0 && <Segments points={grid} color="#9aa7c7" opacity={0.22} />}
      <Points points={points} colors={colors} radius={0.08} />
      {showPlane && layer > lastHidden - 0.05 && lastHidden > 0 && <DecisionPlane model={model} />}
    </PointCloudScene>
  );
}
