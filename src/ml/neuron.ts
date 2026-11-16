/** A single artificial neuron: weighted sum, bias, activation. */

export type NeuronActivation = 'step' | 'sigmoid' | 'tanh' | 'relu' | 'linear';
export const NEURON_ACTIVATIONS: NeuronActivation[] = ['step', 'sigmoid', 'tanh', 'relu', 'linear'];

export const activate = (a: NeuronActivation, z: number): number => {
  switch (a) {
    case 'step':
      return z >= 0 ? 1 : 0;
    case 'sigmoid':
      return 1 / (1 + Math.exp(-z));
    case 'tanh':
      return Math.tanh(z);
    case 'relu':
      return z > 0 ? z : 0;
    case 'linear':
      return z;
  }
};

/** z = Σ wᵢxᵢ + b */
export const weightedSum = (x: number[], w: number[], b: number) => x.reduce((s, xi, i) => s + xi * w[i], b);

export type Gate = 'and' | 'or' | 'nand' | 'xor';
export const GATES: Gate[] = ['and', 'or', 'nand', 'xor'];

/** The four input pairs and the gate's target output for each. */
export function gateData(g: Gate): { x: [number, number]; y: number }[] {
  const f = { and: (a: number, b: number) => a & b, or: (a: number, b: number) => a | b, nand: (a: number, b: number) => 1 - (a & b), xor: (a: number, b: number) => a ^ b }[g];
  return [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1],
  ].map(([a, b]) => ({ x: [a, b] as [number, number], y: f(a, b) }));
}

export interface TwoInputNeuron {
  w1: number;
  w2: number;
  b: number;
}

/** One gradient-descent step on the four points (sigmoid output, cross-entropy loss). */
export function gateStep(n: TwoInputNeuron, g: Gate, lr: number): TwoInputNeuron {
  let g1 = 0;
  let g2 = 0;
  let gb = 0;
  for (const d of gateData(g)) {
    const p = activate('sigmoid', n.w1 * d.x[0] + n.w2 * d.x[1] + n.b);
    const e = p - d.y;
    g1 += e * d.x[0];
    g2 += e * d.x[1];
    gb += e;
  }
  return { w1: n.w1 - (lr * g1) / 4, w2: n.w2 - (lr * g2) / 4, b: n.b - (lr * gb) / 4 };
}

export function gateLoss(n: TwoInputNeuron, g: Gate): number {
  let s = 0;
  for (const d of gateData(g)) {
    const p = Math.min(Math.max(activate('sigmoid', n.w1 * d.x[0] + n.w2 * d.x[1] + n.b), 1e-9), 1 - 1e-9);
    s -= d.y ? Math.log(p) : Math.log(1 - p);
  }
  return s / 4;
}

/** How many of the four cases the neuron gets right (output ≥ 0.5 counts as 1). */
export const gateCorrect = (n: TwoInputNeuron, g: Gate) =>
  gateData(g).filter((d) => (activate('sigmoid', n.w1 * d.x[0] + n.w2 * d.x[1] + n.b) >= 0.5 ? 1 : 0) === d.y).length;
