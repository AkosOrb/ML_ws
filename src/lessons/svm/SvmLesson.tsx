import { useMemo, useState } from 'react';
import { ClassificationScene, Rings, Segments } from '../../components/ClassificationScene';
import { Slider } from '../../components/Controls';
import { useDataset } from '../../components/DatasetControls';
import { LessonLayout, type LessonSection } from '../../components/LessonLayout';
import { pct, Readout } from '../../components/Readout';
import { useLang } from '../../i18n/i18n';
import { accuracy, EXTENT } from '../../ml/datasets';
import { supportVectorIndices, svmDecision, svmScore, trainSvm, type Kernel, type SvmModel } from '../../ml/svm';

const txt = {
  kernel: { hu: 'Kernel', en: 'Kernel' },
  linear: { hu: 'Lineáris', en: 'Linear' },
  rbf: { hu: 'RBF (Gauss)', en: 'RBF (Gaussian)' },
  C: { hu: 'C (hibák büntetése)', en: 'C (error penalty)' },
  CHint: {
    hu: 'Kis C: széles utca, néhány pont belóghat. Nagy C: szűk utca, minden pontot jól akar besorolni.',
    en: 'Small C: wide street, some points may intrude. Large C: narrow street, tries to classify every point.',
  },
  gamma: { hu: 'γ (hatótáv)', en: 'γ (reach)' },
  gammaHint: {
    hu: 'Mekkora környezetre hat egy tartóvektor. Nagy γ: apró „buborékok” a pontok körül.',
    en: 'How far each support vector reaches. Large γ: tiny "bubbles" around points.',
  },
  acc: { hu: 'Pontosság', en: 'Accuracy' },
  sv: { hu: 'Tartóvektorok', en: 'Support vectors' },
  height: { hu: 'döntési érték', en: 'decision value' },
};

/** Segment of the line w1·x1 + w2·x2 + b = c inside the square [-E, E]², in scene coordinates. */
function lineInBox(w1: number, w2: number, b: number, c: number): [number, number, number][] {
  const E = EXTENT;
  const pts: [number, number][] = [];
  if (Math.abs(w2) > 1e-9) {
    for (const x1 of [-E, E]) {
      const x2 = (c - b - w1 * x1) / w2;
      if (x2 >= -E && x2 <= E) pts.push([x1, x2]);
    }
  }
  if (Math.abs(w1) > 1e-9) {
    for (const x2 of [-E, E]) {
      const x1 = (c - b - w2 * x2) / w1;
      if (x1 >= -E && x1 <= E) pts.push([x1, x2]);
    }
  }
  if (pts.length < 2) return [];
  return [[pts[0][0], 0.02, pts[0][1]], [pts[1][0], 0.02, pts[1][1]]];
}

function marginLines(m: SvmModel): { center: [number, number, number][]; margins: [number, number, number][] } {
  let w1 = 0;
  let w2 = 0;
  m.data.forEach((d, i) => {
    const y = d.label ? 1 : -1;
    w1 += m.alphas[i] * y * d.x1;
    w2 += m.alphas[i] * y * d.x2;
  });
  return { center: lineInBox(w1, w2, m.b, 0), margins: [...lineInBox(w1, w2, m.b, 1), ...lineInBox(w1, w2, m.b, -1)] };
}

