import { describe, expect, it } from 'vitest';
import { adversarial, argmax, confidentOnNoise, makeShapeSet, pixelAccuracy, predict, trainedPixelNet } from './pixelNet';
import { buildNgram, CORPUS, inCorpus, nextWords, possibleSentences } from './ngram';
import { makeDataset } from './datasets';
import { createMlp, mlpLoss, mlpStep } from './mlp';

describe('pixel net', () => {
  const net = trainedPixelNet([10, 6]);
  it('learns the four shapes and generalises to new drawings', () => {
    expect(pixelAccuracy(net, makeShapeSet(30, 0.03, 999))).toBeGreaterThan(0.9);
  });
  it('outputs probabilities that sum to 1', () => {
    const p = predict(net, new Float64Array(49));
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
  });
  it('is often confident on pure noise (confident mistakes)', () => {
    expect(confidentOnNoise(net, 200, 0.8, 5)).toBeGreaterThan(0.2);
  });
  it('can be fooled by flipping a few pixels', () => {
    const x = makeShapeSet(1, 0, 3)[3].x;
    const a = adversarial(net, x, 12);
    expect(a.to).not.toBe(a.from);
    expect(a.flips.length).toBeLessThanOrEqual(12);
    expect(argmax(predict(net, a.img))).toBe(a.to);
  });
});

describe('n-gram language model', () => {
  it('with one word of context it can mix facts', () => {
    const m = buildNgram(CORPUS.hu, 1);
    const d = nextWords(m, ['Magyarország', 'fővárosa'], 1);
    expect(d.map((x) => x.word)).toContain('Róma');
    expect(d.reduce((a, b) => a + b.p, 0)).toBeCloseTo(1, 6);
  });
  it('grounding keeps it on the facts', () => {
    const m = buildNgram(CORPUS.hu, 1);
    const d = nextWords(m, ['Magyarország', 'fővárosa'], 1, true);
    expect(d).toEqual([{ word: 'Budapest', p: 1 }]);
  });
  it('recognises sentences from the corpus', () => {
    const m = buildNgram(CORPUS.en, 2);
    expect(inCorpus(m, ['The', 'Danube', 'is', 'a', 'river', '.'])).toBe(true);
    expect(inCorpus(m, ['The', 'Danube', 'is', 'a', 'lake', '.'])).toBe(false);
  });
});

describe('overfitting', () => {
  it('a big net drives training loss down while test loss rises; L2 limits the gap', () => {
    const train = makeDataset('moons', 30, 0.45, 7);
    const test = makeDataset('moons', 200, 0.45, 8);
    const run = (l2: number) => {
      const m = createMlp([16, 16], 'tanh', 3);
      let bestTest = Infinity;
      for (let i = 0; i < 4000; i++) {
        mlpStep(m, train, 0.5, l2);
        if (i % 50 === 0) bestTest = Math.min(bestTest, mlpLoss(m, test));
      }
      return { train: mlpLoss(m, train), test: mlpLoss(m, test), bestTest };
    };
    const free = run(0);
    const reg = run(0.01);
    expect(free.train).toBeLessThan(0.15);
    expect(free.test).toBeGreaterThan(free.bestTest * 1.2);
    expect(reg.test - reg.train).toBeLessThan(free.test - free.train);
  });
});

describe('possible sentences', () => {
  it('most sentences a 1-word-context model can make are not in its corpus', () => {
    const m = buildNgram(CORPUS.hu, 1);
    const all = possibleSentences(m, ['Albert']);
    const known = all.filter((s) => inCorpus(m, s));
    expect(known.length).toBe(1);
    expect(all.length).toBeGreaterThan(4);
    expect(possibleSentences(m, ['Albert'], true)).toEqual([['Albert', 'Einstein', 'egy', 'fizikus', 'volt', '.']]);
  });
});
