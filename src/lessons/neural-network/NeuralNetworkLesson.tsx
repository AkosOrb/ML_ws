import { useMemo, useState } from 'react';
import { ClassificationScene } from '../../components/ClassificationScene';
import { ButtonRow, Slider } from '../../components/Controls';
import { useDataset } from '../../components/DatasetControls';
import { LessonLayout, type LessonSection } from '../../components/LessonLayout';
import { LossChart } from '../../components/LossChart';
import { pct, Readout } from '../../components/Readout';
import { useLang } from '../../i18n/i18n';
import { accuracy } from '../../ml/datasets';
import { createMlp, mlpLoss, mlpProba, mlpStep, type Activation } from '../../ml/mlp';
import { useTrainingLoop } from '../../useTrainingLoop';
import { landscape, landscapeStep, type Ball } from '../../ml/landscape';
import { LossLandscapeScene } from './LossLandscape';
import { NetworkDiagram } from './NetworkDiagram';

const BALL_START: Ball = { x: -2.4, z: -2.4, vx: 0, vz: 0 };

const txt = {
  tabSurface: { hu: 'Döntési felület', en: 'Decision surface' },
  tabLandscape: { hu: 'Gradiens ereszkedés', en: 'Gradient descent' },
  layers: { hu: 'Rejtett rétegek', en: 'Hidden layers' },
  neurons: { hu: 'Neuronok rétegenként', en: 'Neurons per layer' },
  activation: { hu: 'Aktivációs függvény', en: 'Activation function' },
  lr: { hu: 'Tanulási ráta', en: 'Learning rate' },
  speed: { hu: 'Sebesség (lépés/mp)', en: 'Speed (steps/s)' },
  momentum: { hu: 'Lendület (momentum)', en: 'Momentum' },
  momentumHint: {
    hu: 'A golyó megtartja a sebessége egy részét, így átgurulhat a kis gödrökön.',
    en: 'The ball keeps part of its speed, so it can roll over small dips.',
  },
  pick: { hu: 'Kattints a felületre, hogy oda tedd a golyót!', en: 'Click the surface to place the ball there!' },
  diagram: {
    hu: 'A háló: piros = pozitív, kék = negatív súly; a vastagság a súly nagysága.',
    en: 'The network: red = positive, blue = negative weight; thickness is the weight size.',
  },
  loss: { hu: 'Log-veszteség', en: 'Log loss' },
  acc: { hu: 'Pontosság', en: 'Accuracy' },
  steps: { hu: 'Lépések', en: 'Steps' },
  height: { hu: 'P(piros)', en: 'P(red)' },
  lossChart: { hu: 'A hiba alakulása', en: 'Loss over time' },
  ballReset: { hu: '↺ Golyó vissza', en: '↺ Reset ball' },
  ballLoss: { hu: 'Hiba a golyó helyén', en: 'Loss at the ball' },
};

