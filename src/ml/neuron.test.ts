import { describe, expect, it } from 'vitest';
import { activate, gateCorrect, gateStep, weightedSum, type Gate, type TwoInputNeuron } from './neuron';

describe('single neuron', () => {
  it('computes the weighted sum plus bias', () => {
    expect(weightedSum([1, 2, 3], [0.5, -1, 2], 0.25)).toBeCloseTo(0.5 - 2 + 6 + 0.25);
  });
  it('applies activations', () => {
    expect(activate('relu', -2)).toBe(0);
    expect(activate('step', 0.1)).toBe(1);
    expect(activate('sigmoid', 0)).toBeCloseTo(0.5);
  });
  const train = (g: Gate) => {
    let n: TwoInputNeuron = { w1: 0, w2: 0, b: 0 };
    for (let i = 0; i < 5000; i++) n = gateStep(n, g, 1);
    return n;
  };
  it('learns AND, OR and NAND', () => {
    for (const g of ['and', 'or', 'nand'] as Gate[]) expect(gateCorrect(train(g), g), g).toBe(4);
  });
  it('cannot learn XOR', () => {
    expect(gateCorrect(train('xor'), 'xor')).toBeLessThan(4);
  });
});
