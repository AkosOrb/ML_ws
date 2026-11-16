import { createRng, gaussian } from './random';

/** Side length of the tiny input images. */
export const GRID = 7;
export const N_IN = GRID * GRID;

export const SHAPES = ['vertical', 'horizontal', 'frame', 'cross'] as const;
export type Shape = (typeof SHAPES)[number];

export interface PixelSample {
  x: Float64Array; // N_IN pixels, 0 or 1
  label: number; // index into SHAPES
}

const randInt = (rng: () => number, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));

/** Draws one shape with a random position, size and thickness. */
export function drawShape(shape: Shape, rng: () => number): Float64Array {
  const px = new Float64Array(N_IN);
  const set = (x: number, y: number) => {
    if (x >= 0 && y >= 0 && x < GRID && y < GRID) px[y * GRID + x] = 1;
  };
  switch (shape) {
    case 'vertical':
    case 'horizontal': {
      const c = randInt(rng, 1, 5);
      const a = randInt(rng, 0, 1);
      const b = randInt(rng, 5, 6);
      const thick = rng() < 0.25 ? 2 : 1;
      for (let t = a; t <= b; t++)
        for (let k = 0; k < thick; k++) (shape === 'vertical' ? set(c + k, t) : set(t, c + k));
      break;
    }
    case 'frame': {
      const x0 = randInt(rng, 0, 1);
      const y0 = randInt(rng, 0, 1);
      const x1 = randInt(rng, 5, 6);
      const y1 = randInt(rng, 5, 6);
      for (let x = x0; x <= x1; x++) {
        set(x, y0);
        set(x, y1);
      }
      for (let y = y0; y <= y1; y++) {
        set(x0, y);
        set(x1, y);
      }
      break;
    }
    case 'cross': {
      const s = randInt(rng, 5, 7);
      const ox = randInt(rng, 0, GRID - s);
      const oy = randInt(rng, 0, GRID - s);
      for (let i = 0; i < s; i++) {
        set(ox + i, oy + i);
        set(ox + s - 1 - i, oy + i);
      }
      break;
    }
  }
  return px;
}

/** Flips each pixel independently with probability `rate`. */
export function addNoise(px: Float64Array, rate: number, rng: () => number): Float64Array {
  const out = px.slice();
  for (let i = 0; i < out.length; i++) if (rng() < rate) out[i] = 1 - out[i];
  return out;
}

export function makeShapeSet(perClass: number, noise: number, seed: number): PixelSample[] {
  const rng = createRng(seed);
  const out: PixelSample[] = [];
  for (let i = 0; i < perClass; i++)
    SHAPES.forEach((s, label) => out.push({ x: addNoise(drawShape(s, rng), noise, rng), label }));
  return out;
}

/** A random image with no shape in it: every pixel is on with probability `density`. */
export function randomImage(density: number, rng: () => number): Float64Array {
  const px = new Float64Array(N_IN);
  for (let i = 0; i < N_IN; i++) px[i] = rng() < density ? 1 : 0;
  return px;
}

/** Builds an image from rows of '#' and '.'. */
export function fromRows(rows: string[]): Float64Array {
  const px = new Float64Array(N_IN);
  rows.forEach((r, y) => [...r].forEach((c, x) => (px[y * GRID + x] = c === '#' ? 1 : 0)));
  return px;
}

/** Fully connected net: N_IN inputs → ReLU hidden layers → softmax over the shapes. */
export interface PixelNet {
  sizes: number[];
  W: Float64Array[]; // W[l] is sizes[l+1] × sizes[l], row-major
  B: Float64Array[];
}

export function createPixelNet(hidden: number[], seed: number): PixelNet {
  const rng = createRng(seed);
  const sizes = [N_IN, ...hidden, SHAPES.length];
  const W: Float64Array[] = [];
  const B: Float64Array[] = [];
  for (let l = 0; l < sizes.length - 1; l++) {
    const w = new Float64Array(sizes[l + 1] * sizes[l]);
    const scale = Math.sqrt(2 / sizes[l]);
    for (let i = 0; i < w.length; i++) w[i] = gaussian(rng) * scale;
    W.push(w);
    B.push(new Float64Array(sizes[l + 1]).fill(l < sizes.length - 2 ? 0.05 : 0));
  }
  return { sizes, W, B };
}

export function softmax(z: Float64Array): Float64Array {
  let m = -Infinity;
  for (const v of z) m = Math.max(m, v);
  const out = new Float64Array(z.length);
  let s = 0;
  for (let i = 0; i < z.length; i++) s += out[i] = Math.exp(z[i] - m);
  for (let i = 0; i < z.length; i++) out[i] /= s;
  return out;
}

