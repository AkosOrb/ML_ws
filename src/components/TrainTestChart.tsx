export interface TrainTestPoint {
  step: number;
  train: number;
  test: number;
}

/** Training and test loss on one chart, with a marker where the test loss was lowest. */
export function TrainTestChart({ points, bestStep, label, trainLabel, testLabel }: { points: TrainTestPoint[]; bestStep?: number; label: string; trainLabel: string; testLabel: string }) {
  const w = 220;
  const h = 70;
  if (points.length < 2) return null;
  const last = points[points.length - 1].step || 1;
  const vals = points.flatMap((p) => [p.train, p.test]).filter(Number.isFinite);
  const max = Math.min(Math.max(...vals), 3);
  const y = (v: number) => h - (Math.min(v, max) / (max || 1)) * (h - 6) - 3;
  const x = (s: number) => (s / last) * w;
  const line = (k: 'train' | 'test') => points.map((p) => `${x(p.step).toFixed(1)},${y(p[k]).toFixed(1)}`).join(' ');
  return (
    <figure className="loss-chart">
      <figcaption>{label}</figcaption>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
        {bestStep !== undefined && <line x1={x(bestStep)} x2={x(bestStep)} y1={0} y2={h} stroke="#ffd166" strokeDasharray="3 3" />}
        <polyline points={line('test')} fill="none" stroke="#4f9dff" strokeWidth="2" />
        <polyline points={line('train')} fill="none" stroke="var(--accent)" strokeWidth="2" />
      </svg>
      <div className="legend">
        <span><i style={{ background: 'var(--accent)' }} />{trainLabel}</span>
        <span><i style={{ background: '#4f9dff' }} />{testLabel}</span>
      </div>
    </figure>
  );
}
