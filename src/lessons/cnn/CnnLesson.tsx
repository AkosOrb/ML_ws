import { useMemo, useState } from 'react';
import { ButtonRow, Slider } from '../../components/Controls';
import { LessonLayout, type LessonSection } from '../../components/LessonLayout';
import { Readout } from '../../components/Readout';
import { useLang } from '../../i18n/i18n';
import { blank, convRelu, KERNELS, maxPool, preset, PRESET_NAMES, type Img, type Kernel } from '../../ml/conv';
import { useTrainingLoop } from '../../useTrainingLoop';
import { CnnScene, type MapSpec } from './CnnScene';
import { DrawPad } from './DrawPad';

const FILTER_IDS = Object.keys(KERNELS);
const FILTER_COLORS: Record<string, string> = {
  vertical: '#4f9dff',
  horizontal: '#e8553a',
  diagonal: '#3ccf91',
  blur: '#ffb547',
  sharpen: '#e8553a',
  outline: '#36d6e7',
};

const txt = {
  filters: { hu: 'Szűrők (max. 4)', en: 'Filters (max. 4)' },
  vertical: { hu: 'Függőleges él', en: 'Vertical edge' },
  horizontal: { hu: 'Vízszintes él', en: 'Horizontal edge' },
  diagonal: { hu: 'Átlós él', en: 'Diagonal edge' },
  blur: { hu: 'Elmosás', en: 'Blur' },
  sharpen: { hu: 'Élesítés', en: 'Sharpen' },
  outline: { hu: 'Körvonal', en: 'Outline' },
  draw: { hu: 'Rajzolj! (húzd az egeret; Shift = radír)', en: 'Draw! (drag the mouse; Shift = eraser)' },
  eraser: { hu: 'Radír', en: 'Eraser' },
  pen: { hu: 'Toll', en: 'Pen' },
  clear: { hu: 'Törlés', en: 'Clear' },
  presets: { hu: 'Minták', en: 'Samples' },
  seven: { hu: '7-es', en: 'Seven' },
  zero: { hu: '0-s', en: 'Zero' },
  cross: { hu: 'X', en: 'X' },
  square: { hu: 'Négyzet', en: 'Square' },
  kernel: { hu: 'A kiválasztott szűrő számai (szerkeszthető)', en: "The selected filter's numbers (editable)" },
  slide: { hu: '▶ Szűrő csúsztatása', en: '▶ Slide the filter' },
  pos: { hu: 'Szűrő helye', en: 'Filter position' },
  sum: { hu: 'Szorzatösszeg → ReLU', en: 'Sum of products → ReLU' },
  input: { hu: 'Bemenet 20×20', en: 'Input 20×20' },
  conv: { hu: 'Konvolúció + ReLU 18×18', en: 'Convolution + ReLU 18×18' },
  pool: { hu: 'Max-pooling 9×9', en: 'Max pooling 9×9' },
};

