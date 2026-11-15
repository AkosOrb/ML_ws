import { describe, expect, it } from 'vitest';
import { accuracy, DATASET_KINDS, makeDataset } from './datasets';
import { logisticProba, logisticStep, logLoss, type LogisticModel } from './logistic';
import { knnProba } from './knn';
import { buildForest, buildTree, forestProba, treeProba } from './tree';
import { supportVectorIndices, svmDecision, trainSvm } from './svm';
import { createMlp, mlpLoss, mlpProba, mlpStep } from './mlp';

describe('datasets', () => {
  it('are balanced and reproducible', () => {
    for (const kind of DATASET_KINDS) {
      const d = makeDataset(kind, 100, 0.2, 5);
      expect(d.filter((s) => s.label === 1)).toHaveLength(50);
      expect(makeDataset(kind, 100, 0.2, 5)).toEqual(d);
    }
  });
});

describe('logistic regression', () => {
  it('separates blobs and lowers the loss', () => {
    const data = makeDataset('blobs', 100, 0, 1);
    let m: LogisticModel = { w1: 0, w2: 0, b: 0 };
    const start = logLoss(m, data);
    for (let i = 0; i < 300; i++) m = logisticStep(m, data, 0.5);
    expect(logLoss(m, data)).toBeLessThan(start);
    expect(accuracy(data, (a, b) => logisticProba(m, a, b))).toBeGreaterThan(0.95);
  });
});

describe('k-NN', () => {
  it('k=1 memorises the training set', () => {
    const data = makeDataset('moons', 80, 0.3, 2);
    expect(accuracy(data, (a, b) => knnProba(data, a, b, 1))).toBe(1);
  });
});

describe('decision tree & forest', () => {
  it('a deep tree fits xor; a depth-1 tree cannot', () => {
    const data = makeDataset('xor', 120, 0, 3);
    const deep = buildTree(data, { maxDepth: 6, minSamplesSplit: 2 });
    const stump = buildTree(data, { maxDepth: 1, minSamplesSplit: 2 });
    expect(accuracy(data, (a, b) => treeProba(deep, a, b))).toBeGreaterThan(0.97);
    expect(accuracy(data, (a, b) => treeProba(stump, a, b))).toBeLessThan(0.8);
  });
  it('a forest classifies circles well', () => {
    const data = makeDataset('circles', 150, 0.1, 4);
    const forest = buildForest(data, 25, { maxDepth: 6, minSamplesSplit: 2 }, 9);
    expect(accuracy(data, (a, b) => forestProba(forest, a, b))).toBeGreaterThan(0.9);
  });
});

describe('SVM', () => {
  it('linear kernel separates blobs with few support vectors', () => {
    const data = makeDataset('blobs', 80, 0, 6);
    const m = trainSvm(data, 1, 'linear', 1);
    expect(accuracy(data, (a, b) => (svmDecision(m, a, b) > 0 ? 1 : 0))).toBeGreaterThan(0.95);
    expect(supportVectorIndices(m).length).toBeLessThan(40);
  });
  it('rbf kernel handles circles', () => {
    const data = makeDataset('circles', 100, 0.05, 7);
    const m = trainSvm(data, 5, 'rbf', 1);
    expect(accuracy(data, (a, b) => (svmDecision(m, a, b) > 0 ? 1 : 0))).toBeGreaterThan(0.9);
  });
});

describe('neural network', () => {
  it('learns xor', () => {
    const data = makeDataset('xor', 100, 0, 8);
    const m = createMlp([8, 8], 'tanh', 3);
    const start = mlpLoss(m, data);
    for (let i = 0; i < 600; i++) mlpStep(m, data, 0.5);
    expect(mlpLoss(m, data)).toBeLessThan(start / 3);
    expect(accuracy(data, (a, b) => mlpProba(m, a, b))).toBeGreaterThan(0.9);
  });
});

describe('loss landscape', () => {
  it('plain descent stalls in a local minimum; momentum escapes it', async () => {
    const { landscape, landscapeStep } = await import('./landscape');
    const roll = (mu: number) => {
      let b = { x: -2.4, z: -2.4, vx: 0, vz: 0 };
      for (let i = 0; i < 1500; i++) b = landscapeStep(b, 0.05, mu);
      return landscape(b.x, b.z);
    };
    expect(roll(0)).toBeGreaterThan(0.5);
    expect(roll(0.95)).toBeLessThan(0.1);
  });
});

describe('deep narrow network', () => {
  it('three 3-neuron layers solve XOR better than one', () => {
    const data = makeDataset('xor', 150, 0.1, 1);
    const fit = (layers: number) => {
      const m = createMlp(Array(layers).fill(3), 'tanh', 2);
      for (let i = 0; i < 1500; i++) mlpStep(m, data, 0.5);
      return accuracy(data, (a, b) => mlpProba(m, a, b));
    };
    expect(fit(3)).toBeGreaterThan(0.97);
    expect(fit(1)).toBeLessThan(0.9);
  });
});
