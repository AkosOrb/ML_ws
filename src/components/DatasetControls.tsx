import { useMemo, useState } from 'react';
import { useLang } from '../i18n/i18n';
import { DATASET_KINDS, makeDataset, type DatasetKind } from '../ml/datasets';
import { Slider } from './Controls';

const names: Record<DatasetKind, { hu: string; en: string }> = {
  blobs: { hu: 'Két folt', en: 'Two blobs' },
  xor: { hu: 'XOR (sakktábla)', en: 'XOR (checkerboard)' },
  circles: { hu: 'Körök', en: 'Circles' },
  moons: { hu: 'Holdak', en: 'Moons' },
};

const txt = {
  dataset: { hu: 'Adathalmaz', en: 'Dataset' },
  points: { hu: 'Pontok száma', en: 'Number of points' },
  noise: { hu: 'Zaj', en: 'Noise' },
  newData: { hu: '🎲 Új adatok', en: '🎲 New data' },
};

/** Dataset picker shared by all two-feature classification lessons. */
export function useDataset(initial: { kind: DatasetKind; count?: number; noise?: number }) {
  const { pick } = useLang();
  const [kind, setKind] = useState<DatasetKind>(initial.kind);
  const [count, setCount] = useState(initial.count ?? 120);
  const [noise, setNoise] = useState(initial.noise ?? 0.2);
  const [seed, setSeed] = useState(1);
  const data = useMemo(() => makeDataset(kind, count, noise, seed), [kind, count, noise, seed]);

  const controls = (
    <>
      <div className="control">
        <span className="control-row">{pick(txt.dataset)}</span>
        <div className="chip-row">
          {DATASET_KINDS.map((k) => (
            <button key={k} className={k === kind ? 'chip active' : 'chip'} onClick={() => setKind(k)}>
              {pick(names[k])}
            </button>
          ))}
        </div>
      </div>
      <Slider label={pick(txt.points)} value={count} min={20} max={300} step={10} onChange={setCount} />
      <Slider label={pick(txt.noise)} value={noise} min={0} max={1} step={0.05} onChange={setNoise} format={(v) => v.toFixed(2)} />
      <button className="full" onClick={() => setSeed((s) => s + 1)}>
        {pick(txt.newData)}
      </button>
    </>
  );

  return { data, kind, controls };
}
