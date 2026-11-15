import { localizeNumbers, useLang } from '../i18n/i18n';
export function Readout({ label, value }: { label: string; value: string | number }) {
  const { lang } = useLang();
  return (
    <div className="readout">
      <span>{label}</span>
      <strong>{localizeNumbers(String(value), lang)}</strong>
    </div>
  );
}

export const pct = (v: number) => `${Math.round(v * 100)}%`;
