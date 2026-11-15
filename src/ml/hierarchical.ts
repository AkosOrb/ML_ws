import { dist2, type Vec3 } from './data3d';

export type Linkage = 'single' | 'complete' | 'average';

export interface Merge {
  a: number; // cluster ids (0..n-1 are points, n+i is the cluster formed by merge i)
  b: number;
  height: number; // linkage distance at which they merged
  size: number;
}

/** Naive O(n³) agglomerative clustering; fine for up to ~150 points. */
export function agglomerate(points: Vec3[], linkage: Linkage): Merge[] {
  const n = points.length;
  const D: number[][] = points.map((p) => points.map((q) => Math.sqrt(dist2(p, q))));
  // active clusters: id → member indices
  const active = new Map<number, number[]>();
  points.forEach((_, i) => active.set(i, [i]));
  const merges: Merge[] = [];
  const link = (A: number[], B: number[]) => {
    let best = linkage === 'single' ? Infinity : linkage === 'complete' ? -Infinity : 0;
    for (const i of A) {
      for (const j of B) {
        const d = D[i][j];
        if (linkage === 'single') best = Math.min(best, d);
        else if (linkage === 'complete') best = Math.max(best, d);
        else best += d;
      }
    }
    return linkage === 'average' ? best / (A.length * B.length) : best;
  };
  let nextId = n;
  while (active.size > 1) {
    const ids = [...active.keys()];
    let bi = -1;
    let bj = -1;
    let bd = Infinity;
    for (let x = 0; x < ids.length; x++) {
      for (let y = x + 1; y < ids.length; y++) {
        const d = link(active.get(ids[x])!, active.get(ids[y])!);
        if (d < bd) {
          bd = d;
          bi = ids[x];
          bj = ids[y];
        }
      }
    }
    const members = [...active.get(bi)!, ...active.get(bj)!];
    active.delete(bi);
    active.delete(bj);
    active.set(nextId, members);
    merges.push({ a: bi, b: bj, height: bd, size: members.length });
    nextId++;
  }
  return merges;
}

/** Cluster label per point after applying the first `steps` merges (n − steps clusters remain). */
export function labelsAfter(n: number, merges: Merge[], steps: number): number[] {
  const parent = Array.from({ length: n + merges.length }, (_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  for (let s = 0; s < Math.min(steps, merges.length); s++) {
    const id = n + s;
    parent[find(merges[s].a)] = id;
    parent[find(merges[s].b)] = id;
  }
  // renumber roots to 0..k-1 in order of first appearance
  const map = new Map<number, number>();
  return Array.from({ length: n }, (_, i) => {
    const r = find(i);
    if (!map.has(r)) map.set(r, map.size);
    return map.get(r)!;
  });
}

/** Leaf order for drawing a dendrogram without crossings. */
export function leafOrder(n: number, merges: Merge[]): number[] {
  if (merges.length === 0) return Array.from({ length: n }, (_, i) => i);
  const walk = (id: number): number[] => (id < n ? [id] : [...walk(merges[id - n].a), ...walk(merges[id - n].b)]);
  return walk(n + merges.length - 1);
}