const sections: LessonSection[] = [
  {
    heading: 'whatIsIt',
    body: {
      hu: (
        <p>
          A tartóvektor-gép (SVM) a két osztály közé a lehető <b>legszélesebb „utcát”</b> húzza. Nem az összes pont
          számít, csak azok, amelyek az utca szélén vagy belül vannak: ezek a <b>tartóvektorok</b> (sárga gyűrűvel jelölve).
          Ha a többi pontot elvennénk, a megoldás ugyanaz maradna.
        </p>
      ),
      en: (
        <p>
          A support vector machine (SVM) draws the <b>widest possible "street"</b> between the two classes. Not every point
          matters, only those on the edge of the street or inside it: these are the <b>support vectors</b> (marked with
          yellow rings). Remove all the other points and the solution stays the same.
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
            Lineáris kernelnél a padlón látod az utca közepét (folytonos vonal) és két szélét. A felület magassága a döntési
            érték: minél messzebb van egy pont az utcától, annál biztosabb a döntés.
          </p>
          <p>
            Ha az osztályok nem választhatók szét egyenessel, jön a <b>kernel-trükk</b>: az RBF kernel úgy viselkedik,
            mintha az adatokat egy magasabb dimenziós térbe emelnénk, ahol már van elválasztó sík. Visszavetítve ez görbe
            határt ad.
          </p>
        </>
      ),
      en: (
        <>
          <p>
            With the linear kernel you can see the centre of the street (solid line) and its two edges on the floor. The
            surface height is the decision value: the farther a point is from the street, the more confident the decision.
          </p>
          <p>
            When the classes cannot be separated by a line, the <b>kernel trick</b> comes in: the RBF kernel behaves as if
            the data were lifted into a higher-dimensional space where a separating plane exists. Projected back, that gives
            a curved boundary.
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
          <li>Lineáris kernelnél csökkentsd C-t: az utca kiszélesedik, és több tartóvektor lesz.</li>
          <li>Válts a Körök adatra: a lineáris SVM elbukik, az RBF kernel viszont körbe tudja fogni a belső kört.</li>
          <li>RBF-nél növeld γ-t: a felület apró buborékokra esik szét, ez a túlillesztés jele.</li>
        </ul>
      ),
      en: (
        <ul>
          <li>With the linear kernel lower C: the street widens and there are more support vectors.</li>
          <li>Switch to Circles: the linear SVM fails, but the RBF kernel can wrap around the inner circle.</li>
          <li>With RBF raise γ: the surface breaks into small bubbles, a sign of overfitting.</li>
        </ul>
      ),
    },
  },
  {
    heading: 'math',
    body: {
      hu: (
        <>
          <p className="formula">min ½‖w‖² + C · Σ max(0, 1 − yᵢ(w·xᵢ + b))</p>
          <p className="formula">f(x) = Σ αᵢ yᵢ K(xᵢ, x) + b,  K_RBF(a, b) = exp(−γ‖a − b‖²)</p>
          <p>
            Az utca szélessége 2/‖w‖, ezért a kis ‖w‖ széles utcát jelent. Csak a tartóvektoroknál nem nulla αᵢ. Itt a
            modellt az egyszerűsített SMO algoritmus tanítja; a felület σ(2·f(x)), csak a megjelenítés kedvéért.
          </p>
        </>
      ),
      en: (
        <>
          <p className="formula">min ½‖w‖² + C · Σ max(0, 1 − yᵢ(w·xᵢ + b))</p>
          <p className="formula">f(x) = Σ αᵢ yᵢ K(xᵢ, x) + b,  K_RBF(a, b) = exp(−γ‖a − b‖²)</p>
          <p>
            The street width is 2/‖w‖, so a small ‖w‖ means a wide street. Only support vectors have non-zero αᵢ. Here the
            model is trained with simplified SMO; the surface is σ(2·f(x)), purely for display.
          </p>
        </>
      ),
    },
  },
  {
    heading: 'usedFor',
    body: {
      hu: <p>Szövegosztályozás, kézírás-felismerés, bioinformatika (pl. fehérjék osztályozása). Közepes méretű, sok jellemzős adatokon a neurális hálók előtt sokáig ez volt a csúcs.</p>,
      en: <p>Text classification, handwriting recognition, bioinformatics (e.g. classifying proteins). On medium-sized data with many features it was state of the art for years before neural networks.</p>,
    },
  },
];

export default function SvmLesson() {
  const { pick } = useLang();
  const { data, controls: dataControls } = useDataset({ kind: 'blobs', count: 80, noise: 0.25 });
  const [kernel, setKernel] = useState<Kernel>('linear');
  const [logC, setLogC] = useState(0);
  const [gamma, setGamma] = useState(1);
  const C = Math.pow(10, logC);

  const model = useMemo(() => trainSvm(data, C, kernel, gamma), [data, C, kernel, gamma]);
  const proba = useMemo(() => (a: number, b: number) => svmScore(model, a, b), [model]);
  const acc = useMemo(() => accuracy(data, (a, b) => (svmDecision(model, a, b) > 0 ? 1 : 0)), [data, model]);
  const sv = useMemo(() => supportVectorIndices(model), [model]);
  const lines = useMemo(() => (kernel === 'linear' ? marginLines(model) : null), [kernel, model]);

  return (
    <LessonLayout
      category="supervised"
      title={{ hu: 'Tartóvektor-gép (SVM)', en: 'Support vector machine (SVM)' }}
      intro={{
        hu: 'A lehető legszélesebb utca a két osztály között, és a kernel-trükk, amivel görbe határ is rajzolható.',
        en: 'The widest possible street between two classes, and the kernel trick that allows curved boundaries.',
      }}
      scene={
        <ClassificationScene data={data} proba={proba} heightLabel={pick(txt.height)} surfaceOpacity={0.6}>
          <Rings data={data} indices={sv} />
          {lines && <Segments points={lines.center} color="#ffffff" />}
          {lines && <Segments points={lines.margins} color="#ffd166" opacity={0.7} />}
        </ClassificationScene>
      }
      overlay={
        <>
          <Readout label={pick(txt.acc)} value={pct(acc)} />
          <Readout label={pick(txt.sv)} value={`${sv.length} / ${data.length}`} />
        </>
      }
      controls={
        <>
          <div className="control">
            <span className="control-row">{pick(txt.kernel)}</span>
            <div className="chip-row">
              {(['linear', 'rbf'] as Kernel[]).map((k) => (
                <button key={k} className={k === kernel ? 'chip active' : 'chip'} onClick={() => setKernel(k)}>
                  {pick(txt[k])}
                </button>
              ))}
            </div>
          </div>
          <Slider label={pick(txt.C)} hint={pick(txt.CHint)} value={logC} min={-2} max={2} step={0.1} onChange={setLogC} format={() => (C < 1 ? C.toFixed(2) : C.toFixed(1))} />
          {kernel === 'rbf' && (
            <Slider label={pick(txt.gamma)} hint={pick(txt.gammaHint)} value={gamma} min={0.1} max={8} step={0.1} onChange={setGamma} format={(v) => v.toFixed(1)} />
          )}
          <h3>{pick({ hu: 'Adatok', en: 'Data' })}</h3>
          {dataControls}
        </>
      }
      sections={sections}
    />
  );
}
