/** Tiny SVG line chart of the loss over training steps. */
export function LossChart({ history, label }: { history: number[]; label: string }) {
  const w = 180;
  const h = 56;
  if (history.length < 2) return null;
  const max = Math.max(...history);
  const min = Math.min(...history);
  const span = max - min || 1;
  const pts = history
    .map((v, i) => `${(i / (history.length - 1)) * w},${h - ((v - min) / span) * (h - 4) - 2}`)
    .join(' ');
  return (
    <figure className="loss-chart">
      <figcaption>{label}</figcaption>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label}>
        <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="2" />
      </svg>
    </figure>
  );
}
