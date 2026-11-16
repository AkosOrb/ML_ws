import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { CLASS_COLORS, ClassificationScene, SURFACE_H, toScene } from '../../components/ClassificationScene';
import { ButtonRow, Slider, Toggle } from '../../components/Controls';
import { LessonLayout, type LessonSection } from '../../components/LessonLayout';
import { pct, Readout } from '../../components/Readout';
import { TrainTestChart, type TrainTestPoint } from '../../components/TrainTestChart';
import { useLang } from '../../i18n/i18n';
import { accuracy, DATASET_KINDS, makeDataset, type DatasetKind, type Sample } from '../../ml/datasets';
import { cloneMlp, copyMlpInto, createMlp, mlpLoss, mlpProba, mlpStep, type Mlp } from '../../ml/mlp';
import { useTrainingLoop } from '../../useTrainingLoop';

const txt = {
  layers: { hu: 'Rejtett rétegek', en: 'Hidden layers' },
  neurons: { hu: 'Neuronok rétegenként', en: 'Neurons per layer' },
  capacityHint: { hu: 'Több neuron = nagyobb „kapacitás”: a háló több részletet, akár a zajt is meg tudja jegyezni.', en: 'More neurons = more "capacity": the network can memorise more detail, even the noise.' },
  trainCount: { hu: 'Tanítópontok száma', en: 'Training points' },
  noise: { hu: 'Zaj (címkehibák, átfedés)', en: 'Noise (overlap, label errors)' },
  dataset: { hu: 'Adathalmaz', en: 'Dataset' },
  l2: { hu: 'L2-regularizáció (súlycsökkentés) λ', en: 'L2 regularisation (weight decay) λ' },
  l2Hint: { hu: 'Bünteti a nagy súlyokat, így simább határt kényszerít ki.', en: 'Penalises large weights, which forces a smoother boundary.' },
  lr: { hu: 'Tanulási ráta', en: 'Learning rate' },
  speed: { hu: 'Sebesség (lépés/mp)', en: 'Speed (steps/s)' },
  showTest: { hu: 'Tesztpontok mutatása (karikák)', en: 'Show test points (rings)' },
  early: { hu: 'Korai leállítás', en: 'Early stopping' },
  earlyHint: { hu: 'Megáll, ha a teszthiba már jóval a legjobb érték fölé nőtt.', en: 'Stops once the test loss has risen well above its best value.' },
  restore: { hu: '↶ Vissza a legjobb állapothoz', en: '↶ Back to the best state' },
  newData: { hu: '🎲 Új minta', en: '🎲 New sample' },
  trainLoss: { hu: 'Tanító hiba', en: 'Training loss' },
  testLoss: { hu: 'Teszt hiba', en: 'Test loss' },
  trainAcc: { hu: 'Tanító pontosság', en: 'Training accuracy' },
  testAcc: { hu: 'Teszt pontosság', en: 'Test accuracy' },
  steps: { hu: 'Lépések', en: 'Steps' },
  chart: { hu: 'Hiba: tanító vs. teszt (sárga = legjobb)', en: 'Loss: training vs. test (yellow = best)' },
  train: { hu: 'tanító', en: 'training' },
  test: { hu: 'teszt', en: 'test' },
  verdict: { hu: 'Állapot', en: 'State' },
  under: { hu: 'alultanult', en: 'underfitting' },
  good: { hu: 'jól általánosít', en: 'generalising well' },
  over: { hu: 'túltanul!', en: 'overfitting!' },
  stopped: { hu: 'korai leállítás: megállt', en: 'early stopping: stopped' },
  height: { hu: 'P(piros)', en: 'P(red)' },
};

const NAMES: Record<DatasetKind, { hu: string; en: string }> = {
  blobs: { hu: 'Két folt', en: 'Two blobs' },
  xor: { hu: 'XOR', en: 'XOR' },
  circles: { hu: 'Körök', en: 'Circles' },
  moons: { hu: 'Holdak', en: 'Moons' },
};

