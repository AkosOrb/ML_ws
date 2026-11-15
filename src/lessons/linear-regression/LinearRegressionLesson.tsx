import { useEffect, useMemo, useRef, useState } from 'react';
import { ButtonRow, Slider, Toggle } from '../../components/Controls';
import { LessonLayout, type LessonSection } from '../../components/LessonLayout';
import { useLang } from '../../i18n/i18n';
import { generateData, gradientStep, mse, TRUE_PLANE, type Plane } from '../../ml/linearRegression';
import { LossChart } from '../../components/LossChart';
import { RegressionScene } from './RegressionScene';

const START: Plane = { w1: 0, w2: 0, b: 0 };
const HISTORY_LIMIT = 300;
const DIVERGED = 1e6;

const txt = {
  axisX1: { hu: 'alapterület', en: 'floor area' },
  axisX2: { hu: 'kor', en: 'age' },
  axisY: { hu: 'ár', en: 'price' },
  points: { hu: 'Pontok száma', en: 'Number of points' },
  noise: { hu: 'Zaj', en: 'Noise' },
  noiseHint: { hu: 'Mennyire szórnak a pontok a valódi sík körül.', en: 'How much the points scatter around the true plane.' },
  lr: { hu: 'Tanulási ráta', en: 'Learning rate' },
  lrHint: {
    hu: 'Mekkorát lép a modell egyszerre. Túl nagy értéknél „túllő” és szétesik (próbáld ki 0,35 felett!).',
    en: 'How big a step the model takes at once. Too large and it overshoots and blows up (try above 0.35!).',
  },
  speed: { hu: 'Sebesség (lépés/mp)', en: 'Speed (steps/s)' },
  residuals: { hu: 'Hibák (maradékok) mutatása', en: 'Show errors (residuals)' },
  truth: { hu: 'Valódi sík mutatása', en: 'Show the true plane' },
  manual: { hu: 'Kézi hangolás', en: 'Tune by hand' },
  manualHint: {
    hu: 'Állítsd be te a síkot, és figyeld, hogyan változik a hiba!',
    en: 'Set the plane yourself and watch how the error changes!',
  },
  w1: { hu: 'w₁ (alapterület súlya)', en: 'w₁ (floor-area weight)' },
  w2: { hu: 'w₂ (kor súlya)', en: 'w₂ (age weight)' },
  b: { hu: 'b (eltolás)', en: 'b (intercept)' },
  loss: { hu: 'Átlagos négyzetes hiba (MSE)', en: 'Mean squared error (MSE)' },
  steps: { hu: 'Lépések', en: 'Steps' },
  lossChart: { hu: 'A hiba alakulása', en: 'Loss over time' },
  diverged: {
    hu: 'A modell szétesett: túl nagy a tanulási ráta. Csökkentsd, és állítsd vissza a modellt.',
    en: 'The model blew up: the learning rate is too high. Lower it and reset the model.',
  },
};

