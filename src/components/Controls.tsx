import type { ReactNode } from 'react';
import { localizeNumbers, useLang } from '../i18n/i18n';

interface SliderProps {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}

export function Slider({ label, hint, value, min, max, step, onChange, format }: SliderProps) {
  const { lang } = useLang();
  return (
    <label className="control">
      <span className="control-row">
        <span>{label}</span>
        <output>{localizeNumbers(format ? format(value) : String(value), lang)}</output>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="control toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export function ButtonRow({ children }: { children: ReactNode }) {
  return <div className="button-row">{children}</div>;
}
