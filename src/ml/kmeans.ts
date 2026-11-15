import { createRng } from './random';
import { dist2, type Vec3 } from './data3d';

export type KmeansInit = 'random' | 'plusplus';

export interface KmeansState {
  centroids: Vec3[];
  assignment: number[]; // -1 until the first assignment step
  iteration: number;
  /** Which half-step comes next. */
  phase: 'assign' | 'update';
  converged: boolean;
}

export function initKmeans(points: Vec3[], k: number, init: KmeansInit, seed: number): KmeansState {
  const rng = createRng(seed);
  const centroids: Vec3[] = [];
  if (init === 'random' || points.length === 0) {
    const used = new Set<number>();
    while (centroids.length < Math.min(k, points.length)) {
      const i = Math.floor(rng() * points.length);
      if (used.has(i)) continue;
      used.add(i);
      centroids.push([...points[i]] as Vec3);
    }
  } else {
    // k-means++: spread the starting centres out, proportional to squared distance
    centroids.push([...points[Math.floor(rng() * points.length)]] as Vec3);
    while (centroids.length < Math.min(k, points.length)) {
      const d = points.map((p) => Math.min(...centroids.map((c) => dist2(p, c))));
      const total = d.reduce((a, b) => a + b, 0);
      let r = rng() * total;
      let idx = 0;
      for (; idx < d.length - 1; idx++) {
        r -= d[idx];
        if (r <= 0) break;
      }
      centroids.push([...points[idx]] as Vec3);
    }
  }
  return { centroids, assignment: points.map(() => -1), iteration: 0, phase: 'assign', converged: false };
}

/** One half-step: either assign every point to its nearest centroid, or move centroids to their cluster means. */
export function kmeansHalfStep(points: Vec3[], s: KmeansState): KmeansState {
  if (s.converged) return s;
  if (s.phase === 'assign') {
    let changed = false;
    const assignment = points.map((p, i) => {
      let best = 0;
      let bd = Infinity;
      s.centroids.forEach((c, j) => {
        const d = dist2(p, c);
        if (d < bd) {
          bd = d;
          best = j;
        }
      });
      if (best !== s.assignment[i]) changed = true;
      return best;
    });
    return { ...s, assignment, phase: 'update', converged: !changed && s.iteration > 0 };
  }
  const sums = s.centroids.map(() => [0, 0, 0, 0]);
  points.forEach((p, i) => {
    const a = sums[s.assignment[i]];
    a[0] += p[0];
    a[1] += p[1];
    a[2] += p[2];
    a[3]++;
  });
  const centroids = s.centroids.map((c, j) => (sums[j][3] ? ([sums[j][0] / sums[j][3], sums[j][1] / sums[j][3], sums[j][2] / sums[j][3]] as Vec3) : c));
  return { ...s, centroids, phase: 'assign', iteration: s.iteration + 1 };
}

/** Sum of squared distances from points to their assigned centroid (lower is tighter). */
export function inertia(points: Vec3[], s: KmeansState): number {
  let sum = 0;
  points.forEach((p, i) => {
    const a = s.assignment[i];
    if (a >= 0) sum += dist2(p, s.centroids[a]);
  });
  return sum;
}