const sections: LessonSection[] = [
  {
    heading: 'whatIsIt',
    body: {
      hu: (
        <p>
          Képzeld el, hogy lakásárakat szeretnél megbecsülni. Tudod sok lakás <b>alapterületét</b>, <b>korát</b> és
          <b> árát</b>. A lineáris regresszió olyan egyszerű szabályt keres, ami a két ismert adatból a lehető
          legpontosabban megjósolja az árat. Két bemenetnél ez a szabály egy <b>sík</b> a térben: a sík magassága
          egy adott pontban a jósolt ár.
        </p>
      ),
      en: (
        <p>
          Imagine you want to estimate flat prices. You know the <b>floor area</b>, <b>age</b> and <b>price</b> of many
          flats. Linear regression looks for a simple rule that predicts the price from the two known values as
          accurately as possible. With two inputs that rule is a <b>plane</b> in space: its height at a point is the
          predicted price.
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
            A sárga függőleges vonalak a <b>hibák</b>: mennyivel tér el a jóslat a valódi ártól. A piros pontok a sík
            fölött, a kékek alatta vannak. A modell célja, hogy ezeknek a hibáknak a négyzetes átlaga (MSE) a lehető
            legkisebb legyen.
          </p>
          <p>
            Ehhez a <b>gradiens ereszkedést</b> használja: minden lépésben megnézi, merre billentve a síkot csökkenne a
            hiba a leggyorsabban, és arra mozdul egy kicsit. Olyan ez, mint amikor ködben ereszkedsz le egy hegyről:
            mindig a legmeredekebb lejtő felé lépsz.
          </p>
        </>
      ),
      en: (
        <>
          <p>
            The yellow vertical lines are the <b>errors</b>: how far each prediction is from the real price. Red points
            lie above the plane, blue ones below it. The model's goal is to make the mean of the squared errors (MSE) as
            small as possible.
          </p>
          <p>
            To do that it uses <b>gradient descent</b>: at every step it checks which way of tilting the plane would
            reduce the error fastest, and moves a little in that direction. It is like walking down a mountain in fog:
            you always step towards the steepest downhill slope.
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
          <li>Indítsd el a tanítást, és figyeld, ahogy a kék sík a pontokhoz simul, a hibagörbe pedig leesik.</li>
          <li>Kapcsold be a valódi síkot: a modell nagyon közel jut hozzá, de zajos adatnál soha nem pontosan.</li>
          <li>Növeld a zajt: a hiba nem megy le nullára, mert a véletlen szórást semmilyen sík nem tudja megjósolni.</li>
          <li>Állítsd a tanulási rátát 0,35 fölé, és nézd meg, mi történik.</li>
          <li>Szüneteltesd a tanítást, és próbáld meg kézzel jobban beállítani a síkot, mint a gép!</li>
        </ul>
      ),
      en: (
        <ul>
          <li>Start training and watch the blue plane settle onto the points while the loss curve drops.</li>
          <li>Show the true plane: the model gets very close, but with noisy data never exactly there.</li>
          <li>Increase the noise: the error does not reach zero, because no plane can predict random scatter.</li>
          <li>Set the learning rate above 0.35 and see what happens.</li>
          <li>Pause training and try to tune the plane by hand better than the machine!</li>
        </ul>
      ),
    },
  },
  {
    heading: 'math',
    body: {
      hu: (
        <>
          <p className="formula">ŷ = w₁·x₁ + w₂·x₂ + b</p>
          <p className="formula">MSE = (1/n) · Σ (ŷᵢ − yᵢ)²</p>
          <p className="formula">w ← w − η · ∂MSE/∂w</p>
          <p>
            Itt η a tanulási ráta. A deriváltak: ∂MSE/∂w₁ = (2/n)·Σ(ŷᵢ − yᵢ)·x₁ᵢ, hasonlóan w₂-re, b-re pedig a
            szorzó 1. Lineáris regressziónál létezik zárt képlet is (normálegyenlet), de a gradiens ereszkedés ugyanaz
            az ötlet, amivel a neurális hálókat is tanítják.
          </p>
        </>
      ),
      en: (
        <>
          <p className="formula">ŷ = w₁·x₁ + w₂·x₂ + b</p>
          <p className="formula">MSE = (1/n) · Σ (ŷᵢ − yᵢ)²</p>
          <p className="formula">w ← w − η · ∂MSE/∂w</p>
          <p>
            Here η is the learning rate. The derivatives are ∂MSE/∂w₁ = (2/n)·Σ(ŷᵢ − yᵢ)·x₁ᵢ, likewise for w₂, and with
            a factor of 1 for b. Linear regression also has a closed-form solution (the normal equation), but gradient
            descent is the same idea used to train neural networks.
          </p>
        </>
      ),
    },
  },
  {
    heading: 'usedFor',
    body: {
      hu: <p>Ingatlanárak, kereslet-előrejelzés, orvosi mérések összefüggései, vagy bármi, ahol számot kell jósolni és fontos, hogy a modell könnyen értelmezhető legyen.</p>,
      en: <p>House prices, demand forecasting, relationships in medical measurements, or anywhere a number must be predicted and the model should be easy to interpret.</p>,
    },
  },
];

