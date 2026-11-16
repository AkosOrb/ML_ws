import { useState } from 'react';
import { ButtonRow, Slider } from '../../components/Controls';
import { LessonLayout, type LessonSection } from '../../components/LessonLayout';
import { Readout } from '../../components/Readout';
import { useLang, type Bilingual } from '../../i18n/i18n';
import { activate, gateCorrect, gateLoss, GATES, gateStep, NEURON_ACTIVATIONS, weightedSum, type Gate, type NeuronActivation, type TwoInputNeuron } from '../../ml/neuron';
import { useTrainingLoop } from '../../useTrainingLoop';
import { GateScene, NeuronInsideScene } from './NeuronScene';

const ACT_NAMES: Record<NeuronActivation, Bilingual> = {
  step: { hu: 'Lépcső', en: 'Step' },
  sigmoid: { hu: 'Szigmoid', en: 'Sigmoid' },
  tanh: { hu: 'tanh', en: 'tanh' },
  relu: { hu: 'ReLU', en: 'ReLU' },
  linear: { hu: 'Lineáris', en: 'Linear' },
};

const ACT_HINT: Record<NeuronActivation, Bilingual> = {
  step: { hu: 'Ha z ≥ 0, a kimenet 1, különben 0. Az eredeti perceptron így működött.', en: 'If z ≥ 0 the output is 1, otherwise 0. The original perceptron worked like this.' },
  sigmoid: { hu: '0 és 1 közé nyom mindent: valószínűségként olvasható.', en: 'Squashes everything between 0 and 1: it reads as a probability.' },
  tanh: { hu: '−1 és 1 közé nyom mindent, 0 körül szimmetrikus.', en: 'Squashes everything between −1 and 1, symmetric around 0.' },
  relu: { hu: 'Negatív z-re 0 (a neuron hallgat), pozitívra maga z. A mai hálók leggyakoribb választása.', en: '0 for negative z (the neuron is silent), z itself for positive. The most common choice in today\'s networks.' },
  linear: { hu: 'Nem változtat semmin. Ilyen neuronokból hiába építünk mély hálót: az egész egyetlen lineáris függvény marad.', en: 'Changes nothing. A deep network built from these is still just one linear function.' },
};

const GATE_NAMES: Record<Gate, string> = { and: 'AND', or: 'OR', nand: 'NAND', xor: 'XOR' };

const txt = {
  tabInside: { hu: 'Egy neuron belülről', en: 'Inside one neuron' },
  tabGates: { hu: 'Logikai kapuk', en: 'Logic gates' },
  inputs: { hu: 'Bemenetek', en: 'Inputs' },
  weights: { hu: 'Súlyok és eltolás', en: 'Weights and bias' },
  weightsHint: { hu: 'A súly azt mondja meg, mennyire és milyen irányba számít egy bemenet. Narancs = pozitív, kék = negatív, vastagság = nagyság.', en: 'A weight says how much and in which direction an input matters. Orange = positive, blue = negative, thickness = size.' },
  bias: { hu: 'Eltolás (b)', en: 'Bias (b)' },
  biasHint: { hu: 'Az eltolás a küszöböt állítja: mennyire könnyen „tüzel” a neuron.', en: 'The bias sets the threshold: how easily the neuron "fires".' },
  act: { hu: 'Aktivációs függvény', en: 'Activation function' },
  sum: { hu: 'Súlyozott összeg', en: 'Weighted sum' },
  out: { hu: 'Kimenet', en: 'Output' },
  formula: { hu: 'Számolás', en: 'Calculation' },
  gate: { hu: 'Megtanulandó kapu', en: 'Gate to learn' },
  gateHint: { hu: 'A négy pont a négy lehetséges bemenet. A neuronnak a piros pontoknál 1-et, a kékeknél 0-t kell adnia.', en: 'The four points are the four possible inputs. The neuron must output 1 at the red points and 0 at the blue ones.' },
  manual: { hu: 'Próbáld kézzel is! A sárga vonal a döntési határ: w₁x₁ + w₂x₂ + b = 0.', en: 'Try it by hand too! The yellow line is the decision boundary: w₁x₁ + w₂x₂ + b = 0.' },
  lr: { hu: 'Tanulási ráta', en: 'Learning rate' },
  correct: { hu: 'Helyes esetek', en: 'Correct cases' },
  loss: { hu: 'Log-veszteség', en: 'Log loss' },
  steps: { hu: 'Lépések', en: 'Steps' },
  xorNote: { hu: 'Az XOR-t egy neuron nem tudja: nincs olyan egyenes, amely elválasztja a piros pontokat a kékektől.', en: 'One neuron cannot do XOR: no straight line separates the red points from the blue ones.' },
  random: { hu: '🎲 Véletlen súlyok', en: '🎲 Random weights' },
  height: { hu: 'kimenet', en: 'output' },
};

