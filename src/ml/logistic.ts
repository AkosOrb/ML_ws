import type { Sample } from './datasets';

export interface LogisticModel {
  w1: number;
  w2: number;
  b: number;
}

export const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

export function logisticProba(m: LogisticModel, x1: number, x2: number): number {
  return sigmoid(m.w1 * x1 + m.w2 * x2 + m.b);
}

/** Mean binary cross-entropy (log loss). */
export function logLoss(m: LogisticModel, data: Sample[]): number {
  if (data.length === 0) return 0;
  let s = 0;
  for (const d of data) {
    const p = Math.min(Math.max(logisticProba(m, d.x1, d.x2), 1e-12), 1 - 1e-12);
    s -= d.label ? Math.log(p) : Math.log(1 - p);
  }
  return s / data.length;
}

/** One batch gradient-descent step on log loss with optional L2 regularisation. */
export function logisticStep(m: LogisticModel, data: Sample[], lr: number, l2 = 0): LogisticModel {
  if (data.length === 0) return m;
  let g1 = 0;
  let g2 = 0;
  let gb = 0;
  for (const d of data) {
    const r = logisticProba(m, d.x1, d.x2) - d.label;
    g1 += r * d.x1;
    g2 += r * d.x2;
    gb += r;
  }
  const n = data.length;
  return {
    w1: m.w1 - lr * (g1 / n + l2 * m.w1),
    w2: m.w2 - lr * (g2 / n + l2 * m.w2),
    b: m.b - lr * (gb / n),
  };
}
