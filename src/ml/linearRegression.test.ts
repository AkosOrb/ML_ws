import { describe, expect, it } from 'vitest';
import { generateData, gradientStep, mse, TRUE_PLANE, type Plane } from './linearRegression';

describe('linear regression', () => {
  it('generates reproducible data for a seed', () => {
    expect(generateData(5, 0.3, 42)).toEqual(generateData(5, 0.3, 42));
  });

  it('gradient descent converges to the true plane on noiseless data', () => {
    const data = generateData(100, 0, 7);
    let p: Plane = { w1: 0, w2: 0, b: 0 };
    for (let i = 0; i < 2000; i++) p = gradientStep(p, data, 0.05);
    expect(p.w1).toBeCloseTo(TRUE_PLANE.w1, 3);
    expect(p.w2).toBeCloseTo(TRUE_PLANE.w2, 3);
    expect(p.b).toBeCloseTo(TRUE_PLANE.b, 3);
    expect(mse(p, data)).toBeLessThan(1e-6);
  });

  it('each step lowers the loss with a small learning rate', () => {
    const data = generateData(50, 0.5, 3);
    let p: Plane = { w1: 0, w2: 0, b: 0 };
    let prev = mse(p, data);
    for (let i = 0; i < 20; i++) {
      p = gradientStep(p, data, 0.02);
      const cur = mse(p, data);
      expect(cur).toBeLessThan(prev);
      prev = cur;
    }
  });
});
