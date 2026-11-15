import { useMemo, useState } from 'react';
import { ClassificationScene } from '../../components/ClassificationScene';
import { ButtonRow, Slider } from '../../components/Controls';
import { useDataset } from '../../components/DatasetControls';
import { LessonLayout, type LessonSection } from '../../components/LessonLayout';
import { LossChart } from '../../components/LossChart';
import { pct, Readout } from '../../components/Readout';
import { useLang } from '../../i18n/i18n';
import { accuracy } from '../../ml/datasets';
import { logisticProba, logisticStep, logLoss, type LogisticModel } from '../../ml/logistic';
import { useTrainingLoop } from '../../useTrainingLoop';

const START: LogisticModel = { w1: 0, w2: 0, b: 0 };

const txt = {
  lr: { hu: 'Tanulási ráta', en: 'Learning rate' },
  l2: { hu: 'Regularizáció (L2)', en: 'Regularisation (L2)' },
  l2Hint: {
    hu: 'Bünteti a nagy súlyokat: a görbe szelídebb, „óvatosabb” marad.',
    en: 'Penalises large weights: the curve stays gentler, more "cautious".',
  },
  speed: { hu: 'Sebesség (lépés/mp)', en: 'Speed (steps/s)' },
  loss: { hu: 'Log-veszteség', en: 'Log loss' },
  acc: { hu: 'Pontosság', en: 'Accuracy' },
  steps: { hu: 'Lépések', en: 'Steps' },
  lossChart: { hu: 'A hiba alakulása', en: 'Loss over time' },
  height: { hu: 'P(piros)', en: 'P(red)' },
};

const sections: LessonSection[] = [
  {
    heading: 'whatIsIt',
    body: {
      hu: (
        <p>
          A logisztikus regresszió <b>igen/nem kérdésekre</b> ad választ, például: spam-e egy levél, vagy beteg-e valaki.
          Nem csak azt mondja meg, melyik osztályba tartozik egy pont, hanem azt is, <b>mennyire biztos</b> benne: egy
          0 és 1 közötti valószínűséget ad. A 3D felület magassága ez a valószínűség: lent kék, fent piros.
        </p>
      ),
      en: (
        <p>
          Logistic regression answers <b>yes/no questions</b>, such as whether an email is spam or whether someone is ill.
          It does not just say which class a point belongs to, but also <b>how sure</b> it is: it outputs a probability
          between 0 and 1. The height of the 3D surface is that probability: low is blue, high is red.
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
            Először ugyanúgy egy egyenes (síkbeli) összeget számol, mint a lineáris regresszió. Ezt aztán az ún.
            <b> szigmoid függvény</b> „összenyomja” 0 és 1 közé, ezért lesz a felület S alakú lépcső.
          </p>
          <p>
            A határvonal, ahol a valószínűség pont 50%, mindig <b>egyenes</b>. Ezért ha az osztályokat nem lehet egy
            egyenessel szétválasztani (próbáld ki a Körök vagy az XOR adatokat), a modell elakad. Ezt majd a neurális háló
            oldja meg.
          </p>
        </>
      ),
      en: (
        <>
          <p>
            First it computes a straight-line (planar) sum, just like linear regression. The <b>sigmoid function</b> then
            "squashes" it between 0 and 1, which is why the surface looks like an S-shaped step.
          </p>
          <p>
            The boundary where the probability is exactly 50% is always a <b>straight line</b>. So when the classes cannot
            be separated by a line (try the Circles or XOR data), the model gets stuck. The neural network will fix that.
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
          <li>Indítsd el a tanítást a Két folt adaton, és nézd, ahogy a lapos felület lépcsővé élesedik.</li>
          <li>Növeld a regularizációt: a lépcső lankásabb lesz, a modell kevésbé magabiztos.</li>
          <li>Válts a Körök adatra: a pontosság 50% körül ragad, mert egy egyenes nem tud kört rajzolni.</li>
          <li>Forgasd el a jelenetet felülnézetbe: a fehér sáv a döntési határ.</li>
        </ul>
      ),
      en: (
        <ul>
          <li>Start training on Two blobs and watch the flat surface sharpen into a step.</li>
          <li>Increase regularisation: the step gets gentler and the model less confident.</li>
          <li>Switch to Circles: accuracy sticks around 50%, because a line cannot draw a circle.</li>
          <li>Rotate to a top-down view: the white band is the decision boundary.</li>
        </ul>
      ),
    },
  },
  {
    heading: 'math',
    body: {
      hu: (
        <>
          <p className="formula">p = σ(w₁x₁ + w₂x₂ + b),  σ(z) = 1 / (1 + e^(−z))</p>
          <p className="formula">L = −(1/n) Σ [yᵢ log pᵢ + (1 − yᵢ) log(1 − pᵢ)] + λ‖w‖²/2</p>
          <p>
            A gradiens meglepően egyszerű: ∂L/∂w = (1/n) Σ (pᵢ − yᵢ)·xᵢ + λw. A log-veszteség erősen bünteti a magabiztos
            tévedést: ha a modell 99%-ra mondja, hogy piros, de kék, az nagyon drága.
          </p>
        </>
      ),
      en: (
        <>
          <p className="formula">p = σ(w₁x₁ + w₂x₂ + b),  σ(z) = 1 / (1 + e^(−z))</p>
          <p className="formula">L = −(1/n) Σ [yᵢ log pᵢ + (1 − yᵢ) log(1 − pᵢ)] + λ‖w‖²/2</p>
          <p>
            The gradient is surprisingly simple: ∂L/∂w = (1/n) Σ (pᵢ − yᵢ)·xᵢ + λw. Log loss punishes confident mistakes
            hard: saying 99% red when the point is blue is very expensive.
          </p>
        </>
      ),
    },
  },
  {
    heading: 'usedFor',
    body: {
      hu: <p>Spamszűrés, hitelbírálat, orvosi kockázatbecslés, hirdetésre kattintás valószínűsége. Gyors, jól értelmezhető, ezért gyakran ez az első kipróbált modell.</p>,
      en: <p>Spam filtering, credit scoring, medical risk estimation, click-through prediction. It is fast and interpretable, so it is often the first model people try.</p>,
    },
  },
];

