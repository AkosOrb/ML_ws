import type { Sample } from './datasets';

export type Metric = 'euclidean' | 'manhattan';

/** Indices of the k nearest samples to (x1, x2). */
export function nearest(data: Sample[], x1: number, x2: number, k: number, metric: Metric = 'euclidean'): number[] {
  const dist = data.map((d, i) => {
    const a = d.x1 - x1;
    const b = d.x2 - x2;
    return { i, d: metric === 'euclidean' ? a * a + b * b : Math.abs(a) + Math.abs(b) };
  });
  dist.sort((p, q) => p.d - q.d);
  return dist.slice(0, Math.min(k, data.length)).map((e) => e.i);
}

/** Share of class-1 samples among the k nearest neighbours. */
export function knnProba(data: Sample[], x1: number, x2: number, k: number, metric: Metric = 'euclidean'): number {
  const idx = nearest(data, x1, x2, k, metric);
  if (idx.length === 0) return 0.5;
  let ones = 0;
  for (const i of idx) ones += data[i].label;
  return ones / idx.length;
}