const sections: LessonSection[] = [
  {
    heading: 'whatIsIt',
    body: {
      hu: (
        <p>
          A konvolúciós neurális háló (CNN) a <b>képfelismerés</b> alapja. Ahelyett, hogy minden pixelt külön súllyal kötne
          össze, kis <b>szűrőket</b> (pl. 3×3-as számtáblákat) csúsztat végig a képen. Minden szűrő egy egyszerű mintát keres,
          például függőleges vagy vízszintes élt, és ahol megtalálja, ott „felvillan” a kimenete.
        </p>
      ),
      en: (
        <p>
          A convolutional neural network (CNN) is the backbone of <b>image recognition</b>. Instead of connecting every pixel
          with its own weight, it slides small <b>filters</b> (e.g. 3×3 grids of numbers) across the image. Each filter looks
          for a simple pattern, such as a vertical or horizontal edge, and its output "lights up" where it finds one.
        </p>
      ),
    },
  },
  {
    heading: 'howItWorks',
    body: {
      hu: (
        <>
          <p>
            <b>1. Konvolúció:</b> a szűrő minden helyen összeszorozza a 3×3-as képrészlet pixeleit a saját számaival, és
            összeadja őket. A <b>ReLU</b> a negatív eredményeket nullára vágja. Az eredmény a <b>jellemzőtérkép</b>: a 3D-s
            oszlopok magassága mutatja, mennyire talált egyezést a szűrő.
          </p>
          <p>
            <b>2. Pooling:</b> a max-pooling minden 2×2-es négyzetből csak a legnagyobb értéket tartja meg. A kép kisebb lesz,
            de a lényeg megmarad, és a háló kevésbé lesz érzékeny arra, ha a rajz kicsit elcsúszik.
          </p>
          <p>
            Egy igazi CNN-ben a szűrők számait <b>nem mi adjuk meg, hanem a háló tanulja meg</b>, és sok ilyen réteg követi
            egymást: az elsők éleket, a későbbiek sarkokat és íveket, a legmélyebbek szemeket, kerekeket, arcokat ismernek fel.
          </p>
        </>
      ),
      en: (
        <>
          <p>
            <b>1. Convolution:</b> at every position the filter multiplies the 3×3 image patch by its own numbers and adds them
            up. <b>ReLU</b> clips negative results to zero. The result is a <b>feature map</b>: the height of the 3D bars shows
            how well the filter matched.
          </p>
          <p>
            <b>2. Pooling:</b> max pooling keeps only the largest value from each 2×2 square. The image gets smaller but keeps
            the essentials, and the network becomes less sensitive to a drawing shifting slightly.
          </p>
          <p>
            In a real CNN the filter numbers are <b>not set by us but learned by the network</b>, and many such layers follow
            each other: the first detect edges, later ones corners and curves, the deepest ones eyes, wheels, faces.
          </p>
        </>
      ),
    },
  },
  {
    heading: 'tryIt',
    body: {
      hu: (
        <ul>
          <li>Válaszd a 7-es mintát: a vízszintes él szűrő a felső vonalat, a függőleges a szárát emeli ki.</li>
          <li>Indítsd el a csúsztatást, és kövesd a sárga keretet: a panelen látod a szorzatösszeget is.</li>
          <li>Rajzolj saját ábrát, és nézd, melyik szűrő reagál rá a legjobban.</li>
          <li>Írd át egy szűrő számait (pl. fordítsd meg az előjeleket): a háló most az ellenkező irányú éleket keresi.</li>
        </ul>
      ),
      en: (
        <ul>
          <li>Pick the seven: the horizontal-edge filter highlights the top stroke, the vertical one the stem.</li>
          <li>Start sliding and follow the yellow frame: the panel shows the sum of products too.</li>
          <li>Draw your own shape and see which filter responds most.</li>
          <li>Edit a filter's numbers (e.g. flip the signs): it now looks for edges in the opposite direction.</li>
        </ul>
      ),
    },
  },
  {
    heading: 'math',
    body: {
      hu: (
        <>
          <p className="formula">F(i, j) = ReLU( Σ_{'{'}u,v ∈ 0..2{'}'} I(i + u, j + v) · K(u, v) + b )</p>
          <p className="formula">P(i, j) = max F(2i + {'{'}0,1{'}'}, 2j + {'{'}0,1{'}'})</p>
          <p>
            Egy 3×3-as szűrőnek csak 9 súlya van, és ugyanazt a 9 számot használja a kép minden pontján (súlymegosztás). Ezért
            sokkal kevesebb paraméter kell, mint egy teljesen összekötött hálóban, és a háló bárhol felismeri ugyanazt a mintát.
          </p>
        </>
      ),
      en: (
        <>
          <p className="formula">F(i, j) = ReLU( Σ_{'{'}u,v ∈ 0..2{'}'} I(i + u, j + v) · K(u, v) + b )</p>
          <p className="formula">P(i, j) = max F(2i + {'{'}0,1{'}'}, 2j + {'{'}0,1{'}'})</p>
          <p>
            A 3×3 filter has only 9 weights, and it reuses those same 9 numbers at every position (weight sharing). So it needs
            far fewer parameters than a fully connected network, and it recognises the same pattern anywhere in the image.
          </p>
        </>
      ),
    },
  },
  {
    heading: 'usedFor',
    body: {
      hu: <p>Arcfelismerés a telefonon, orvosi képek (röntgen, MRI) elemzése, önvezető autók kamerái, kézírás- és rendszámfelismerés, minőségellenőrzés a gyártósoron.</p>,
      en: <p>Face unlock on phones, medical imaging (X-ray, MRI), cameras in self-driving cars, handwriting and number-plate recognition, quality control on production lines.</p>,
    },
  },
];

