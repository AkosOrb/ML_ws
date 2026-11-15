import { createRng, gaussian } from './random';

export type Vec3 = [number, number, number];

/** Gaussian blobs in 3D around random centres; returns points and their true blob index. */
export function makeBlobs3d(count: number, blobs: number, spread: number, seed: number): { points: Vec3[]; truth: number[] } {
  const rng = createRng(seed);
  const centres: Vec3[] = [];
  for (let b = 0; b < blobs; b++) {
    // keep centres apart a little by retrying a few times
    let best: Vec3 = [0, 0, 0];
    let bestDist = -1;
    for (let t = 0; t < 20; t++) {
      const c: Vec3 = [(rng() * 2 - 1) * 2.4, (rng() * 2 - 1) * 2.4, (rng() * 2 - 1) * 2.4];
      const d = Math.min(Infinity, ...centres.map((o) => dist2(o, c)));
      if (d > bestDist) {
        bestDist = d;
        best = c;
      }
    }
    centres.push(best);
  }
  const points: Vec3[] = [];
  const truth: number[] = [];
  for (let i = 0; i < count; i++) {
    const b = i % blobs;
    const c = centres[b];
    points.push([c[0] + gaussian(rng) * spread, c[1] + gaussian(rng) * spread, c[2] + gaussian(rng) * spread]);
    truth.push(b);
  }
  return { points, truth };
}

export function dist2(a: Vec3, b: Vec3): number {
  const x = a[0] - b[0];
  const y = a[1] - b[1];
  const z = a[2] - b[2];
  return x * x + y * y + z * z;
}
