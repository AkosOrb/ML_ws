/** A square greyscale image, row-major, values in [0, 1]. */
export interface Img {
  size: number;
  px: Float32Array;
}

export const blank = (size: number): Img => ({ size, px: new Float32Array(size * size) });

/** 3×3 kernel, row-major. */
export type Kernel = number[];

export const KERNELS: Record<string, Kernel> = {
  vertical: [-1, 0, 1, -2, 0, 2, -1, 0, 1],
  horizontal: [-1, -2, -1, 0, 0, 0, 1, 2, 1],
  diagonal: [0, 1, 2, -1, 0, 1, -2, -1, 0],
  blur: [1, 1, 1, 1, 1, 1, 1, 1, 1].map((v) => v / 9),
  sharpen: [0, -1, 0, -1, 5, -1, 0, -1, 0],
  outline: [-1, -1, -1, -1, 8, -1, -1, -1, -1],
};

/** "Valid" 3×3 convolution (cross-correlation, as in deep-learning libraries) followed by ReLU. */
export function convRelu(img: Img, k: Kernel, relu = true): Img {
  const n = img.size - 2;
  const out = new Float32Array(n * n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let s = 0;
      for (let ky = 0; ky < 3; ky++) for (let kx = 0; kx < 3; kx++) s += img.px[(y + ky) * img.size + x + kx] * k[ky * 3 + kx];
      out[y * n + x] = relu ? Math.max(0, s) : s;
    }
  }
  return { size: n, px: out };
}

/** 2×2 max pooling with stride 2 (drops an odd last row/column). */
export function maxPool(img: Img): Img {
  const n = Math.floor(img.size / 2);
  const out = new Float32Array(n * n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = 2 * y * img.size + 2 * x;
      out[y * n + x] = Math.max(img.px[i], img.px[i + 1], img.px[i + img.size], img.px[i + img.size + 1]);
    }
  }
  return { size: n, px: out };
}

export function maxValue(img: Img): number {
  let m = 0;
  for (const v of img.px) m = Math.max(m, Math.abs(v));
  return m;
}

/** Built-in drawings on a 20×20 grid, as strings of '#' and '.'. */
const PRESETS_RAW: Record<string, string[]> = {
  seven: [
    '....................',
    '....................',
    '...##############...',
    '...##############...',
    '..............###...',
    '.............###....',
    '............###.....',
    '...........###......',
    '..........###.......',
    '.........###........',
    '........###.........',
    '........###.........',
    '.......###..........',
    '.......###..........',
    '......###...........',
    '......###...........',
    '......###...........',
    '......###...........',
    '....................',
    '....................',
  ],
  zero: [
    '....................',
    '.......######.......',
    '.....###....###.....',
    '....##........##....',
    '...##..........##...',
    '...##..........##...',
    '..##............##..',
    '..##............##..',
    '..##............##..',
    '..##............##..',
    '..##............##..',
    '..##............##..',
    '..##............##..',
    '...##..........##...',
    '...##..........##...',
    '....##........##....',
    '.....###....###.....',
    '.......######.......',
    '....................',
    '....................',
  ],
  cross: [
    '....................',
    '.##..............##.',
    '..##............##..',
    '...##..........##...',
    '....##........##....',
    '.....##......##.....',
    '......##....##......',
    '.......##..##.......',
    '........####........',
    '.........##.........',
    '........####........',
    '.......##..##.......',
    '......##....##......',
    '.....##......##.....',
    '....##........##....',
    '...##..........##...',
    '..##............##..',
    '.##..............##.',
    '....................',
    '....................',
  ],
  square: [
    '....................',
    '....................',
    '....................',
    '...##############...',
    '...##############...',
    '...##..........##...',
    '...##..........##...',
    '...##..........##...',
    '...##..........##...',
    '...##..........##...',
    '...##..........##...',
    '...##..........##...',
    '...##..........##...',
    '...##..........##...',
    '...##############...',
    '...##############...',
    '....................',
    '....................',
    '....................',
    '....................',
  ],
};

export const PRESET_NAMES = Object.keys(PRESETS_RAW);

export function preset(name: string): Img {
  const rows = PRESETS_RAW[name];
  const img = blank(rows.length);
  rows.forEach((r, y) => [...r].forEach((c, x) => (img.px[y * img.size + x] = c === '#' ? 1 : 0)));
  return img;
}