export default function LinearRegressionLesson() {
  const { pick, t } = useLang();
  const [count, setCount] = useState(60);
  const [noise, setNoise] = useState(0.6);
  const [seed, setSeed] = useState(1);
  const [lr, setLr] = useState(0.03);
  const [speed, setSpeed] = useState(15);
  const [running, setRunning] = useState(false);
  const [showResiduals, setShowResiduals] = useState(true);
  const [showTruth, setShowTruth] = useState(false);
  const [plane, setPlane] = useState<Plane>(START);
  const [steps, setSteps] = useState(0);
  const [history, setHistory] = useState<number[]>([]);

  const data = useMemo(() => generateData(count, noise, seed), [count, noise, seed]);
  const loss = mse(plane, data);
  const diverged = !Number.isFinite(loss) || loss > DIVERGED;

  // Keep the latest values reachable from the animation loop without restarting it.
  const live = useRef({ data, lr, speed, plane });
  live.current = { data, lr, speed, plane };

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      acc += ((now - last) / 1000) * live.current.speed;
      last = now;
      const n = Math.min(Math.floor(acc), 20);
      if (n > 0) {
        acc -= n;
        let p = live.current.plane;
        const newLosses: number[] = [];
        for (let i = 0; i < n; i++) {
          p = gradientStep(p, live.current.data, live.current.lr);
          newLosses.push(mse(p, live.current.data));
        }
        live.current.plane = p;
        setPlane(p);
        setSteps((s) => s + n);
        setHistory((h) => [...h, ...newLosses].slice(-HISTORY_LIMIT));
        const l = newLosses[newLosses.length - 1];
        if (!Number.isFinite(l) || l > DIVERGED) {
          setRunning(false);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const resetModel = () => {
    setPlane(START);
    setSteps(0);
    setHistory([]);
  };

  const setManual = (patch: Partial<Plane>) => {
    setRunning(false);
    setPlane((p) => ({ ...p, ...patch }));
  };

  const fmt = (v: number) => (Number.isFinite(v) ? (Math.abs(v) >= 1000 ? v.toExponential(1) : v.toFixed(3)) : '∞');

  const controls = (
    <>
      <ButtonRow>
        <button className="primary" onClick={() => setRunning((r) => !r)} disabled={diverged && !running}>
          {running ? t('pause') : t('play')}
        </button>
        <button
          onClick={() => {
            const p = gradientStep(plane, data, lr);
            setPlane(p);
            setSteps((s) => s + 1);
            setHistory((h) => [...h, mse(p, data)].slice(-HISTORY_LIMIT));
          }}
          disabled={running || diverged}
        >
          {t('step')}
        </button>
      </ButtonRow>
      <ButtonRow>
        <button onClick={resetModel}>{t('reset')}</button>
        <button onClick={() => setSeed((s) => s + 1)}>{t('newData')}</button>
      </ButtonRow>

      <Slider label={pick(txt.lr)} hint={pick(txt.lrHint)} value={lr} min={0.005} max={0.4} step={0.005} onChange={setLr} format={(v) => v.toFixed(3)} />
      <Slider label={pick(txt.speed)} value={speed} min={1} max={60} step={1} onChange={setSpeed} />
      <Slider label={pick(txt.points)} value={count} min={5} max={300} step={5} onChange={setCount} />
      <Slider label={pick(txt.noise)} hint={pick(txt.noiseHint)} value={noise} min={0} max={2} step={0.05} onChange={setNoise} format={(v) => v.toFixed(2)} />
      <Toggle label={pick(txt.residuals)} checked={showResiduals} onChange={setShowResiduals} />
      <Toggle label={pick(txt.truth)} checked={showTruth} onChange={setShowTruth} />

      <h3>{pick(txt.manual)}</h3>
      <small className="panel-hint">{pick(txt.manualHint)}</small>
      <Slider label={pick(txt.w1)} value={clamp(plane.w1)} min={-2} max={2} step={0.01} onChange={(w1) => setManual({ w1 })} format={(v) => v.toFixed(2)} />
      <Slider label={pick(txt.w2)} value={clamp(plane.w2)} min={-2} max={2} step={0.01} onChange={(w2) => setManual({ w2 })} format={(v) => v.toFixed(2)} />
      <Slider label={pick(txt.b)} value={clamp(plane.b)} min={-2} max={2} step={0.01} onChange={(b) => setManual({ b })} format={(v) => v.toFixed(2)} />
    </>
  );

  const overlay = (
    <>
      <div className="readout">
        <span>{pick(txt.loss)}</span>
        <strong>{fmt(loss)}</strong>
      </div>
      <div className="readout">
        <span>{pick(txt.steps)}</span>
        <strong>{steps}</strong>
      </div>
      <div className="readout equation">
        ŷ = {fmt(plane.w1)}·x₁ {plane.w2 < 0 ? '−' : '+'} {fmt(Math.abs(plane.w2))}·x₂ {plane.b < 0 ? '−' : '+'} {fmt(Math.abs(plane.b))}
      </div>
      <LossChart history={history} label={pick(txt.lossChart)} />
      {diverged && <div className="warning">{pick(txt.diverged)}</div>}
    </>
  );

  return (
    <LessonLayout
      category="supervised"
      title={{ hu: 'Lineáris regresszió', en: 'Linear regression' }}
      intro={{
        hu: 'Hogyan tanul meg egy gép számokat jósolni? Egy síkot illeszt a pontokra, lépésről lépésre csökkentve a hibát.',
        en: 'How does a machine learn to predict numbers? It fits a plane to the points, reducing the error step by step.',
      }}
      scene={
        <RegressionScene
          data={data}
          plane={diverged ? START : plane}
          truth={TRUE_PLANE}
          showResiduals={showResiduals && !diverged}
          showTruth={showTruth}
          axisLabels={{ x1: pick(txt.axisX1), x2: pick(txt.axisX2), y: pick(txt.axisY) }}
        />
      }
      overlay={overlay}
      controls={controls}
      sections={sections}
    />
  );
}

function clamp(v: number) {
  return Number.isFinite(v) ? Math.max(-2, Math.min(2, v)) : 0;
}