export default function CnnLesson() {
  const { pick, lang } = useLang();
  const [img, setImg] = useState<Img>(() => preset('seven'));
  const [erase, setErase] = useState(false);
  const [active, setActive] = useState<string[]>(['vertical', 'horizontal', 'diagonal']);
  const [kernels, setKernels] = useState<Record<string, Kernel>>(() => ({ ...KERNELS }));
  const [selected, setSelected] = useState('vertical');
  const [pos, setPos] = useState(0);
  const [sliding, setSliding] = useState(false);
  const convN = img.size - 2;
  const probe = { x: pos % convN, y: Math.floor(pos / convN) };

  useTrainingLoop(sliding, 12, (n) => {
    setPos((p) => (p + n) % (convN * convN));
  });

  const maps: MapSpec[] = useMemo(
    () =>
      active.map((id) => {
        const conv = convRelu(img, kernels[id]);
        return { conv, pooled: maxPool(conv), color: FILTER_COLORS[id], label: pick(txt[id as keyof typeof txt]) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [img, active, kernels, lang],
  );

  const toggleFilter = (id: string) => {
    setSelected(id);
    setActive((a) => (a.includes(id) ? (a.length > 1 ? a.filter((x) => x !== id) : a) : a.length < 4 ? [...a, id] : a));
  };

  const k = kernels[selected];
  const patch = Array.from({ length: 9 }, (_, i) => img.px[(probe.y + Math.floor(i / 3)) * img.size + probe.x + (i % 3)]);
  const sum = patch.reduce((s, v, i) => s + v * k[i], 0);

  return (
    <LessonLayout
      category="deep"
      title={{ hu: 'Konvolúciós háló (CNN)', en: 'Convolutional network (CNN)' }}
      intro={{
        hu: 'Hogyan „lát” egy gép? Kis szűrők csúsznak végig a képen, és éleket, mintákat keresnek benne.',
        en: 'How does a machine "see"? Small filters slide across the image, looking for edges and patterns.',
      }}
      scene={<CnnScene input={img} maps={maps} probe={probe} labels={{ input: pick(txt.input), conv: pick(txt.conv), pool: pick(txt.pool) }} />}
      overlay={
        <>
          <Readout label={pick(txt.pos)} value={`(${probe.x + 1}, ${probe.y + 1})`} />
          <div className="readout kernel-math">
            <span>
              {pick(txt.sum)} <i style={{ color: FILTER_COLORS[selected] }}>{pick(txt[selected as keyof typeof txt])}</i>
            </span>
            <div className="kernel-grid">
              {k.map((kv, i) => (
                <span key={i} className={patch[i] ? 'on' : ''}>
                  {patch[i]}×{Number.isInteger(kv) ? kv : kv.toFixed(2)}
                </span>
              ))}
            </div>
            <strong>
              = {sum.toFixed(2)} → {Math.max(0, sum).toFixed(2)}
            </strong>
          </div>
        </>
      }
      controls={
        <>
          <small className="panel-hint">{pick(txt.draw)}</small>
          <DrawPad img={img} onChange={setImg} erase={erase} highlight={probe} />
          <ButtonRow>
            <button className={erase ? '' : 'primary'} onClick={() => setErase(false)}>{pick(txt.pen)}</button>
            <button className={erase ? 'primary' : ''} onClick={() => setErase(true)}>{pick(txt.eraser)}</button>
            <button onClick={() => setImg(blank(20))}>{pick(txt.clear)}</button>
          </ButtonRow>
          <div className="control">
            <span className="control-row">{pick(txt.presets)}</span>
            <div className="chip-row">
              {PRESET_NAMES.map((p) => (
                <button key={p} className="chip" onClick={() => setImg(preset(p))}>
                  {pick(txt[p as keyof typeof txt])}
                </button>
              ))}
            </div>
          </div>
          <div className="control">
            <span className="control-row">{pick(txt.filters)}</span>
            <div className="chip-row">
              {FILTER_IDS.map((id) => (
                <button
                  key={id}
                  className={active.includes(id) ? 'chip active' : 'chip'}
                  style={active.includes(id) ? { background: FILTER_COLORS[id], borderColor: FILTER_COLORS[id] } : undefined}
                  onClick={() => toggleFilter(id)}
                >
                  {pick(txt[id as keyof typeof txt])}
                </button>
              ))}
            </div>
          </div>
          <div className="control">
            <span className="control-row">{pick(txt.kernel)}</span>
            <div className="kernel-edit">
              {k.map((kv, i) => (
                <input
                  key={i}
                  type="number"
                  step="0.5"
                  value={Number.isInteger(kv) ? kv : Number(kv.toFixed(2))}
                  onChange={(e) => {
                    const next = [...k];
                    next[i] = Number(e.target.value) || 0;
                    setKernels((ks) => ({ ...ks, [selected]: next }));
                  }}
                />
              ))}
            </div>
          </div>
          <ButtonRow>
            <button className="primary" onClick={() => setSliding((s) => !s)}>
              {sliding ? pick({ hu: '⏸ Szünet', en: '⏸ Pause' }) : pick(txt.slide)}
            </button>
          </ButtonRow>
          <Slider label={pick(txt.pos)} value={pos} min={0} max={convN * convN - 1} step={1} onChange={setPos} format={() => `${probe.x + 1}, ${probe.y + 1}`} />
        </>
      }
      sections={sections}
    />
  );
}
