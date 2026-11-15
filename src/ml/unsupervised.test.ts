import { describe, expect, it } from 'vitest';
import { makeBlobs3d } from './data3d';
import { inertia, initKmeans, kmeansHalfStep } from './kmeans';
import { agglomerate, labelsAfter, leafOrder } from './hierarchical';
import { flatten, makeEllipsoidCloud, pca } from './pca';
import { createAgent, defaultWorld, greedyPath, qStep } from './qlearning';

describe('k-means', () => {
  it('converges and recovers well-separated blobs', () => {
    const { points, truth } = makeBlobs3d(150, 3, 0.3, 4);
    let s = initKmeans(points, 3, 'plusplus', 1);
    for (let i = 0; i < 100 && !s.converged; i++) s = kmeansHalfStep(points, s);
    expect(s.converged).toBe(true);
    // each found cluster should map to a single true blob
    for (let c = 0; c < 3; c++) {
      const members = truth.filter((_, i) => s.assignment[i] === c);
      expect(new Set(members).size).toBe(1);
    }
    expect(inertia(points, s)).toBeGreaterThan(0);
  });
});

describe('hierarchical clustering', () => {
  it('merges n−1 times and cuts back to the true blobs', () => {
    const { points, truth } = makeBlobs3d(45, 3, 0.25, 2);
    const merges = agglomerate(points, 'average');
    expect(merges).toHaveLength(44);
    expect(merges.every((m, i) => i === 0 || m.height >= merges[i - 1].height - 1e-9)).toBe(true);
    const labels = labelsAfter(points.length, merges, points.length - 3);
    expect(new Set(labels).size).toBe(3);
    for (let c = 0; c < 3; c++) expect(new Set(truth.filter((_, i) => labels[i] === c)).size).toBe(1);
    expect([...leafOrder(points.length, merges)].sort((a, b) => a - b)).toEqual(points.map((_, i) => i));
  });
});

describe('PCA', () => {
  it('finds variances in decreasing order with orthonormal axes', () => {
    const pts = makeEllipsoidCloud(2000, [2, 1, 0.3], 0.7, 5);
    const r = pca(pts);
    expect(r.variances[0]).toBeCloseTo(4, 0);
    expect(r.variances[1]).toBeCloseTo(1, 0);
    expect(r.variances[2]).toBeLessThan(0.15);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const dot = r.axes[i].reduce((s, v, k) => s + v * r.axes[j][k], 0);
        expect(dot).toBeCloseTo(i === j ? 1 : 0, 6);
      }
    }
    // fully flattened points have no variance along the third axis
    const flat = pts.map((p) => flatten(p, r, 1));
    expect(pca(flat).variances[2]).toBeLessThan(1e-9);
  });
});

describe('Q-learning', () => {
  it('learns a greedy path from start to goal', () => {
    const world = defaultWorld();
    const ag = createAgent(world, 3);
    for (let i = 0; i < 60000; i++) qStep(world, ag, { alpha: 0.5, gamma: 0.95, epsilon: 0.2, maxSteps: 200 });
    const path = greedyPath(world, ag.Q);
    expect(world.cells[path[path.length - 1]]).toBe('goal');
  });
});
