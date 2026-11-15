import type { Mlp } from '../../ml/mlp';

/** SVG drawing of the network: edge colour = sign of the weight, width = its size. */
export function NetworkDiagram({ model }: { model: Mlp }) {
  const W = 280;
  const H = 150;
  const layers = model.sizes;
  const x = (l: number) => 20 + (l * (W - 40)) / (layers.length - 1);
  const y = (l: number, i: number) => H / 2 + (i - (layers[l] - 1) / 2) * Math.min(18, (H - 20) / Math.max(1, layers[l] - 1));

  const edges = [];
  for (let l = 0; l < layers.length - 1; l++) {
    const nIn = layers[l];
    for (let o = 0; o < layers[l + 1]; o++) {
      for (let i = 0; i < nIn; i++) {
        const w = model.W[l][o * nIn + i];
        edges.push(
          <line
            key={`${l}-${o}-${i}`}
            x1={x(l)}
            y1={y(l, i)}
            x2={x(l + 1)}
            y2={y(l + 1, o)}
            stroke={w >= 0 ? '#ff8a6b' : '#4f9dff'}
            strokeWidth={Math.min(4, 0.3 + Math.abs(w) * 0.9)}
            strokeOpacity={Math.min(1, 0.25 + Math.abs(w) * 0.4)}
          />,
        );
      }
    }
  }
  return (
    <svg className="network-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="network">
      {edges}
      {layers.map((n, l) =>
        Array.from({ length: n }, (_, i) => (
          <circle key={`${l}-${i}`} cx={x(l)} cy={y(l, i)} r={5.5} fill="#1c2335" stroke="#e8ecf6" strokeWidth={1.2} />
        )),
      )}
    </svg>
  );
}