const sections: LessonSection[] = [
  {
    heading: 'whatIsIt',
    body: {
      hu: (
        <>
          <p>
            A <b>mesterséges neuron</b> a neurális hálók legkisebb építőköve. Lazán az agy idegsejtjeiről mintázták: több
            bemenő jelet kap, ezeket összegzi, és ha az összeg elég nagy, „tüzel”, vagyis jelet ad tovább.
          </p>
          <p>
            Egy neuron önmagában nagyon egyszerű: néhány szorzás, egy összeadás és egy függvény. A neurális hálók ereje abból
            jön, hogy sok ezer vagy milliárd ilyen egység dolgozik együtt, rétegekbe kötve.
          </p>
        </>
      ),
      en: (
        <>
          <p>
            The <b>artificial neuron</b> is the smallest building block of neural networks. It is loosely modelled on nerve cells
            in the brain: it receives several incoming signals, adds them up, and if the total is large enough it "fires",
            passing a signal on.
          </p>
          <p>
            A single neuron is very simple: a few multiplications, an addition and a function. The power of neural networks
            comes from thousands or billions of these units working together, wired into layers.
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
          <p>Egy neuron három lépésben számol:</p>
          <ol>
            <li><b>Súlyozás:</b> minden xᵢ bemenetet megszoroz a hozzá tartozó wᵢ súllyal. A nagy pozitív súly erősen „mellette”, a negatív súly „ellene” szavaz.</li>
            <li><b>Összegzés:</b> összeadja a szorzatokat, és hozzáadja a b eltolást. Ez a z súlyozott összeg.</li>
            <li><b>Aktiváció:</b> z-t átengedi egy f függvényen, és ez a kimenet: y = f(z).</li>
          </ol>
          <p>
            Az aktivációs függvény nélkülözhetetlen. Nélküle (lineáris aktivációval) akárhány réteget kötünk egymás után, a háló
            csak egyenes határt tud húzni. A görbülete teszi lehetővé, hogy sok neuron együtt bármilyen alakú határt
            megtanuljon.
          </p>
          <p>
            A <b>tanulás</b> annyit jelent, hogy a súlyokat és az eltolást a hálózat lépésről lépésre úgy állítja, hogy a kimenet
            közelebb kerüljön a helyes válaszhoz. A „Logikai kapuk” fülön ezt egyetlen neuronon nézheted meg. Egy neuron
            döntési határa mindig egyenes, ezért az XOR-t nem tudja megtanulni. Ehhez már rejtett réteg kell, és ez vezetett
            a többrétegű hálókhoz.
          </p>
        </>
      ),
      en: (
        <>
          <p>A neuron computes in three steps:</p>
          <ol>
            <li><b>Weighting:</b> it multiplies each input xᵢ by its weight wᵢ. A large positive weight votes strongly "for", a negative weight "against".</li>
            <li><b>Summing:</b> it adds up the products and adds the bias b. This is the weighted sum z.</li>
            <li><b>Activation:</b> it passes z through a function f, and that is the output: y = f(z).</li>
          </ol>
          <p>
            The activation function is essential. Without it (with a linear activation), however many layers we chain, the network
            can only draw a straight boundary. Its curvature is what lets many neurons together learn a boundary of any shape.
          </p>
          <p>
            <b>Learning</b> simply means that the network adjusts the weights and bias step by step so the output gets closer to the
            right answer. On the "Logic gates" tab you can watch this on a single neuron. A neuron's decision boundary is always a
            straight line, so it cannot learn XOR. That needs a hidden layer, which is what led to multi-layer networks.
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
          <li>Állítsd az egyik súlyt negatívra: a hozzá tartozó bemenet növelése most csökkenti z-t.</li>
          <li>ReLU mellett tedd z-t negatívvá az eltolással: a kimenet 0, a neuron hallgat.</li>
          <li>Váltogasd az aktivációs függvényt ugyanazon z mellett: mennyire más a kimenet?</li>
          <li>A „Logikai kapuk” fülön tanítsd meg az AND-et, majd próbáld az XOR-t. Hány esetet tud helyesen?</li>
          <li>Keresd meg kézzel a súlyokat az OR-hoz! (Tipp: w₁ = w₂ = 2, b = −1.)</li>
        </ul>
      ),
      en: (
        <ul>
          <li>Make one weight negative: raising its input now lowers z.</li>
          <li>With ReLU, push z below zero with the bias: the output is 0, the neuron is silent.</li>
          <li>Switch activation functions at the same z: how different is the output?</li>
          <li>On the "Logic gates" tab train AND, then try XOR. How many cases does it get right?</li>
          <li>Find the weights for OR by hand! (Hint: w₁ = w₂ = 2, b = −1.)</li>
        </ul>
      ),
    },
  },
  {
    heading: 'math',
    body: {
      hu: (
        <>
          <p className="formula">z = w₁x₁ + w₂x₂ + w₃x₃ + b = w·x + b,   y = f(z)</p>
          <p className="formula">σ(z) = 1 / (1 + e⁻ᶻ),  tanh(z),  ReLU(z) = max(0, z)</p>
          <p className="formula">wᵢ ← wᵢ − η (y − t) xᵢ,   b ← b − η (y − t)</p>
          <p>
            Az utolsó sor a tanítási szabály szigmoid kimenettel és keresztentrópiás hibával: t a helyes válasz, η a tanulási
            ráta. A súly annál többet változik, minél nagyobb volt a hiba és minél nagyobb volt a hozzá tartozó bemenet.
          </p>
        </>
      ),
      en: (
        <>
          <p className="formula">z = w₁x₁ + w₂x₂ + w₃x₃ + b = w·x + b,   y = f(z)</p>
          <p className="formula">σ(z) = 1 / (1 + e⁻ᶻ),  tanh(z),  ReLU(z) = max(0, z)</p>
          <p className="formula">wᵢ ← wᵢ − η (y − t) xᵢ,   b ← b − η (y − t)</p>
          <p>
            The last line is the training rule with a sigmoid output and cross-entropy loss: t is the right answer, η the learning
            rate. A weight changes more the bigger the error was and the bigger its input was.
          </p>
        </>
      ),
    },
  },
  {
    heading: 'usedFor',
    body: {
      hu: <p>Minden neurális háló ilyen neuronokból áll, a képfelismerőktől a nyelvi modellekig. Az első változatot, a perceptront Frank Rosenblatt építette meg 1958-ban. Az, hogy egyetlen neuron nem tudja az XOR-t (Minsky és Papert, 1969), évekre visszavetette a kutatást, egészen a többrétegű hálók és a visszaterjesztés elterjedéséig.</p>,
      en: <p>Every neural network is made of neurons like this, from image recognisers to language models. The first version, the perceptron, was built by Frank Rosenblatt in 1958. The fact that a single neuron cannot do XOR (Minsky and Papert, 1969) set research back for years, until multi-layer networks and backpropagation caught on.</p>,
    },
  },
];

