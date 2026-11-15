export function Readout({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="readout">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export const pct = (v: number) => `${Math.round(v * 100)}%`;