const sections: LessonSection[] = [
  {
    heading: 'whatIsIt',
    body: {
      hu: (
        <p>
          A neurális háló sok egyszerű egységből, <b>mesterséges neuronból</b> áll, amelyek rétegekbe vannak rendezve.
          Minden neuron súlyozottan összead, majd egy nemlineáris függvényen engedi át az eredményt. Egy neuron csak egy
          egyenes határt tud (ez a logisztikus regresszió), de sok neuron együtt <b>bármilyen alakú</b> határt
          megtanulhat: kört, spirált, sakktáblát.
        </p>
      ),
      en: (
        <p>
          A neural network consists of many simple units, <b>artificial neurons</b>, arranged in layers. Each neuron takes a
          weighted sum and passes it through a non-linear function. One neuron can only draw a straight boundary (that is
          logistic regression), but many neurons together can learn a boundary of <b>any shape</b>: a circle, a spiral, a
          checkerboard.
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
            A tanítás a <b>visszaterjesztéssel</b> (backpropagation) történik: a háló kiszámolja a hibát, majd hátulról
            előre haladva megnézi, melyik súly mennyivel járult hozzá, és mindegyiket egy kicsit a jó irányba igazítja.
          </p>
          <p>
            Ez a <b>gradiens ereszkedés</b>. A „Gradiens ereszkedés” fülön látod egy kétsúlyú modell hibafelületét: a golyó
            mindig a legmeredekebb lejtő felé gurul. A valódi hálóknál ugyanez történik, csak több ezer vagy milliárd
            dimenzióban.
          </p>
        </>
      ),
      en: (
        <>
          <p>
            Training uses <b>backpropagation</b>: the network computes the error, then walks backwards to see how much each
            weight contributed, and nudges every weight a little in the right direction.
          </p>
          <p>
            This is <b>gradient descent</b>. On the "Gradient descent" tab you can see the loss surface of a two-weight model:
            the ball always rolls down the steepest slope. Real networks do the same, just in thousands or billions of
            dimensions.
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
          <li>Tanítsd a hálót a Körök adaton: a felület dombbá vagy gödörré formálódik a belső kör körül.</li>
          <li>Állíts be 1 réteget 1 neuronnal: ez pont a logisztikus regresszió, és nem tudja megoldani a kört.</li>
          <li>Próbáld ki az XOR-t különböző aktivációs függvényekkel; a ReLU szögletesebb határt ad.</li>
          <li>A Gradiens ereszkedés fülön indítsd el a golyót lendület nélkül: beragad egy helyi gödörbe, pedig van mélyebb is. Tedd vissza, állítsd a lendületet 0,95-re, és próbáld újra!</li>
          <li>Túl nagy tanulási rátánál a golyó ide-oda pattog, és nem talál le.</li>
        </ul>
      ),
      en: (
        <ul>
          <li>Train the network on Circles: the surface forms a hill or a pit around the inner circle.</li>
          <li>Set 1 layer with 1 neuron: that is exactly logistic regression, and it cannot solve the circle.</li>
          <li>Try XOR with different activation functions; ReLU gives a more angular boundary.</li>
          <li>On the Gradient descent tab roll the ball with no momentum: it gets stuck in a local dip, although a deeper one exists. Put it back, set momentum to 0.95 and try again!</li>
          <li>With too high a learning rate the ball bounces around and never settles.</li>
        </ul>
      ),
    },
  },
  {
    heading: 'math',
    body: {
      hu: (
        <>
          <p className="formula">h⁽ˡ⁾ = φ(W⁽ˡ⁾ h⁽ˡ⁻¹⁾ + b⁽ˡ⁾),  p = σ(W⁽ᴸ⁾ h⁽ᴸ⁻¹⁾ + b⁽ᴸ⁾)</p>
          <p className="formula">δ⁽ˡ⁻¹⁾ = (W⁽ˡ⁾)ᵀ δ⁽ˡ⁾ ⊙ φ′(h⁽ˡ⁻¹⁾),  ∂L/∂W⁽ˡ⁾ = δ⁽ˡ⁾ (h⁽ˡ⁻¹⁾)ᵀ</p>
          <p className="formula">v ← μv − η∇L,  θ ← θ + v</p>
          <p>
            φ az aktivációs függvény (tanh, ReLU vagy szigmoid), η a tanulási ráta, μ a lendület. A kimeneti hiba
            keresztentrópiával és szigmoiddal egyszerűen δ⁽ᴸ⁾ = p − y.
          </p>
        </>
      ),
      en: (
        <>
          <p className="formula">h⁽ˡ⁾ = φ(W⁽ˡ⁾ h⁽ˡ⁻¹⁾ + b⁽ˡ⁾),  p = σ(W⁽ᴸ⁾ h⁽ᴸ⁻¹⁾ + b⁽ᴸ⁾)</p>
          <p className="formula">δ⁽ˡ⁻¹⁾ = (W⁽ˡ⁾)ᵀ δ⁽ˡ⁾ ⊙ φ′(h⁽ˡ⁻¹⁾),  ∂L/∂W⁽ˡ⁾ = δ⁽ˡ⁾ (h⁽ˡ⁻¹⁾)ᵀ</p>
          <p className="formula">v ← μv − η∇L,  θ ← θ + v</p>
          <p>
            φ is the activation function (tanh, ReLU or sigmoid), η the learning rate, μ the momentum. With cross-entropy and
            a sigmoid output, the output error is simply δ⁽ᴸ⁾ = p − y.
          </p>
        </>
      ),
    },
  },
  {
    heading: 'usedFor',
    body: {
      hu: <p>Képfelismerés, beszédfelismerés, gépi fordítás, nagy nyelvi modellek (mint a chatbotok), önvezető autók. A mai MI-áttörések szinte mind mély neurális hálókon alapulnak.</p>,
      en: <p>Image recognition, speech recognition, machine translation, large language models (like chatbots), self-driving cars. Nearly all of today's AI breakthroughs are built on deep neural networks.</p>,
    },
  },
];

