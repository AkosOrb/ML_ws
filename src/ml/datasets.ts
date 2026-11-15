import { createRng, gaussian } from './random';

/** A labelled 2D sample for binary classification (label 0 or 1). */
export interface Sample {
  x1: number;
  x2: number;
  label: 0 | 1;
}

export type DatasetKind = 'blobs' | 'xor' | 'circles' | 'moons';
export const DATASET_KINDS: DatasetKind[] = ['blobs', 'xor', 'circles', 'moons'];
export const EXTENT = 3; // features live roughly in [-EXTENT, EXTENT]

const clampX = (v: number) => Math.max(-EXTENT, Math.min(EXTENT, v));

export function makeDataset(kind: DatasetKind, count: number, noise: number, seed: number): Sample[] {
  const rng = createRng(seed);
  const out: Sample[] = [];
  for (let i = 0; i < count; i++) {
    const label = (i % 2) as 0 | 1;
    let x1 = 0;
    let x2 = 0;
    switch (kind) {
      case 'blobs': {
        const c = label ? 1.3 : -1.3;
        x1 = c + gaussian(rng) * (0.6 + noise);
        x2 = c + gaussian(rng) * (0.6 + noise);
        break;
      }
      case 'xor': {
        x1 = (rng() * 2 - 1) * 2.7;
        x2 = (rng() * 2 - 1) * 2.7;
        // pick a quadrant matching the label: same sign → 0, opposite → 1
        if ((x1 * x2 > 0) !== (label === 0)) x2 = -x2;
        x1 += gaussian(rng) * noise;
        x2 += gaussian(rng) * noise;
        break;
      }
      case 'circles': {
        const r = (label ? 2.4 : 1.0) + gaussian(rng) * (0.15 + noise * 0.6);
        const a = rng() * Math.PI * 2;
        x1 = r * Math.cos(a);
        x2 = r * Math.sin(a);
        break;
      }
      case 'moons': {
        const a = rng() * Math.PI;
        if (label === 0) {
          x1 = Math.cos(a) * 1.8 - 0.9;
          x2 = Math.sin(a) * 1.8 - 0.5;
        } else {
          x1 = 0.9 - Math.cos(a) * 1.8;
          x2 = 0.5 - Math.sin(a) * 1.8;
        }
        x1 += gaussian(rng) * (0.1 + noise * 0.6);
        x2 += gaussian(rng) * (0.1 + noise * 0.6);
        break;
      }
    }
    out.push({ x1: clampX(x1), x2: clampX(x2), label });
  }
  return out;
}

/** Fraction of samples whose predicted probability lands on the right side of 0.5. */
export function accuracy(data: Sample[], proba: (x1: number, x2: number) => number): number {
  if (data.length === 0) return 0;
  let ok = 0;
  for (const d of data) if ((proba(d.x1, d.x2) >= 0.5 ? 1 : 0) === d.label) ok++;
  return ok / data.length;
}