export default function LogisticRegressionLesson() {
  const { pick, t } = useLang();
  const { data, controls: dataControls } = useDataset({ kind: 'blobs', noise: 0.3 });
  const [model, setModel] = useState<LogisticModel>(START);
  const [lr, setLr] = useState(0.3);
  const [l2, setL2] = useState(0);
  const [speed, setSpeed] = useState(20);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState(0);
  const [history, setHistory] = useState<number[]>([]);

  const advance = (n: number) => {
    let m = model;
    const losses: number[] = [];
    for (let i = 0; i < n; i++) {
      m = logisticStep(m, data, lr, l2);
      losses.push(logLoss(m, data));
    }
    setModel(m);
    setSteps((s) => s + n);
    setHistory((h) => [...h, ...losses].slice(-300));
  };
  useTrainingLoop(running, speed, advance);

  const proba = useMemo(() => (a: number, b: number) => logisticProba(model, a, b), [model]);
  const acc = accuracy(data, proba);

  const reset = () => {
    setModel(START);
    setSteps(0);
    setHistory([]);
  };

  const controls = (
    <>
      <ButtonRow>
        <button className="primary" onClick={() => setRunning((r) => !r)}>
          {running ? t('pause') : t('play')}
        </button>
        <button onClick={() => advance(1)} disabled={running}>
          {t('step')}
        </button>
      </ButtonRow>
      <button className="full" onClick={reset}>
        {t('reset')}
      </button>
      <Slider label={pick(txt.lr)} value={lr} min={0.01} max={2} step={0.01} onChange={setLr} format={(v) => v.toFixed(2)} />
      <Slider label={pick(txt.l2)} hint={pick(txt.l2Hint)} value={l2} min={0} max={0.5} step={0.01} onChange={setL2} format={(v) => v.toFixed(2)} />
      <Slider label={pick(txt.speed)} value={speed} min={1} max={60} step={1} onChange={setSpeed} />
      <h3>{pick({ hu: 'Adatok', en: 'Data' })}</h3>
      {dataControls}
    </>
  );

  return (
    <LessonLayout
      category="supervised"
      title={{ hu: 'Logisztikus regresszió', en: 'Logistic regression' }}
      intro={{
        hu: 'Igen vagy nem? A modell egy S alakú valószínűségi felületet tanul meg, és ebből dönt.',
        en: 'Yes or no? The model learns an S-shaped probability surface and decides from it.',
      }}
      scene={<ClassificationScene data={data} proba={proba} heightLabel={pick(txt.height)} />}
      overlay={
        <>
          <Readout label={pick(txt.loss)} value={logLoss(model, data).toFixed(3)} />
          <Readout label={pick(txt.acc)} value={pct(acc)} />
          <Readout label={pick(txt.steps)} value={steps} />
          <LossChart history={history} label={pick(txt.lossChart)} />
        </>
      }
      controls={controls}
      sections={sections}
    />
  );
}
