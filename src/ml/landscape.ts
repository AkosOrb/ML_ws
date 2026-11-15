/** Toy two-weight loss surface used to illustrate gradient descent. */
export const E = 3;

/** A bumpy toy loss with one global and one local minimum. */
export function landscape(x: number, z: number): number {
  return (
    0.08 * (x * x + z * z) -
    1.4 * Math.exp(-((x - 1.4) ** 2 + (z - 1.1) ** 2) / 0.9) -
    0.8 * Math.exp(-((x + 1.5) ** 2 + (z + 1.3) ** 2) / 0.6) +
    0.25 * Math.sin(1.7 * x) * Math.cos(1.5 * z) +
    1.2
  );
}

export function landscapeGrad(x: number, z: number): [number, number] {
  const h = 1e-4;
  return [
    (landscape(x + h, z) - landscape(x - h, z)) / (2 * h),
    (landscape(x, z + h) - landscape(x, z - h)) / (2 * h),
  ];
}

export interface Ball {
  x: number;
  z: number;
  vx: number;
  vz: number;
}

export function landscapeStep(b: Ball, lr: number, momentum: number): Ball {
  const [gx, gz] = landscapeGrad(b.x, b.z);
  const vx = momentum * b.vx - lr * gx;
  const vz = momentum * b.vz - lr * gz;
  return {
    x: Math.max(-E, Math.min(E, b.x + vx)),
    z: Math.max(-E, Math.min(E, b.z + vz)),
    vx,
    vz,
  };
}


function range(): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (let x = -E; x <= E; x += 0.1) {
    for (let z = -E; z <= E; z += 0.1) {
      const v = landscape(x, z);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
  }
  return [lo, hi];
}
export const [LANDSCAPE_MIN, LANDSCAPE_MAX] = range();
