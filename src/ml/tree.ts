import { createRng } from './random';
import type { Sample } from './datasets';

export type TreeNode =
  | { leaf: true; proba: number; count: number; depth: number }
  | { leaf: false; feature: 'x1' | 'x2'; threshold: number; left: TreeNode; right: TreeNode; depth: number; count: number };

export interface TreeOptions {
  maxDepth: number;
  minSamplesSplit: number;
  /** For random forests: consider only one randomly chosen feature per split. */
  randomFeature?: () => number;
}

function gini(ones: number, n: number): number {
  if (n === 0) return 0;
  const p = ones / n;
  return 2 * p * (1 - p);
}

/** Grow a CART classification tree with Gini impurity. */
export function buildTree(data: Sample[], opts: TreeOptions, depth = 0): TreeNode {
  const n = data.length;
  let ones = 0;
  for (const d of data) ones += d.label;
  const proba = n ? ones / n : 0.5;
  if (depth >= opts.maxDepth || n < opts.minSamplesSplit || ones === 0 || ones === n) {
    return { leaf: true, proba, count: n, depth };
  }

  const features: ('x1' | 'x2')[] = opts.randomFeature ? [opts.randomFeature() < 0.5 ? 'x1' : 'x2'] : ['x1', 'x2'];
  let best: { feature: 'x1' | 'x2'; threshold: number; score: number } | null = null;
  const parent = gini(ones, n);

  for (const f of features) {
    const sorted = [...data].sort((a, b) => a[f] - b[f]);
    let leftOnes = 0;
    for (let i = 0; i < n - 1; i++) {
      leftOnes += sorted[i].label;
      if (sorted[i][f] === sorted[i + 1][f]) continue;
      const nl = i + 1;
      const nr = n - nl;
      const score = (nl / n) * gini(leftOnes, nl) + (nr / n) * gini(ones - leftOnes, nr);
      if (!best || score < best.score) best = { feature: f, threshold: (sorted[i][f] + sorted[i + 1][f]) / 2, score };
    }
  }

  if (!best || best.score >= parent - 1e-12) return { leaf: true, proba, count: n, depth };
  const { feature, threshold } = best;
  const left = data.filter((d) => d[feature] <= threshold);
  const right = data.filter((d) => d[feature] > threshold);
  return {
    leaf: false,
    feature,
    threshold,
    depth,
    count: n,
    left: buildTree(left, opts, depth + 1),
    right: buildTree(right, opts, depth + 1),
  };
}

export function treeProba(node: TreeNode, x1: number, x2: number): number {
  let cur = node;
  while (!cur.leaf) cur = (cur.feature === 'x1' ? x1 : x2) <= cur.threshold ? cur.left : cur.right;
  return cur.proba;
}

export function countLeaves(node: TreeNode): number {
  return node.leaf ? 1 : countLeaves(node.left) + countLeaves(node.right);
}

/** Random forest: bootstrap samples + random feature per split, averaged. */
export function buildForest(data: Sample[], trees: number, opts: Omit<TreeOptions, 'randomFeature'>, seed: number): TreeNode[] {
  const rng = createRng(seed);
  const forest: TreeNode[] = [];
  for (let t = 0; t < trees; t++) {
    const boot: Sample[] = [];
    for (let i = 0; i < data.length; i++) boot.push(data[Math.floor(rng() * data.length)]);
    forest.push(buildTree(boot, { ...opts, randomFeature: rng }));
  }
  return forest;
}

export function forestProba(forest: TreeNode[], x1: number, x2: number): number {
  if (forest.length === 0) return 0.5;
  let s = 0;
  for (const t of forest) s += treeProba(t, x1, x2);
  return s / forest.length;
}
