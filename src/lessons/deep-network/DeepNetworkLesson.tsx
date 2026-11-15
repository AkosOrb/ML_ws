import { useMemo, useState } from 'react';
import { ClassificationScene } from '../../components/ClassificationScene';
import { ButtonRow, Slider, Toggle } from '../../components/Controls';
import { useDataset } from '../../components/DatasetControls';
import { LessonLayout, type LessonSection } from '../../components/LessonLayout';
import { LossChart } from '../../components/LossChart';
import { pct, Readout } from '../../components/Readout';
import { useLang } from '../../i18n/i18n';
import { accuracy } from '../../ml/datasets';
import { createMlp, mlpLoss, mlpProba, mlpStep } from '../../ml/mlp';
import { useTrainingLoop } from '../../useTrainingLoop';
import { NetworkDiagram } from '../neural-network/NetworkDiagram';
import { LayerSpaceScene } from './LayerSpaceScene';

const txt = {
  tabInside: { hu: 'Rétegek belülről', en: 'Inside the layers' },
  tabSurface: { hu: 'Döntési felület', en: 'Decision surface' },
  depth: { hu: 'Rejtett rétegek száma (mélység)', en: 'Hidden layers (depth)' },
  depthHint: { hu: 'Minden réteg 3 neuronos, így a belső teret 3D-ben láthatod.', en: 'Every layer has 3 neurons, so you can see its inner space in 3D.' },
  view: { hu: 'Megjelenített réteg', en: 'Layer shown' },
  viewHint: {
    hu: 'Húzd lassan: a pontok átúsznak egyik réteg teréből a következőbe.',
    en: 'Drag slowly: the points glide from one layer\'s space into the next.',
  },
  grid: { hu: 'Rácsvonalak (a tér hajtogatása)', en: 'Grid lines (folding of space)' },
  plane: { hu: 'A kimeneti neuron döntési síkja', en: "The output neuron's decision plane" },
  lr: { hu: 'Tanulási ráta', en: 'Learning rate' },
  speed: { hu: 'Sebesség (lépés/mp)', en: 'Speed (steps/s)' },
  loss: { hu: 'Log-veszteség', en: 'Log loss' },
  acc: { hu: 'Pontosság', en: 'Accuracy' },
  steps: { hu: 'Lépések', en: 'Steps' },
  layerName: { hu: 'Nézet', en: 'View' },
  input: { hu: 'bemenet (2D)', en: 'input (2D)' },
  hidden: { hu: '. rejtett réteg', en: ' hidden layer' },
  between: { hu: 'átmenet', en: 'in between' },
  height: { hu: 'P(piros)', en: 'P(red)' },
  lossChart: { hu: 'A hiba alakulása', en: 'Loss over time' },
};

const ordinalEn = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;

