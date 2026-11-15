import { createRng } from './random';
import type { Sample } from './datasets';

export type Kernel = 'linear' | 'rbf';

export interface SvmModel {
  alphas: number[];
  b: number;
  data: Sample[];
  kernel: Kernel;
  gamma: number;
}

function k(kernel: Kernel, gamma: number, a1: number, a2: number, b1: number, b2: number): number {
  if (kernel === 'linear') return a1 * b1 + a2 * b2;
  const d1 = a1 - b1;
  const d2 = a2 - b2;
  return Math.exp(-gamma * (d1 * d1 + d2 * d2));
}

const sign = (s: Sample) => (s.label ? 1 : -1);

/** Signed decision value f(x); > 0 means class 1. */
export function svmDecision(m: SvmModel, x1: number, x2: number): number {
  let s = m.b;
  for (let i = 0; i < m.data.length; i++) {
    const a = m.alphas[i];
    if (a > 1e-8) s += a * sign(m.data[i]) * k(m.kernel, m.gamma, m.data[i].x1, m.data[i].x2, x1, x2);
  }
  return s;
}

/** Map the decision value to [0, 1] for display (not a calibrated probability). */
export function svmScore(m: SvmModel, x1: number, x2: number): number {
  return 1 / (1 + Math.exp(-2 * svmDecision(m, x1, x2)));
}

export function supportVectorIndices(m: SvmModel): number[] {
  return m.alphas.flatMap((a, i) => (a > 1e-6 ? [i] : []));
}

/** Simplified SMO (Platt) — fine for a few hundred points. */
export function trainSvm(data: Sample[], C: number, kernel: Kernel, gamma: number, seed = 1, maxPasses = 8): SvmModel {
  const n = data.length;
  const rng = createRng(seed);
  const K: Float64Array[] = [];
  for (let i = 0; i < n; i++) {
    K.push(new Float64Array(n));
    for (let j = 0; j < n; j++) K[i][j] = k(kernel, gamma, data[i].x1, data[i].x2, data[j].x1, data[j].x2);
  }
  const y = data.map(sign);
  const alphas = new Array(n).fill(0);
  let b = 0;
  const f = (i: number) => {
    let s = b;
    for (let j = 0; j < n; j++) if (alphas[j] !== 0) s += alphas[j] * y[j] * K[j][i];
    return s;
  };
  const tol = 1e-3;
  let passes = 0;
  let iter = 0;
  while (passes < maxPasses && iter < 200) {
    iter++;
    let changed = 0;
    for (let i = 0; i < n; i++) {
      const Ei = f(i) - y[i];
      if ((y[i] * Ei < -tol && alphas[i] < C) || (y[i] * Ei > tol && alphas[i] > 0)) {
        let j = Math.floor(rng() * (n - 1));
        if (j >= i) j++;
        const Ej = f(j) - y[j];
        const ai = alphas[i];
        const aj = alphas[j];
        const L = y[i] !== y[j] ? Math.max(0, aj - ai) : Math.max(0, ai + aj - C);
        const H = y[i] !== y[j] ? Math.min(C, C + aj - ai) : Math.min(C, ai + aj);
        if (L === H) continue;
        const eta = 2 * K[i][j] - K[i][i] - K[j][j];
        if (eta >= 0) continue;
        let ajNew = aj - (y[j] * (Ei - Ej)) / eta;
        ajNew = Math.min(H, Math.max(L, ajNew));
        if (Math.abs(ajNew - aj) < 1e-5) continue;
        const aiNew = ai + y[i] * y[j] * (aj - ajNew);
        const b1 = b - Ei - y[i] * (aiNew - ai) * K[i][i] - y[j] * (ajNew - aj) * K[i][j];
        const b2 = b - Ej - y[i] * (aiNew - ai) * K[i][j] - y[j] * (ajNew - aj) * K[j][j];
        alphas[i] = aiNew;
        alphas[j] = ajNew;
        b = aiNew > 0 && aiNew < C ? b1 : ajNew > 0 && ajNew < C ? b2 : (b1 + b2) / 2;
        changed++;
      }
    }
    passes = changed === 0 ? passes + 1 : 0;
  }
  return { alphas, b, data, kernel, gamma };
}