const sections: LessonSection[] = [
  {
    heading: 'whatIsIt',
    body: {
      hu: (
        <>
          <p>
            <b>Túltanulásnak</b> (overfitting) nevezzük, amikor a modell a tanítóadatot már <b>bemagolja</b> ahelyett, hogy a
            mögötte lévő szabályt tanulná meg. A tanító példákon szinte hibátlan, új adaton viszont rosszabbul teljesít.
          </p>
          <p>
            Olyan ez, mint a diák, aki a tavalyi zh feladatait a válaszokkal együtt megjegyzi: ha ugyanazt kapja, ötös, ha
            kicsit mást, elbukik. A cél az <b>általánosítás</b>: jól teljesíteni olyan adaton is, amit a modell sosem látott.
          </p>
        </>
      ),
      en: (
        <>
          <p>
            <b>Overfitting</b> is when a model <b>memorises</b> the training data instead of learning the rule behind it. It is
            almost perfect on the training examples but does worse on new data.
          </p>
          <p>
            It is like a student who memorises last year's exam together with the answers: the same questions earn top
            marks, slightly different ones a fail. The goal is <b>generalisation</b>: doing well on data the model has never seen.
          </p>
        </>
      ),
    },
  },
  {
    heading: 'howItWorks',
    body: {
      hu: (
        <>
          <p>
            Ezért az adatot mindig kettéosztjuk: a <b>tanítóhalmazon</b> (telt pontok) tanul a háló, a <b>teszthalmazt</b>{' '}
            (karikák) csak mérésre használjuk. A grafikon a két hibát mutatja. Eleinte mindkettő csökken. Egy ponton a
            teszthiba elkezd <b>nőni</b>, miközben a tanító hiba tovább esik: innentől a háló a zajt tanulja, és a döntési
            felületen apró „szigetek” nőnek egy-egy rossz helyen lévő pont köré.
          </p>
          <p>A túltanulás ellenszerei:</p>
          <ul>
            <li><b>Több adat:</b> több pontot nehezebb bemagolni, mint mintát találni bennük.</li>
            <li><b>Kisebb háló:</b> kevesebb neuron, kevesebb „memória”.</li>
            <li><b>Regularizáció:</b> az L2 bünteti a nagy súlyokat, a dropout tanítás közben véletlenszerűen kikapcsol neuronokat.</li>
            <li><b>Korai leállítás:</b> ott állunk meg, ahol a teszthiba (pontosabban egy külön validációs halmaz hibája) a legkisebb volt.</li>
          </ul>
          <p>
            Az ellenkezője az <b>alultanulás</b>: a modell túl egyszerű (például 1 neuron), ezért még a tanítóadatot sem tudja
            leírni. A jó modell a kettő között van.
          </p>
        </>
      ),
      en: (
        <>
          <p>
            That is why we always split the data: the network learns on the <b>training set</b> (filled dots) and the{' '}
            <b>test set</b> (rings) is only used for measuring. The chart shows both losses. At first both fall. At some point
            the test loss starts to <b>rise</b> while the training loss keeps falling: from then on the network learns the
            noise, and small "islands" grow on the decision surface around single misplaced points.
          </p>
          <p>Remedies for overfitting:</p>
          <ul>
            <li><b>More data:</b> many points are harder to memorise than to find a pattern in.</li>
            <li><b>A smaller network:</b> fewer neurons, less "memory".</li>
            <li><b>Regularisation:</b> L2 penalises large weights; dropout switches neurons off at random during training.</li>
            <li><b>Early stopping:</b> stop where the test loss (strictly, the loss on a separate validation set) was lowest.</li>
          </ul>
          <p>
            The opposite is <b>underfitting</b>: the model is too simple (for example 1 neuron), so it cannot even describe the
            training data. A good model lies in between.
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
          <li>Indítsd el a tanítást az alapbeállítással (30 pont, sok zaj, 2×16 neuron), és figyeld a grafikont: hol válik el a kék és a narancs vonal?</li>
          <li>Állítsd meg, és nézd meg a felületet: hol vannak a „szigetek”? A karikák (tesztpontok) közül hányat sorol rosszul?</li>
          <li>Kapcsold be az L2-t (λ = 0,01), állítsd vissza a modellt, és tanítsd újra: a határ simább, a teszthiba nem szalad el.</li>
          <li>Növeld a tanítópontokat 200-ra: ugyanaz a háló sokkal kevésbé tanul túl.</li>
          <li>Kapcsold be a korai leállítást, majd lépj vissza a legjobb állapothoz.</li>
        </ul>
      ),
      en: (
        <ul>
          <li>Start training with the defaults (30 points, lots of noise, 2×16 neurons) and watch the chart: where do the blue and orange lines part?</li>
          <li>Pause and look at the surface: where are the "islands"? How many rings (test points) does it get wrong?</li>
          <li>Turn on L2 (λ = 0.01), reset the model and train again: the boundary is smoother and the test loss does not run away.</li>
          <li>Raise the training points to 200: the same network overfits much less.</li>
          <li>Turn on early stopping, then go back to the best state.</li>
        </ul>
      ),
    },
  },
  {
    heading: 'math',
    body: {
      hu: (
        <>
          <p className="formula">L(θ) = (1/n) Σᵢ ℓ(f_θ(xᵢ), yᵢ) + (λ/2) Σ w²</p>
          <p className="formula">várható teszthiba ≈ torzítás² + variancia + zaj</p>
          <p>
            Az L2-tag miatt minden lépés a súlyokat kicsit a 0 felé is húzza (w ← w − η(∂ℓ/∂w + λw)). A kis modell <b>torzított</b>{' '}
            (alultanul), a nagy modell <b>varianciája</b> nagy: a tanítóminta apró változásaira is nagyon másképp reagál.
          </p>
        </>
      ),
      en: (
        <>
          <p className="formula">L(θ) = (1/n) Σᵢ ℓ(f_θ(xᵢ), yᵢ) + (λ/2) Σ w²</p>
          <p className="formula">expected test error ≈ bias² + variance + noise</p>
          <p>
            Because of the L2 term every step also pulls the weights a little towards 0 (w ← w − η(∂ℓ/∂w + λw)). A small model
            has high <b>bias</b> (it underfits), a large model has high <b>variance</b>: it reacts very differently to small
            changes in the training sample.
          </p>
        </>
      ),
    },
  },
  {
    heading: 'usedFor',
    body: {
      hu: <p>Minden gépi tanulási projektben számít: ezért van tanító, validációs és teszthalmaz, ezért használnak dropoutot, adatbővítést (pl. elforgatott képeket) és korai leállítást. A nagy nyelvi modelleknél a túltanulás egyik jele, ha a modell szó szerint visszaadja a tanítószöveg részleteit.</p>,
      en: <p>It matters in every machine-learning project: that is why there are training, validation and test sets, and why people use dropout, data augmentation (e.g. rotated images) and early stopping. In large language models one sign of overfitting is the model reciting pieces of its training text word for word.</p>,
    },
  },
];