const sections: LessonSection[] = [
  {
    heading: 'whatIsIt',
    body: {
      hu: (
        <p>
          A <b>mélytanulás</b> olyan neurális hálókat jelent, amelyekben sok réteg követi egymást. Minden réteg az előző
          kimenetét alakítja át egy kicsit, és a sok kis átalakítás együtt olyan feladatokat old meg, amelyeket egyetlen réteg
          nem tud. Ebben a leckében minden réteg csak 3 neuronból áll, így bele tudunk nézni: minden pontnak minden rétegben
          van egy 3D-s helye.
        </p>
      ),
      en: (
        <p>
          <b>Deep learning</b> means neural networks with many layers in a row. Each layer transforms the previous layer's
          output a little, and many small transformations together solve tasks that a single layer cannot. In this lesson
          every layer has only 3 neurons, so we can look inside: every point has a 3D position in every layer.
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
            A rétegek <b>hajtogatják és nyújtják a teret</b>, mint egy gyurmát. A rácsvonalak megmutatják, hogyan torzul az
            eredeti sík. A tanítás célja, hogy az utolsó rejtett rétegben a kék és piros pontok úgy kerüljenek el egymástól,
            hogy egyetlen <b>sík</b> elválaszthassa őket. Ez a fehér sík a kimeneti neuron döntése.
          </p>
          <p>
            Így látszik, mit jelent a mélység: egy réteg csak egyszer tudja meghajlítani a teret, több réteg viszont egymásra
            épülő hajtogatásokkal bonyolult alakzatokat is „kisimít”. A képfelismerő hálók ugyanígy működnek, csak sokkal több
            réteggel és neuronnal: az első rétegek éleket, a későbbiek formákat, a legmélyebbek tárgyakat ismernek fel.
          </p>
        </>
      ),
      en: (
        <>
          <p>
            The layers <b>fold and stretch space</b> like modelling clay. The grid lines show how the original plane gets
            distorted. Training aims to move the blue and red points apart in the last hidden layer so that a single{' '}
            <b>plane</b> can separate them. That white plane is the output neuron's decision.
          </p>
          <p>
            This shows what depth means: one layer can bend space only once, but several layers stack folds on folds and can
            "unfold" complicated shapes. Image-recognition networks work the same way, just with many more layers and neurons:
            early layers detect edges, later ones shapes, and the deepest ones whole objects.
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
          <li>Tanítsd a hálót az XOR adaton 1 rejtett réteggel: nem éri el a 100%-ot. Állíts be 3 réteget, és próbáld újra.</li>
          <li>Tanítás után húzd végig a réteg csúszkát 0-tól a végéig, és figyeld, ahogy a színek szétválnak.</li>
          <li>Kapcsold be a rácsvonalakat: látszik, hol hajtja össze a háló a teret.</li>
          <li>Forgasd úgy a jelenetet az utolsó rétegnél, hogy a fehér sík élére láss: a két szín két oldalra esik.</li>
        </ul>
      ),
      en: (
        <ul>
          <li>Train on XOR with 1 hidden layer: it does not reach 100%. Set 3 layers and try again.</li>
          <li>After training, drag the layer slider from 0 to the end and watch the colours separate.</li>
          <li>Turn on the grid lines: you can see where the network folds space.</li>
          <li>At the last layer, rotate the scene to look along the white plane's edge: the two colours fall on its two sides.</li>
        </ul>
      ),
    },
  },
  {
    heading: 'math',
    body: {
      hu: (
        <>
          <p className="formula">h⁽⁰⁾ = x,  h⁽ˡ⁾ = tanh(W⁽ˡ⁾ h⁽ˡ⁻¹⁾ + b⁽ˡ⁾),  ŷ = σ(wᵀ h⁽ᴸ⁾ + b)</p>
          <p>
            Minden réteg egy lineáris leképezés (forgatás, nyújtás, eltolás) és egy nemlineáris „összenyomás” (tanh). Az
            utolsó lépés egy logisztikus regresszió az utolsó réteg terében, ezért ott a döntési határ egy sík: wᵀh + b = 0.
            A tanítás a visszaterjesztéssel minden réteg súlyait egyszerre igazítja.
          </p>
        </>
      ),
      en: (
        <>
          <p className="formula">h⁽⁰⁾ = x,  h⁽ˡ⁾ = tanh(W⁽ˡ⁾ h⁽ˡ⁻¹⁾ + b⁽ˡ⁾),  ŷ = σ(wᵀ h⁽ᴸ⁾ + b)</p>
          <p>
            Each layer is a linear map (rotate, stretch, shift) followed by a non-linear "squash" (tanh). The last step is a
            logistic regression in the last layer's space, so there the decision boundary is a plane: wᵀh + b = 0.
            Backpropagation adjusts every layer's weights at once.
          </p>
        </>
      ),
    },
  },
  {
    heading: 'usedFor',
    body: {
      hu: <p>Minden mai nagy MI-rendszer mély háló: képfelismerés, beszédfelismerés, fordítás, chatbotok, képgenerálás, fehérjeszerkezet-előrejelzés.</p>,
      en: <p>Every major AI system today is a deep network: image and speech recognition, translation, chatbots, image generation, protein-structure prediction.</p>,
    },
  },
];

