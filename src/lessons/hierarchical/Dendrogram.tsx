import type { Merge } from '../../ml/hierarchical';
import { leafOrder } from '../../ml/hierarchical';

/** Classic dendrogram; the dashed line marks the current cut. */
export function Dendrogram({ n, merges, steps, colors }: { n: number; merges: Merge[]; steps: number; colors: string[] }) {
  const W = 280;
  const H = 150;
  const pad = 6;
  if (merges.length === 0) return null;
  const maxH = merges[merges.length - 1].height || 1;
  const order = leafOrder(n, merges);
  const xs = new Map<number, number>();
  order.forEach((leaf, i) => xs.set(leaf, pad + (i / Math.max(1, n - 1)) * (W - 2 * pad)));
  const ys = new Map<number, number>();
  const y = (h: number) => H - pad - (h / maxH) * (H - 2 * pad);
  for (let i = 0; i < n; i++) ys.set(i, H - pad);
  const paths = merges.map((m, i) => {
    const id = n + i;
    const xa = xs.get(m.a)!;
    const xb = xs.get(m.b)!;
    xs.set(id, (xa + xb) / 2);
    ys.set(id, y(m.height));
    const done = i < steps;
    return (
      <path
        key={i}
        d={`M${xa},${ys.get(m.a)} V${y(m.height)} H${xb} V${ys.get(m.b)}`}
        fill="none"
        stroke={done ? '#f3f1ec' : '#5a5a5a'}
        strokeWidth={done ? 1.2 : 0.8}
      />
    );
  });
  const cutH = steps <= 0 ? 0 : steps >= merges.length ? merges[merges.length - 1].height * 1.02 : (merges[steps - 1].height + merges[steps].height) / 2;
  return (
    <svg className="network-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="dendrogram">
      {paths}
      {order.map((leaf, i) => (
        <circle key={leaf} cx={pad + (i / Math.max(1, n - 1)) * (W - 2 * pad)} cy={H - pad} r={1.8} fill={colors[leaf]} />
      ))}
      {steps > 0 && <line x1={0} x2={W} y1={y(cutH)} y2={y(cutH)} stroke="#e8553a" strokeDasharray="4 3" />}
    </svg>
  );
}