export default function NeuralNetworkLesson() {
  const { pick, t } = useLang();
  const [tab, setTab] = useState<'surface' | 'landscape'>('surface');

  // --- classifier network ---
  const { data, controls: dataControls } = useDataset({ kind: 'circles', noise: 0.15 });
  const [layers, setLayers] = useState(2);
  const [neurons, setNeurons] = useState(6);
  const [activation, setActivation] = useState<Activation>('tanh');
  const [lr, setLr] = useState(0.3);
  const [speed, setSpeed] = useState(30);
  const [running, setRunning] = useState(false);
  const [seed, setSeed] = useState(1);
  const [version, setVersion] = useState(0);
  const [steps, setSteps] = useState(0);
  const [history, setHistory] = useState<number[]>([]);

  const model = useMemo(
    () => createMlp(Array(layers).fill(neurons), activation, seed),
    [layers, neurons, activation, seed],
  );
  const resetNet = () => {
    setSeed((s) => s + 1);
    setSteps(0);
    setHistory([]);
  };

  const trainNet = (n: number) => {
    const losses: number[] = [];
    for (let i = 0; i < n; i++) {
      mlpStep(model, data, lr);
      losses.push(mlpLoss(model, data));
    }
    setVersion((v) => v + 1);
    setSteps((s) => s + n);
    setHistory((h) => [...h, ...losses].slice(-300));
    const last = losses[losses.length - 1];
    return Number.isFinite(last);
  };
  useTrainingLoop(running && tab === 'surface', speed, trainNet, () => setRunning(false));

  // `version` changes after each training step because the model is mutated in place.
  const proba = useMemo(() => (a: number, b: number) => mlpProba(model, a, b), [model, version]);
  const acc = useMemo(() => accuracy(data, proba), [data, proba]);
  const loss = useMemo(() => mlpLoss(model, data), [model, data, version]);

  // --- loss landscape ---
  const [ball, setBall] = useState<Ball>(BALL_START);
  const [trail, setTrail] = useState<[number, number][]>([[BALL_START.x, BALL_START.z]]);
  const [gdLr, setGdLr] = useState(0.05);
  const [momentum, setMomentum] = useState(0);
  const [rolling, setRolling] = useState(false);
  useTrainingLoop(rolling && tab === 'landscape', 30, (n) => {
    let b = ball;
    const pts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      b = landscapeStep(b, gdLr, momentum);
      pts.push([b.x, b.z]);
    }
    setBall(b);
    setTrail((tr) => [...tr, ...pts].slice(-600));
  });
  const placeBall = (x: number, z: number) => {
    setBall({ x, z, vx: 0, vz: 0 });
    setTrail([[x, z]]);
  };

  const tabs = (
    <div className="scene-tabs">
      <button className={tab === 'surface' ? 'chip active' : 'chip'} onClick={() => setTab('surface')}>
        {pick(txt.tabSurface)}
      </button>
      <button className={tab === 'landscape' ? 'chip active' : 'chip'} onClick={() => setTab('landscape')}>
        {pick(txt.tabLandscape)}
      </button>
    </div>
  );

  const scene = (
    <>
      {tabs}
      {tab === 'surface' ? (
        <ClassificationScene data={data} proba={proba} heightLabel={pick(txt.height)} />
      ) : (
        <LossLandscapeScene ball={ball} trail={trail} onPick={placeBall} />
      )}
    </>
  );

  const surfaceControls = (
    <>
      <ButtonRow>
        <button className="primary" onClick={() => setRunning((r) => !r)}>
          {running ? t('pause') : t('play')}
        </button>
        <button onClick={() => trainNet(1)} disabled={running}>
          {t('step')}
        </button>
      </ButtonRow>
      <button className="full" onClick={resetNet}>
        {t('reset')}
      </button>
      <NetworkDiagram model={model} />
      <small className="panel-hint">{pick(txt.diagram)}</small>
      <Slider label={pick(txt.layers)} value={layers} min={1} max={3} step={1} onChange={(v) => { setLayers(v); setSteps(0); setHistory([]); }} />
      <Slider label={pick(txt.neurons)} value={neurons} min={1} max={8} step={1} onChange={(v) => { setNeurons(v); setSteps(0); setHistory([]); }} />
      <div className="control">
        <span className="control-row">{pick(txt.activation)}</span>
        <div className="chip-row">
          {(['tanh', 'relu', 'sigmoid'] as Activation[]).map((a) => (
            <button key={a} className={a === activation ? 'chip active' : 'chip'} onClick={() => { setActivation(a); setSteps(0); setHistory([]); }}>
              {a === 'relu' ? 'ReLU' : a}
            </button>
          ))}
        </div>
      </div>
      <Slider label={pick(txt.lr)} value={lr} min={0.01} max={2} step={0.01} onChange={setLr} format={(v) => v.toFixed(2)} />
      <Slider label={pick(txt.speed)} value={speed} min={1} max={120} step={1} onChange={setSpeed} />
      <h3>{pick({ hu: 'Adatok', en: 'Data' })}</h3>
      {dataControls}
    </>
  );

  const landscapeControls = (
    <>
      <small className="panel-hint">{pick(txt.pick)}</small>
      <ButtonRow>
        <button className="primary" onClick={() => setRolling((r) => !r)}>
          {rolling ? t('pause') : t('play')}
        </button>
        <button onClick={() => placeBall(BALL_START.x, BALL_START.z)}>{pick(txt.ballReset)}</button>
      </ButtonRow>
      <Slider label={pick(txt.lr)} value={gdLr} min={0.005} max={0.6} step={0.005} onChange={setGdLr} format={(v) => v.toFixed(3)} />
      <Slider label={pick(txt.momentum)} hint={pick(txt.momentumHint)} value={momentum} min={0} max={0.95} step={0.05} onChange={setMomentum} format={(v) => v.toFixed(2)} />
    </>
  );

  const overlay =
    tab === 'surface' ? (
      <>
        <Readout label={pick(txt.loss)} value={Number.isFinite(loss) ? loss.toFixed(3) : '∞'} />
        <Readout label={pick(txt.acc)} value={pct(acc)} />
        <Readout label={pick(txt.steps)} value={steps} />
        <LossChart history={history} label={pick(txt.lossChart)} />
      </>
    ) : (
      <Readout label={pick(txt.ballLoss)} value={landscape(ball.x, ball.z).toFixed(3)} />
    );

  return (
    <LessonLayout
      category="deep"
      title={{ hu: 'Neurális háló', en: 'Neural network' }}
      intro={{
        hu: 'Rétegekbe szervezett mesterséges neuronok, amelyek gradiens ereszkedéssel bármilyen alakú határt megtanulnak.',
        en: 'Layers of artificial neurons that learn boundaries of any shape through gradient descent.',
      }}
      scene={scene}
      overlay={overlay}
      controls={tab === 'surface' ? surfaceControls : landscapeControls}
      sections={sections}
    />
  );
}