const tmp = new THREE.Object3D();
const RING_COLORS = CLASS_COLORS.map((c) => new THREE.Color(c));

/** Test points drawn as rings, so they read as "not used for training". */
function TestRings({ data }: { data: Sample[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    data.forEach((d, i) => {
      tmp.position.set(...toScene(d.x1, d.x2, d.label * SURFACE_H));
      tmp.rotation.set(-Math.PI / 2, 0, 0);
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
      mesh.setColorAt(i, RING_COLORS[d.label]);
    });
    mesh.count = data.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [data]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 400]}>
      <ringGeometry args={[0.07, 0.11, 16]} />
      <meshBasicMaterial side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

export default function OverfittingLesson() {
  const { pick, t } = useLang();
  const [kind, setKind] = useState<DatasetKind>('moons');
  const [trainCount, setTrainCount] = useState(30);
  const [noise, setNoise] = useState(0.45);
  const [dataSeed, setDataSeed] = useState(7);
  const train = useMemo(() => makeDataset(kind, trainCount, noise, dataSeed), [kind, trainCount, noise, dataSeed]);
  const test = useMemo(() => makeDataset(kind, 200, noise, dataSeed + 1000), [kind, noise, dataSeed]);

  const [layers, setLayers] = useState(2);
  const [neurons, setNeurons] = useState(16);
  const [l2, setL2] = useState(0);
  const [lr, setLr] = useState(0.5);
  const [speed, setSpeed] = useState(200);
  const [seed, setSeed] = useState(3);
  const [showTest, setShowTest] = useState(true);
  const [early, setEarly] = useState(false);
  const [stoppedEarly, setStoppedEarly] = useState(false);
  const [running, setRunning] = useState(false);
  const [version, setVersion] = useState(0);
  const [steps, setSteps] = useState(0);
  const [hist, setHist] = useState<TrainTestPoint[]>([]);
  const best = useRef<{ loss: number; step: number; model: Mlp } | null>(null);

  const model = useMemo(() => createMlp(Array(layers).fill(neurons), 'tanh', seed), [layers, neurons, seed]);
  const clear = () => {
    setSteps(0);
    setHist([]);
    setStoppedEarly(false);
    best.current = null;
  };
  const reset = () => {
    setSeed((s) => s + 1);
    clear();
  };
  // a new architecture or new data means a fresh start
  const resetWith = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setRunning(false);
    reset();
  };

  const trainNet = (n: number) => {
    for (let i = 0; i < n; i++) mlpStep(model, train, lr, l2);
    const s = steps + n;
    const p = { step: s, train: mlpLoss(model, train), test: mlpLoss(model, test) };
    if (!best.current || p.test < best.current.loss) best.current = { loss: p.test, step: s, model: cloneMlp(model) };
    setSteps(s);
    setVersion((v) => v + 1);
    setHist((h) => {
      const next = [...h, p];
      return next.length > 400 ? next.filter((_, i) => i % 2 === 0 || i === next.length - 1) : next;
    });
    if (!Number.isFinite(p.train)) return false;
    if (early && best.current && s - best.current.step > 200 && p.test > best.current.loss * 1.15) {
      setStoppedEarly(true);
      return false;
    }
    return true;
  };
  useTrainingLoop(running, speed, trainNet, () => setRunning(false));

  const proba = useMemo(() => (a: number, b: number) => mlpProba(model, a, b), [model, version]);
  const trainAcc = useMemo(() => accuracy(train, proba), [train, proba]);
  const testAcc = useMemo(() => accuracy(test, proba), [test, proba]);
  const last = hist[hist.length - 1];
  const trainLoss = last?.train ?? mlpLoss(model, train);
  const testLoss = last?.test ?? mlpLoss(model, test);
  const verdict = stoppedEarly
    ? pick(txt.stopped)
    : trainAcc < 0.8 && steps > 0
      ? pick(txt.under)
      : best.current && testLoss > best.current.loss * 1.15 && trainLoss < testLoss
        ? pick(txt.over)
        : pick(txt.good);

  const scene = (
    <ClassificationScene data={train} proba={proba} heightLabel={pick(txt.height)}>
      {showTest && <TestRings data={test} />}
    </ClassificationScene>
  );

  const overlay = (
    <>
      <Readout label={pick(txt.trainLoss)} value={trainLoss.toFixed(3)} />
      <Readout label={pick(txt.testLoss)} value={testLoss.toFixed(3)} />
      <Readout label={`${pick(txt.trainAcc)} / ${pick(txt.testAcc)}`} value={`${pct(trainAcc)} / ${pct(testAcc)}`} />
      <Readout label={pick(txt.steps)} value={steps} />
      {steps > 0 && <Readout label={pick(txt.verdict)} value={verdict} />}
      <TrainTestChart points={hist} bestStep={best.current?.step} label={pick(txt.chart)} trainLabel={pick(txt.train)} testLabel={pick(txt.test)} />
    </>
  );

  const controls = (
    <>
      <ButtonRow>
        <button className="primary" onClick={() => { setStoppedEarly(false); setRunning((r) => !r); }}>
          {running ? t('pause') : t('play')}
        </button>
        <button onClick={() => trainNet(10)} disabled={running}>
          {pick({ hu: '10 lépés', en: '10 steps' })}
        </button>
      </ButtonRow>
      <button className="full" onClick={() => { setRunning(false); reset(); }}>
        {t('reset')}
      </button>
      <button
        className="full"
        disabled={!best.current || running}
        onClick={() => {
          if (!best.current) return;
          copyMlpInto(model, best.current.model);
          setVersion((v) => v + 1);
          setHist((h) => [...h, { step: steps, train: mlpLoss(model, train), test: mlpLoss(model, test) }]);
        }}
      >
        {pick(txt.restore)}
      </button>
      <Toggle label={pick(txt.showTest)} checked={showTest} onChange={setShowTest} />
      <Toggle label={pick(txt.early)} checked={early} onChange={setEarly} />
      <small className="panel-hint">{pick(txt.earlyHint)}</small>
      <h3>{pick({ hu: 'A háló', en: 'The network' })}</h3>
      <Slider label={pick(txt.layers)} value={layers} min={1} max={3} step={1} onChange={resetWith(setLayers)} />
      <Slider label={pick(txt.neurons)} hint={pick(txt.capacityHint)} value={neurons} min={1} max={24} step={1} onChange={resetWith(setNeurons)} />
      <Slider label={pick(txt.l2)} hint={pick(txt.l2Hint)} value={l2} min={0} max={0.05} step={0.001} onChange={setL2} format={(v) => v.toFixed(3)} />
      <Slider label={pick(txt.lr)} value={lr} min={0.05} max={1.5} step={0.05} onChange={setLr} format={(v) => v.toFixed(2)} />
      <Slider label={pick(txt.speed)} value={speed} min={10} max={1000} step={10} onChange={setSpeed} />
      <h3>{pick({ hu: 'Adatok', en: 'Data' })}</h3>
      <div className="control">
        <span className="control-row">{pick(txt.dataset)}</span>
        <div className="chip-row">
          {DATASET_KINDS.map((k) => (
            <button key={k} className={k === kind ? 'chip active' : 'chip'} onClick={() => resetWith(setKind)(k)}>
              {pick(NAMES[k])}
            </button>
          ))}
        </div>
      </div>
      <Slider label={pick(txt.trainCount)} value={trainCount} min={10} max={200} step={10} onChange={resetWith(setTrainCount)} />
      <Slider label={pick(txt.noise)} value={noise} min={0} max={1} step={0.05} onChange={resetWith(setNoise)} format={(v) => v.toFixed(2)} />
      <button className="full" onClick={() => resetWith(setDataSeed)(dataSeed + 1)}>
        {pick(txt.newData)}
      </button>
    </>
  );

  return (
    <LessonLayout
      category="deep"
      title={{ hu: 'Túltanulás és általánosítás', en: 'Overfitting and generalisation' }}
      intro={{
        hu: 'Mikor magol be a háló a tanulás helyett? Figyeld, ahogy a tanító hiba esik, a teszthiba pedig nőni kezd.',
        en: 'When does a network memorise instead of learning? Watch the training loss fall while the test loss starts to climb.',
      }}
      scene={scene}
      overlay={overlay}
      controls={controls}
      sections={sections}
    />
  );
}