export default function DeepNetworkLesson() {
  const { pick, t, lang } = useLang();
  const [tab, setTab] = useState<'inside' | 'surface'>('inside');
  const { data, controls: dataControls } = useDataset({ kind: 'xor', noise: 0.1, count: 160 });
  const [depth, setDepth] = useState(3);
  const [seed, setSeed] = useState(1);
  const [lr, setLr] = useState(0.5);
  const [speed, setSpeed] = useState(40);
  const [running, setRunning] = useState(false);
  const [layer, setLayer] = useState(3);
  const [showGrid, setShowGrid] = useState(true);
  const [showPlane, setShowPlane] = useState(true);
  const [version, setVersion] = useState(0);
  const [steps, setSteps] = useState(0);
  const [history, setHistory] = useState<number[]>([]);

  const model = useMemo(() => createMlp(Array(depth).fill(3), 'tanh', seed), [depth, seed]);
  const resetModel = () => {
    setSeed((s) => s + 1);
    setSteps(0);
    setHistory([]);
  };

  const train = (n: number) => {
    const losses: number[] = [];
    for (let i = 0; i < n; i++) {
      mlpStep(model, data, lr);
      losses.push(mlpLoss(model, data));
    }
    setVersion((v) => v + 1);
    setSteps((s) => s + n);
    setHistory((h) => [...h, ...losses].slice(-300));
    return Number.isFinite(losses[losses.length - 1]);
  };
  useTrainingLoop(running, speed, train, () => setRunning(false));

  // `version` changes after each training step because the model is mutated in place.
  const proba = useMemo(() => (a: number, b: number) => mlpProba(model, a, b), [model, version]); // eslint-disable-line react-hooks/exhaustive-deps
  const acc = useMemo(() => accuracy(data, proba), [data, proba]);
  const loss = useMemo(() => mlpLoss(model, data), [model, data, version]); // eslint-disable-line react-hooks/exhaustive-deps

  const viewLayer = Math.min(layer, depth);
  const viewName =
    viewLayer === 0
      ? pick(txt.input)
      : Number.isInteger(viewLayer)
        ? lang === 'hu'
          ? `${viewLayer}${txt.hidden.hu}`
          : `${ordinalEn(viewLayer)}${txt.hidden.en}`
        : pick(txt.between);

  return (
    <LessonLayout
      category="deep"
      title={{ hu: 'Mély háló belülről', en: 'Inside a deep network' }}
      intro={{
        hu: 'Nézz bele egy mély hálóba: rétegről rétegre látod, hogyan hajtogatja a teret, amíg a két osztály szétválik.',
        en: 'Look inside a deep network: layer by layer you see how it folds space until the two classes come apart.',
      }}
      scene={
        <>
          <div className="scene-tabs">
            <button className={tab === 'inside' ? 'chip active' : 'chip'} onClick={() => setTab('inside')}>
              {pick(txt.tabInside)}
            </button>
            <button className={tab === 'surface' ? 'chip active' : 'chip'} onClick={() => setTab('surface')}>
              {pick(txt.tabSurface)}
            </button>
          </div>
          {tab === 'inside' ? (
            <LayerSpaceScene model={model} data={data} layer={viewLayer} showGrid={showGrid} showPlane={showPlane} version={version} />
          ) : (
            <ClassificationScene data={data} proba={proba} heightLabel={pick(txt.height)} />
          )}
        </>
      }
      overlay={
        <>
          {tab === 'inside' && <Readout label={pick(txt.layerName)} value={viewName} />}
          <Readout label={pick(txt.loss)} value={Number.isFinite(loss) ? loss.toFixed(3) : '∞'} />
          <Readout label={pick(txt.acc)} value={pct(acc)} />
          <Readout label={pick(txt.steps)} value={steps} />
          <LossChart history={history} label={pick(txt.lossChart)} />
        </>
      }
      controls={
        <>
          <ButtonRow>
            <button className="primary" onClick={() => setRunning((r) => !r)}>
              {running ? t('pause') : t('play')}
            </button>
            <button onClick={() => train(1)} disabled={running}>
              {t('step')}
            </button>
          </ButtonRow>
          <button className="full" onClick={resetModel}>
            {t('reset')}
          </button>
          <NetworkDiagram model={model} />
          <Slider label={pick(txt.view)} hint={pick(txt.viewHint)} value={viewLayer} min={0} max={depth} step={0.01} onChange={setLayer} format={(v) => v.toFixed(2)} />
          <Toggle label={pick(txt.grid)} checked={showGrid} onChange={setShowGrid} />
          <Toggle label={pick(txt.plane)} checked={showPlane} onChange={setShowPlane} />
          <Slider
            label={pick(txt.depth)}
            hint={pick(txt.depthHint)}
            value={depth}
            min={1}
            max={5}
            step={1}
            onChange={(v) => {
              setDepth(v);
              setLayer(v);
              setSteps(0);
              setHistory([]);
            }}
          />
          <Slider label={pick(txt.lr)} value={lr} min={0.05} max={2} step={0.05} onChange={setLr} format={(v) => v.toFixed(2)} />
          <Slider label={pick(txt.speed)} value={speed} min={1} max={150} step={1} onChange={setSpeed} />
          <h3>{pick({ hu: 'Adatok', en: 'Data' })}</h3>
          {dataControls}
        </>
      }
      sections={sections}
    />
  );
}