/**
 * Forward pass. Returns every layer: [input, hidden 1, …, output probabilities].
 * Hidden values are ReLU outputs (0 = the neuron is silent).
 */
export function pixelForward(net: PixelNet, x: Float64Array): Float64Array[] {
  const outs: Float64Array[] = [x];
  const L = net.sizes.length - 1;
  for (let l = 0; l < L; l++) {
    const inp = outs[l];
    const nIn = net.sizes[l];
    const z = new Float64Array(net.sizes[l + 1]);
    for (let o = 0; o < z.length; o++) {
      let s = net.B[l][o];
      for (let i = 0; i < nIn; i++) s += net.W[l][o * nIn + i] * inp[i];
      z[o] = s;
    }
    outs.push(l === L - 1 ? softmax(z) : z.map((v) => (v > 0 ? v : 0)));
  }
  return outs;
}

export const predict = (net: PixelNet, x: Float64Array) => {
  const outs = pixelForward(net, x);
  return outs[outs.length - 1];
};

export const argmax = (v: ArrayLike<number>) => {
  let best = 0;
  for (let i = 1; i < v.length; i++) if (v[i] > v[best]) best = i;
  return best;
};

/** Plain per-sample SGD with backpropagation and cross-entropy loss. Mutates net. */
export function trainPixelNet(net: PixelNet, data: PixelSample[], epochs: number, lr: number, seed: number): PixelNet {
  const rng = createRng(seed);
  const order = data.map((_, i) => i);
  const L = net.sizes.length - 1;
  for (let e = 0; e < epochs; e++) {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (const idx of order) {
      const d = data[idx];
      const outs = pixelForward(net, d.x);
      let delta: Float64Array = outs[L].slice();
      delta[d.label] -= 1; // softmax + cross-entropy
      for (let l = L - 1; l >= 0; l--) {
        const nIn = net.sizes[l];
        const inp = outs[l];
        let prev: Float64Array | null = null;
        if (l > 0) {
          prev = new Float64Array(nIn);
          for (let i = 0; i < nIn; i++) {
            if (inp[i] <= 0) continue; // ReLU derivative
            let s = 0;
            for (let o = 0; o < delta.length; o++) s += net.W[l][o * nIn + i] * delta[o];
            prev[i] = s;
          }
        }
        for (let o = 0; o < delta.length; o++) {
          const g = lr * delta[o];
          if (g === 0) continue;
          net.B[l][o] -= g;
          for (let i = 0; i < nIn; i++) net.W[l][o * nIn + i] -= g * inp[i];
        }
        if (prev) delta = prev;
      }
    }
  }
  return net;
}

export function pixelAccuracy(net: PixelNet, data: PixelSample[]): number {
  if (!data.length) return 0;
  let ok = 0;
  for (const d of data) if (argmax(predict(net, d.x)) === d.label) ok++;
  return ok / data.length;
}

/** A trained net, ready to use. Deterministic for a given seed. */
export function trainedPixelNet(hidden: number[], seed = 1): PixelNet {
  const net = createPixelNet(hidden, seed);
  return trainPixelNet(net, makeShapeSet(60, 0.03, seed + 100), 30, 0.03, seed + 200);
}

/**
 * Greedy "adversarial" attack: flips, one at a time, the pixel that lowers the
 * current answer's probability the most, until the answer changes.
 */
export function adversarial(net: PixelNet, x: Float64Array, maxFlips = 12): { img: Float64Array; flips: number[]; from: number; to: number } {
  const from = argmax(predict(net, x));
  let img = x.slice();
  const flips: number[] = [];
  for (let k = 0; k < maxFlips; k++) {
    let bestI = -1;
    let bestP = Infinity;
    for (let i = 0; i < N_IN; i++) {
      if (flips.includes(i)) continue;
      img[i] = 1 - img[i];
      const p = predict(net, img)[from];
      img[i] = 1 - img[i];
      if (p < bestP) {
        bestP = p;
        bestI = i;
      }
    }
    if (bestI < 0) break;
    img = img.slice();
    img[bestI] = 1 - img[bestI];
    flips.push(bestI);
    if (argmax(predict(net, img)) !== from) break;
  }
  return { img, flips, from, to: argmax(predict(net, img)) };
}

/** Share of `n` random no-shape images that the net labels with at least `threshold` confidence. */
export function confidentOnNoise(net: PixelNet, n: number, threshold: number, seed: number): number {
  const rng = createRng(seed);
  let c = 0;
  for (let i = 0; i < n; i++) {
    const p = predict(net, randomImage(0.15 + rng() * 0.3, rng));
    if (p[argmax(p)] >= threshold) c++;
  }
  return c / n;
}
