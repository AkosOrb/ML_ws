import { describe, expect, it } from 'vitest';
import { blank, convRelu, KERNELS, maxPool, preset } from './conv';

describe('convolution', () => {
  it('shrinks by 2 and detects a vertical edge only with the vertical kernel', () => {
    const img = blank(6);
    for (let y = 0; y < 6; y++) for (let x = 3; x < 6; x++) img.px[y * 6 + x] = 1; // right half bright
    const v = convRelu(img, KERNELS.vertical);
    const h = convRelu(img, KERNELS.horizontal);
    expect(v.size).toBe(4);
    expect(Math.max(...v.px)).toBe(4);
    expect(Math.max(...h.px)).toBe(0);
  });
  it('max pooling halves the size and keeps maxima', () => {
    const img = blank(4);
    img.px.set([1, 2, 0, 0, 3, 4, 0, 5, 0, 0, 0, 0, 0, 0, 0, 6]);
    expect(Array.from(maxPool(img).px)).toEqual([4, 5, 0, 6]);
  });
  it('presets are 20×20 binary images', () => {
    const img = preset('seven');
    expect(img.size).toBe(20);
    expect(img.px.every((v) => v === 0 || v === 1)).toBe(true);
  });
});
