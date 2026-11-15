import { createRng, gaussian } from '../ml/random';

/** Monochrome wireframe: a perspective floor grid with a point cloud and a fitted plane. */
export function HeroArt({ variant = 'hero' }: { variant?: 'hero' | 'band' }) {
  const rng = createRng(variant === 'hero' ? 7 : 11);
  const W = 800;
  const H = 400;
  const horizon = 120;
  const vx = variant === 'hero' ? 560 : 260;
  const floor: string[] = [];
  for (let i = -14; i <= 14; i++) floor.push(`M${vx} ${horizon} L${vx + i * 70} ${H}`);
  for (let k = 1; k <= 9; k++) {
    const y = horizon + (H - horizon) * Math.pow(k / 9, 1.8);
    floor.push(`M0 ${y.toFixed(1)} H${W}`);
  }
  const pts = Array.from({ length: 70 }, () => {
    const t = rng();
    const x = 120 + t * 560;
    const y = 300 - t * 170 + gaussian(rng) * 26;
    return [x, y] as const;
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <path d={floor.join(' ')} stroke="#f3f1ec" strokeOpacity={0.14} strokeWidth={1} fill="none" />
      <path d="M110 300 L690 130 L740 170 L160 345 Z" fill="#f3f1ec" fillOpacity={0.06} stroke="#f3f1ec" strokeOpacity={0.5} />
      {pts.map(([x, y], i) => (
        <g key={i}>
          <line x1={x} y1={y} x2={x} y2={300 - ((x - 120) / 560) * 170 + 8} stroke="#f3f1ec" strokeOpacity={0.25} />
          <circle cx={x} cy={y} r={3} fill={i % 7 === 0 ? '#e8553a' : '#f3f1ec'} fillOpacity={i % 7 === 0 ? 1 : 0.8} />
        </g>
      ))}
      <path d="M100 40 V360 M100 360 H760" stroke="#f3f1ec" strokeOpacity={0.35} />
    </svg>
  );
}
