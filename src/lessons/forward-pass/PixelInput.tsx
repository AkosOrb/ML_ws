import { useRef, useState } from 'react';
import { useLang, type Bilingual } from '../../i18n/i18n';
import { createRng } from '../../ml/random';
import { drawShape, fromRows, GRID, randomImage, SHAPES, type Shape } from '../../ml/pixelNet';
import { DrawPad } from '../cnn/DrawPad';

export const SHAPE_NAMES: Record<Shape, Bilingual> = {
  vertical: { hu: 'Függőleges', en: 'Vertical' },
  horizontal: { hu: 'Vízszintes', en: 'Horizontal' },
  frame: { hu: 'Keret', en: 'Frame' },
  cross: { hu: 'X', en: 'X' },
};

const CANON: Record<Shape, string[]> = {
  vertical: ['...#...', '...#...', '...#...', '...#...', '...#...', '...#...', '...#...'],
  horizontal: ['.......', '.......', '.......', '#######', '.......', '.......', '.......'],
  frame: ['.......', '.#####.', '.#...#.', '.#...#.', '.#...#.', '.#####.', '.......'],
  cross: ['#.....#', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.', '#.....#'],
};

/** Inputs the network never saw during training. */
const STRANGERS: Record<string, { name: Bilingual; rows?: string[] }> = {
  noise: { name: { hu: '🎲 Zaj', en: '🎲 Noise' } },
  blank: { name: { hu: 'Üres', en: 'Blank' }, rows: Array(7).fill('.......') },
  letterT: { name: { hu: 'T betű', en: 'Letter T' }, rows: ['.......', '.#####.', '...#...', '...#...', '...#...', '...#...', '.......'] },
  dot: { name: { hu: 'Pötty', en: 'Dot' }, rows: ['.......', '.......', '...##..', '...##..', '.......', '.......', '.......'] },
  smile: { name: { hu: 'Mosoly', en: 'Smile' }, rows: ['.......', '.#...#.', '.......', '...#...', '#.....#', '.#####.', '.......'] },
};

export const canonical = (s: Shape) => fromRows(CANON[s]);

const txt = {
  draw: { hu: 'Rajzolj a 7×7-es rácsra (Shift = radír)', en: 'Draw on the 7×7 grid (Shift = eraser)' },
  shapes: { hu: 'Amit a háló tanult', en: 'What the network learned' },
  strangers: { hu: 'Amit sosem látott', en: 'What it never saw' },
  variant: { hu: '🎲 Másik változat', en: '🎲 Another variant' },
  eraser: { hu: 'Radír', en: 'Eraser' },
};

/** The input editor: a draw pad plus sample buttons. */
export function PixelInput({ value, onChange, strangers = false }: { value: Float64Array; onChange: (x: Float64Array) => void; strangers?: boolean }) {
  const { pick } = useLang();
  const [erase, setErase] = useState(false);
  const [last, setLast] = useState<Shape>('vertical');
  const rng = useRef(createRng(42));
  return (
    <>
      <small className="panel-hint">{pick(txt.draw)}</small>
      <DrawPad img={{ size: GRID, px: Float32Array.from(value) }} onChange={(img) => onChange(Float64Array.from(img.px))} erase={erase} />
      <div className="control">
        <span className="control-row">{pick(txt.shapes)}</span>
        <div className="chip-row">
          {SHAPES.map((s) => (
            <button key={s} className="chip" onClick={() => { setLast(s); onChange(canonical(s)); }}>
              {pick(SHAPE_NAMES[s])}
            </button>
          ))}
          <button className={erase ? 'chip active' : 'chip'} aria-pressed={erase} onClick={() => setErase((e) => !e)}>
            {pick(txt.eraser)}
          </button>
        </div>
      </div>
      <button className="full" onClick={() => onChange(drawShape(last, rng.current))}>
        {pick(txt.variant)}
      </button>
      {strangers && (
        <div className="control">
          <span className="control-row">{pick(txt.strangers)}</span>
          <div className="chip-row">
            {Object.entries(STRANGERS).map(([k, s]) => (
              <button key={k} className="chip" onClick={() => onChange(s.rows ? fromRows(s.rows) : randomImage(0.3, rng.current))}>
                {pick(s.name)}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
