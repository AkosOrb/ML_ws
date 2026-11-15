import { createRng, gaussian } from './random';

/** One sample: two input features and a target value. */
export interface Point {
  x1: number;
  x2: number;
  y: number;
}

/** Model y ≈ w1·x1 + w2·x2 + b — a plane in 3D. */
export interface Plane {
  w1: number;
  w2: number;
  b: number;
}

export const TRUE_PLANE: Plane = { w1: 0.8, w2: -0.5, b: 0.5 };
export const DOMAIN = 3; // features live in [-DOMAIN, DOMAIN]

export function predict(p: Plane, x1: number, x2: number): number {
  return p.w1 * x1 + p.w2 * x2 + p.b;
}

export function generateData(
  count: number,
  noise: number,
  seed: number,
  truth: Plane = TRUE_PLANE,
): Point[] {
  const rng = createRng(seed);
  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    const x1 = (rng() * 2 - 1) * DOMAIN;
    const x2 = (rng() * 2 - 1) * DOMAIN;
    points.push({ x1, x2, y: predict(truth, x1, x2) + gaussian(rng) * noise });
  }
  return points;
}

/** Mean squared error. */
export function mse(p: Plane, data: Point[]): number {
  if (data.length === 0) return 0;
  let sum = 0;
  for (const d of data) {
    const r = predict(p, d.x1, d.x2) - d.y;
    sum += r * r;
  }
  return sum / data.length;
}

/** One step of batch gradient descent on the MSE loss. */
export function gradientStep(p: Plane, data: Point[], learningRate: number): Plane {
  if (data.length === 0) return p;
  let g1 = 0;
  let g2 = 0;
  let gb = 0;
  for (const d of data) {
    const r = predict(p, d.x1, d.x2) - d.y;
    g1 += r * d.x1;
    g2 += r * d.x2;
    gb += r;
  }
  const k = (2 / data.length) * learningRate;
  return { w1: p.w1 - k * g1, w2: p.w2 - k * g2, b: p.b - k * gb };
}
