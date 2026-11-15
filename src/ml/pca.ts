import { createRng, gaussian } from './random';
import type { Vec3 } from './data3d';

/** An elongated, tilted cloud: three independent scales, then rotated. */
export function makeEllipsoidCloud(count: number, scales: Vec3, tilt: number, seed: number): Vec3[] {
  const rng = createRng(seed);
  const ca = Math.cos(tilt);
  const sa = Math.sin(tilt);
  const cb = Math.cos(tilt * 0.6);
  const sb = Math.sin(tilt * 0.6);
  const pts: Vec3[] = [];
  for (let i = 0; i < count; i++) {
    const x = gaussian(rng) * scales[0];
    const y = gaussian(rng) * scales[1];
    const z = gaussian(rng) * scales[2];
    // rotate around Z by tilt, then around X by 0.6·tilt
    const x1 = ca * x - sa * y;
    const y1 = sa * x + ca * y;
    pts.push([x1, cb * y1 - sb * z, sb * y1 + cb * z]);
  }
  return pts;
}

export interface PcaResult {
  mean: Vec3;
  /** Unit principal axes, sorted by decreasing variance. */
  axes: Vec3[];
  variances: number[];
}

/** Eigen-decomposition of the 3×3 covariance matrix with the Jacobi method. */
export function pca(points: Vec3[]): PcaResult {
  const n = Math.max(1, points.length);
  const mean: Vec3 = [0, 0, 0];
  for (const p of points) for (let k = 0; k < 3; k++) mean[k] += p[k] / n;
  const C = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (const p of points) {
    const d = [p[0] - mean[0], p[1] - mean[1], p[2] - mean[2]];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i][j] += (d[i] * d[j]) / n;
  }
  const V = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const A = C.map((r) => [...r]);
  for (let sweep = 0; sweep < 50; sweep++) {
    let off = 0;
    for (let p = 0; p < 3; p++) for (let q = p + 1; q < 3; q++) off += A[p][q] * A[p][q];
    if (off < 1e-14) break;
    for (let p = 0; p < 3; p++) {
      for (let q = p + 1; q < 3; q++) {
        if (Math.abs(A[p][q]) < 1e-15) continue;
        const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < 3; k++) {
          const akp = A[k][p];
          const akq = A[k][q];
          A[k][p] = c * akp - s * akq;
          A[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < 3; k++) {
          const apk = A[p][k];
          const aqk = A[q][k];
          A[p][k] = c * apk - s * aqk;
          A[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < 3; k++) {
          const vkp = V[k][p];
          const vkq = V[k][q];
          V[k][p] = c * vkp - s * vkq;
          V[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }
  const order = [0, 1, 2].sort((a, b) => A[b][b] - A[a][a]);
  return {
    mean,
    axes: order.map((i) => [V[0][i], V[1][i], V[2][i]] as Vec3),
    variances: order.map((i) => Math.max(0, A[i][i])),
  };
}

/** Point moved a fraction `t` of the way onto the plane spanned by the first two axes. */
export function flatten(p: Vec3, r: PcaResult, t: number): Vec3 {
  const ax = r.axes[2];
  const d = (p[0] - r.mean[0]) * ax[0] + (p[1] - r.mean[1]) * ax[1] + (p[2] - r.mean[2]) * ax[2];
  return [p[0] - t * d * ax[0], p[1] - t * d * ax[1], p[2] - t * d * ax[2]];
}