const START: TwoInputNeuron = { w1: -0.5, w2: 0.8, b: 0.2 };

export default function NeuronLesson() {
  const { pick, t } = useLang();
  const [tab, setTab] = useState<'inside' | 'gates'>('inside');

  // --- inside view ---
  const [x, setX] = useState([0.8, 0.3, -0.5]);
  const [w, setW] = useState([1.2, -0.7, 0.5]);
  const [b, setB] = useState(-0.2);
  const [act, setAct] = useState<NeuronActivation>('sigmoid');
  const z = weightedSum(x, w, b);
  const y = activate(act, z);
  const setAt = (arr: number[], set: (v: number[]) => void, i: number) => (v: number) => set(arr.map((a, k) => (k === i ? v : a)));

  // --- logic gates ---
  const [gate, setGate] = useState<Gate>('and');
  const [n, setN] = useState<TwoInputNeuron>(START);
  const [lr, setLr] = useState(1);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState(0);
  useTrainingLoop(running && tab === 'gates', 60, (k) => {
    let m = n;
    for (let i = 0; i < k; i++) m = gateStep(m, gate, lr);
    setN(m);
    setSteps((s) => s + k);
  });
  const resetGate = (next: TwoInputNeuron = START) => {
    setN(next);
    setSteps(0);
  };
  const correct = gateCorrect(n, gate);

  const f2 = (v: number) => v.toFixed(2);
  const p2 = (v: number) => (v < 0 ? `(${f2(v)})` : f2(v));

  const tabs = (
    <div className="scene-tabs">
      <button className={tab === 'inside' ? 'chip active' : 'chip'} onClick={() => setTab('inside')}>
        {pick(txt.tabInside)}
      </button>
      <button className={tab === 'gates' ? 'chip active' : 'chip'} onClick={() => setTab('gates')}>
        {pick(txt.tabGates)}
      </button>
    </div>
  );

  const scene = (
    <>
      {tabs}
      {tab === 'inside' ? (
        <NeuronInsideScene x={x} w={w} b={b} act={act} labels={{ sum: pick(txt.sum), out: pick(txt.out) }} />
      ) : (
        <GateScene n={n} gate={gate} labels={{ x1: 'x₁', x2: 'x₂', height: pick(txt.height) }} />
      )}
    </>
  );

  const overlay =
    tab === 'inside' ? (
      <>
        <Readout label="z" value={`${x.map((xi, i) => `${p2(w[i])}·${p2(xi)}`).join(' + ')} + ${p2(b)} = ${f2(z)}`} />
        <Readout label={`y = ${pick(ACT_NAMES[act])}(z)`} value={f2(y)} />
      </>
    ) : (
      <>
        <Readout label={pick(txt.correct)} value={`${correct} / 4`} />
        <Readout label={pick(txt.loss)} value={gateLoss(n, gate).toFixed(3)} />
        <Readout label={pick(txt.steps)} value={steps} />
        <Readout label="w₁, w₂, b" value={`${f2(n.w1)}, ${f2(n.w2)}, ${f2(n.b)}`} />
      </>
    );

  const insideControls = (
    <>
      <h3 style={{ marginTop: 8 }}>{pick(txt.inputs)}</h3>
      {x.map((v, i) => (
        <Slider key={i} label={`x${'₁₂₃'[i]}`} value={v} min={-1} max={1} step={0.05} onChange={setAt(x, setX, i)} format={f2} />
      ))}
      <h3>{pick(txt.weights)}</h3>
      {w.map((v, i) => (
        <Slider key={i} label={`w${'₁₂₃'[i]}`} value={v} min={-3} max={3} step={0.05} onChange={setAt(w, setW, i)} format={f2} />
      ))}
      <small className="panel-hint">{pick(txt.weightsHint)}</small>
      <Slider label={pick(txt.bias)} hint={pick(txt.biasHint)} value={b} min={-3} max={3} step={0.05} onChange={setB} format={f2} />
      <div className="control">
        <span className="control-row">{pick(txt.act)}</span>
        <div className="chip-row">
          {NEURON_ACTIVATIONS.map((a) => (
            <button key={a} className={a === act ? 'chip active' : 'chip'} onClick={() => setAct(a)}>
              {pick(ACT_NAMES[a])}
            </button>
          ))}
        </div>
        <small className="panel-hint" style={{ marginTop: 6 }}>{pick(ACT_HINT[act])}</small>
      </div>
    </>
  );

  const gateControls = (
    <>
      <div className="control">
        <span className="control-row">{pick(txt.gate)}</span>
        <div className="chip-row">
          {GATES.map((g) => (
            <button key={g} className={g === gate ? 'chip active' : 'chip'} onClick={() => { setGate(g); resetGate(); }}>
              {GATE_NAMES[g]}
            </button>
          ))}
        </div>
        <small className="panel-hint" style={{ marginTop: 6 }}>{pick(txt.gateHint)}</small>
      </div>
      <ButtonRow>
        <button className="primary" onClick={() => setRunning((r) => !r)}>
          {running ? t('pause') : t('play')}
        </button>
        <button onClick={() => { setN(gateStep(n, gate, lr)); setSteps((s) => s + 1); }} disabled={running}>
          {t('step')}
        </button>
      </ButtonRow>
      <button className="full" onClick={() => resetGate()}>
        {t('reset')}
      </button>
      <button className="full" onClick={() => resetGate({ w1: Math.random() * 6 - 3, w2: Math.random() * 6 - 3, b: Math.random() * 4 - 2 })}>
        {pick(txt.random)}
      </button>
      {gate === 'xor' && <small className="panel-hint">{pick(txt.xorNote)}</small>}
      <Slider label={pick(txt.lr)} value={lr} min={0.1} max={5} step={0.1} onChange={setLr} format={(v) => v.toFixed(1)} />
      <h3>{pick(txt.weights)}</h3>
      <small className="panel-hint">{pick(txt.manual)}</small>
      <Slider label="w₁" value={n.w1} min={-8} max={8} step={0.1} onChange={(v) => setN({ ...n, w1: v })} format={f2} />
      <Slider label="w₂" value={n.w2} min={-8} max={8} step={0.1} onChange={(v) => setN({ ...n, w2: v })} format={f2} />
      <Slider label="b" value={n.b} min={-8} max={8} step={0.1} onChange={(v) => setN({ ...n, b: v })} format={f2} />
    </>
  );

  return (
    <LessonLayout
      category="deep"
      title={{ hu: 'A neuron', en: 'The neuron' }}
      intro={{
        hu: 'A neurális háló legkisebb egysége: bemenetek, súlyok, eltolás és aktivációs függvény. Állítsd őket, és nézd, mi lesz a kimenet.',
        en: 'The smallest unit of a neural network: inputs, weights, a bias and an activation function. Adjust them and see what comes out.',
      }}
      scene={scene}
      overlay={overlay}
      controls={tab === 'inside' ? insideControls : gateControls}
      sections={sections}
    />
  );
}
