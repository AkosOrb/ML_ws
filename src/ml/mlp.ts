import { createRng, gaussian } from './random';
import type { Sample } from './datasets';

export type Activation = 'tanh' | 'relu' | 'sigmoid';

/** A small fully connected network: 2 inputs → hidden layers → 1 sigmoid output. */
export interface Mlp {
  sizes: number[]; // e.g. [2, 6, 6, 1]
  W: Float64Array[]; // W[l] is sizes[l+1] × sizes[l], row-major
  B: Float64Array[];
  activation: Activation;
}

const act = {
  tanh: { f: Math.tanh, d: (y: number) => 1 - y * y },
  relu: { f: (x: number) => (x > 0 ? x : 0), d: (y: number) => (y > 0 ? 1 : 0) },
  sigmoid: { f: (x: number) => 1 / (1 + Math.exp(-x)), d: (y: number) => y * (1 - y) },
};

export function createMlp(hidden: number[], activation: Activation, seed: number): Mlp {
  const rng = createRng(seed);
  const sizes = [2, ...hidden, 1];
  const W: Float64Array[] = [];
  const B: Float64Array[] = [];
  for (let l = 0; l < sizes.length - 1; l++) {
    const fanIn = sizes[l];
    const w = new Float64Array(sizes[l + 1] * fanIn);
    const scale = activation === 'relu' ? Math.sqrt(2 / fanIn) : Math.sqrt(1 / fanIn);
    for (let i = 0; i < w.length; i++) w[i] = gaussian(rng) * scale;
    W.push(w);
    B.push(new Float64Array(sizes[l + 1]).fill(activation === 'relu' ? 0.05 : 0));
  }
  return { sizes, W, B, activation };
}

/** Forward pass returning every layer's activations (last = output probability). */
function forward(m: Mlp, x1: number, x2: number): Float64Array[] {
  const outs: Float64Array[] = [Float64Array.from([x1, x2])];
  const L = m.sizes.length - 1;
  for (let l = 0; l < L; l++) {
    const inp = outs[l];
    const nOut = m.sizes[l + 1];
    const nIn = m.sizes[l];
    const out = new Float64Array(nOut);
    for (let o = 0; o < nOut; o++) {
      let s = m.B[l][o];
      for (let i = 0; i < nIn; i++) s += m.W[l][o * nIn + i] * inp[i];
      out[o] = l === L - 1 ? 1 / (1 + Math.exp(-s)) : act[m.activation].f(s);
    }
    outs.push(out);
  }
  return outs;
}

export function mlpProba(m: Mlp, x1: number, x2: number): number {
  const outs = forward(m, x1, x2);
  return outs[outs.length - 1][0];
}

/** Hidden-layer activations for drawing the network (excludes inputs and output). */
export function mlpActivations(m: Mlp, x1: number, x2: number): Float64Array[] {
  return forward(m, x1, x2);
}

export function mlpLoss(m: Mlp, data: Sample[]): number {
  if (data.length === 0) return 0;
  let s = 0;
  for (const d of data) {
    const p = Math.min(Math.max(mlpProba(m, d.x1, d.x2), 1e-12), 1 - 1e-12);
    s -= d.label ? Math.log(p) : Math.log(1 - p);
  }
  return s / data.length;
}

/**
 * One full-batch gradient-descent step with backpropagation. Mutates and returns m.
 * `l2` adds weight decay (L2 regularisation): every weight is also pulled towards 0.
 */
export function mlpStep(m: Mlp, data: Sample[], lr: number, l2 = 0): Mlp {
  const L = m.sizes.length - 1;
  const gW = m.W.map((w) => new Float64Array(w.length));
  const gB = m.B.map((b) => new Float64Array(b.length));
  for (const d of data) {
    const outs = forward(m, d.x1, d.x2);
    // output delta for sigmoid + cross-entropy
    let delta = Float64Array.from([outs[L][0] - d.label]);
    for (let l = L - 1; l >= 0; l--) {
      const nIn = m.sizes[l];
      const nOut = m.sizes[l + 1];
      const inp = outs[l];
      for (let o = 0; o < nOut; o++) {
        gB[l][o] += delta[o];
        for (let i = 0; i < nIn; i++) gW[l][o * nIn + i] += delta[o] * inp[i];
      }
      if (l > 0) {
        const prev = new Float64Array(nIn);
        for (let i = 0; i < nIn; i++) {
          let s = 0;
          for (let o = 0; o < nOut; o++) s += m.W[l][o * nIn + i] * delta[o];
          prev[i] = s * act[m.activation].d(inp[i]);
        }
        delta = prev;
      }
    }
  }
  const n = Math.max(1, data.length);
  for (let l = 0; l < L; l++) {
    for (let i = 0; i < m.W[l].length; i++) m.W[l][i] -= lr * (gW[l][i] / n + l2 * m.W[l][i]);
    for (let i = 0; i < m.B[l].length; i++) m.B[l][i] -= (lr * gB[l][i]) / n;
  }
  return m;
}

/** Deep copy, e.g. to remember the best model seen so far. */
export const cloneMlp = (m: Mlp): Mlp => ({ ...m, sizes: [...m.sizes], W: m.W.map((w) => w.slice()), B: m.B.map((b) => b.slice()) });

/** Copies the weights of `src` into `dst` in place (same architecture). */
export function copyMlpInto(dst: Mlp, src: Mlp) {
  src.W.forEach((w, l) => dst.W[l].set(w));
  src.B.forEach((b, l) => dst.B[l].set(b));
}
