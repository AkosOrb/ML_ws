import { useEffect, useMemo, useState } from 'react';
import { ButtonRow, Slider } from '../../components/Controls';
import { LessonLayout, type LessonSection } from '../../components/LessonLayout';
import { pct, Readout } from '../../components/Readout';
import { useLang } from '../../i18n/i18n';
import { argmax, makeShapeSet, pixelAccuracy, pixelForward, SHAPES, trainedPixelNet } from '../../ml/pixelNet';
import { canonical, PixelInput, SHAPE_NAMES } from './PixelInput';
import { PixelNetScene, WeightMap } from './PixelNetScene';

const txt = {
  send: { hu: '▶ Jel végigküldése', en: '▶ Send the signal through' },
  phase: { hu: 'Meddig jutott a jel', en: 'How far the signal got' },
  phaseHint: {
    hu: '0 = csak a bemenet, 1 = első rejtett réteg, 2 = második, 3 = kimenet.',
    en: '0 = input only, 1 = first hidden layer, 2 = second, 3 = output.',
  },
  neuron: { hu: 'Vizsgált neuron (1. rejtett réteg)', en: 'Neuron to inspect (1st hidden layer)' },
  neuronHint: {
    hu: 'A térkép a neuron 49 bemeneti súlya: narancs pixel felé húz, kék ellene. A jelenetben a neuronra kattintva is kiválaszthatod.',
    en: "The map shows the neuron's 49 input weights: orange pixels push it up, blue ones push it down. You can also click a neuron in the scene.",
  },
  weights: { hu: 'A kiválasztott neuron súlytérképe', en: "The selected neuron's weight map" },
  h1: { hu: '1. rejtett réteg neuronjai', en: 'Neurons in hidden layer 1' },
  h2: { hu: '2. rejtett réteg neuronjai', en: 'Neurons in hidden layer 2' },
  sizeHint: { hu: 'Méretváltáskor a háló újratanul (egy pillanat).', en: 'Changing a size retrains the network (takes a moment).' },
  input: { hu: 'Bemenet (49 szám)', en: 'Input (49 numbers)' },
  answer: { hu: 'Tipp', en: 'Guess' },
  conf: { hu: 'Biztonság', en: 'Confidence' },
  active: { hu: 'Aktív neuronok', en: 'Active neurons' },
  acc: { hu: 'Pontosság új rajzokon', en: 'Accuracy on new drawings' },
  neuronVal: { hu: 'A kiválasztott neuron értéke', en: 'Selected neuron value' },
  silent: { hu: 'hallgat', en: 'silent' },
  inputL: { hu: 'Bemenet 7×7', en: 'Input 7×7' },
  outL: { hu: 'Kimenet', en: 'Output' },
  waiting: { hu: '…', en: '…' },
};

const sections: LessonSection[] = [
  {
    heading: 'whatIsIt',
    body: {
      hu: (
        <>
          <p>
            Ez a lecke egy neurális háló <b>egyetlen döntését</b> mutatja meg a bemenettől a kimenetig. A háló 7×7 pixeles
            rajzokat sorol négy osztályba: függőleges vonal, vízszintes vonal, keret és X.
          </p>
          <p>
            <b>A bemenet</b> 49 szám: minden pixel 0 (üres) vagy 1 (befestett). A háló nem „látja” a képet, csak ezt a
            számsort. <b>A kimenet</b> négy valószínűség, amelyek összege mindig 100%.
          </p>
        </>
      ),
      en: (
        <>
          <p>
            This lesson shows <b>a single decision</b> of a neural network, from input to output. The network sorts 7×7
            pixel drawings into four classes: vertical line, horizontal line, frame and X.
          </p>
          <p>
            <b>The input</b> is 49 numbers: each pixel is 0 (empty) or 1 (painted). The network does not "see" the picture,
            only this list of numbers. <b>The output</b> is four probabilities that always add up to 100%.
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
            Minden <b>rejtett neuron</b> ugyanazt csinálja: megszorozza minden bemenetét egy súllyal, összeadja őket, hozzáad
            egy eltolást, majd a ReLU függvényen engedi át: ha az összeg negatív, a neuron <b>hallgat</b> (0), ha pozitív,
            „tüzel”. A súlytérkép megmutatja, milyen mintára tüzel egy neuron: például egy függőleges sávra a kép közepén.
          </p>
          <p>
            Az első rejtett réteg így egyszerű <b>jellemzőket</b> keres (egy vonaldarab, egy sarok), a második ezek
            kombinációit. A kimeneti réteg a jellemzőkből pontszámot ad minden osztálynak, a <b>softmax</b> pedig ezeket
            valószínűséggé alakítja. A jelenetben a vonalak a legerősebb hozzájárulások (súly × érték): a narancs növeli,
            a kék csökkenti a következő neuron értékét.
          </p>
          <p>
            A súlyokat senki nem állította be kézzel: a háló a tanítás során, több száz példarajzból tanulta meg őket
            visszaterjesztéssel (lásd a Neurális háló leckét).
          </p>
        </>
      ),
      en: (
        <>
          <p>
            Every <b>hidden neuron</b> does the same thing: it multiplies each input by a weight, adds them up, adds a bias
            and passes the result through ReLU: if the sum is negative the neuron stays <b>silent</b> (0), if positive it
            "fires". The weight map shows which pattern makes a neuron fire, for example a vertical stripe in the middle.
          </p>
          <p>
            So the first hidden layer looks for simple <b>features</b> (a piece of a line, a corner) and the second for
            combinations of them. The output layer turns the features into a score for each class, and <b>softmax</b> turns the
            scores into probabilities. In the scene the lines are the strongest contributions (weight × value): orange
            raises the next neuron's value, blue lowers it.
          </p>
          <p>
            Nobody set the weights by hand: the network learned them during training, from hundreds of example drawings,
            with backpropagation (see the Neural network lesson).
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
          <li>Válaszd a „Függőleges” mintát, állítsd a jelet 0-ra, és küldd végig lassan: rétegről rétegre gyulladnak ki a neuronok.</li>
          <li>Lapozz végig a neuronokon a csúszkával. Találsz olyat, amelyik a függőleges vonalakra „specializálódott”?</li>
          <li>Rajzolj egy vonalat, majd pixelenként alakítsd X-szé. Melyik pixelnél vált át a tipp?</li>
          <li>Csökkentsd az első réteget 4 neuronra: a háló kevesebb jellemzőt tud, és többet téved.</li>
        </ul>
      ),
      en: (
        <ul>
          <li>Choose the "Vertical" sample, set the signal to 0 and send it through slowly: neurons light up layer by layer.</li>
          <li>Step through the neurons with the slider. Can you find one that "specialised" in vertical lines?</li>
          <li>Draw a line, then turn it into an X pixel by pixel. At which pixel does the guess flip?</li>
          <li>Shrink the first layer to 4 neurons: the network can learn fewer features and makes more mistakes.</li>
        </ul>
      ),
    },
  },
  {
    heading: 'math',
    body: {
      hu: (
        <>
          <p className="formula">x ∈ {'{'}0,1{'}'}⁴⁹,  h₁ = ReLU(W₁x + b₁),  h₂ = ReLU(W₂h₁ + b₂)</p>
          <p className="formula">z = W₃h₂ + b₃,  pₖ = eᶻᵏ / Σⱼ eᶻʲ  (softmax)</p>
          <p>
            ReLU(s) = max(0, s). A softmax miatt a kimenetek pozitívak, és összegük 1. Ezért a háló <b>mindig</b> mond
            valamit, akkor is, ha a bemenet egyik osztályra sem hasonlít (erről a Hallucináció leckében lesz szó).
          </p>
        </>
      ),
      en: (
        <>
          <p className="formula">x ∈ {'{'}0,1{'}'}⁴⁹,  h₁ = ReLU(W₁x + b₁),  h₂ = ReLU(W₂h₁ + b₂)</p>
          <p className="formula">z = W₃h₂ + b₃,  pₖ = eᶻᵏ / Σⱼ eᶻʲ  (softmax)</p>
          <p>
            ReLU(s) = max(0, s). Because of softmax the outputs are positive and add up to 1. That is why the network{' '}
            <b>always</b> says something, even when the input looks like none of the classes (more on this in the
            Hallucination lesson).
          </p>
        </>
      ),
    },
  },
  {
    heading: 'usedFor',
    body: {
      hu: <p>Ugyanez az előre terjesztés fut minden neurális hálóban: kézírás-felismerésben (MNIST, 28×28 pixel), képosztályozásban, és a nyelvi modellekben is, ahol a bemenet szavak számsorai, a kimenet pedig a következő szó valószínűsége.</p>,
      en: <p>The same forward pass runs in every neural network: in handwriting recognition (MNIST, 28×28 pixels), in image classification, and in language models, where the input is words turned into numbers and the output is the probability of the next word.</p>,
    },
  },
];

export default function ForwardPassLesson() {
  const { pick } = useLang();
  const [h1, setH1] = useState(10);
  const [h2, setH2] = useState(6);
  const net = useMemo(() => trainedPixelNet([h1, h2]), [h1, h2]);
  const testAcc = useMemo(() => pixelAccuracy(net, makeShapeSet(50, 0.03, 999)), [net]);
  const [input, setInput] = useState(() => canonical('vertical'));
  const [phase, setPhase] = useState(3);
  const [playing, setPlaying] = useState(false);
  const [neuron, setNeuron] = useState(0);
  const L = net.sizes.length - 1;
  const shown = Math.min(neuron, h1 - 1);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    let p = 0;
    const tick = (now: number) => {
      p = Math.min(L, p + ((now - last) / 1000) * 0.8);
      last = now;
      setPhase(p);
      if (p >= L) setPlaying(false);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, L]);

  const outs = useMemo(() => pixelForward(net, input), [net, input]);
  const probs = outs[L];
  const best = argmax(probs);
  const classNames = SHAPES.map((s) => pick(SHAPE_NAMES[s]));
  const layerNames = [
    pick(txt.inputL),
    ...net.sizes.slice(1, -1).map((n, i) => pick({ hu: `${i + 1}. rejtett (${n})`, en: `hidden ${i + 1} (${n})` })),
    pick(txt.outL),
  ];
  const activeCount = outs.slice(1, L).reduce((a, h) => a + h.filter((v) => v > 0).length, 0);
  const hiddenTotal = net.sizes.slice(1, -1).reduce((a, b) => a + b, 0);
  const done = phase >= L;
  const nVal = outs[1][shown];

  const scene = (
    <PixelNetScene
      net={net}
      input={input}
      phase={phase}
      classNames={classNames}
      layerNames={layerNames}
      selected={shown}
      onSelect={setNeuron}
    />
  );

  const overlay = (
    <>
      <Readout label={pick(txt.input)} value={`[${Array.from(input.subarray(0, 10)).join(',')},…]`} />
      <Readout label={pick(txt.active)} value={`${activeCount} / ${hiddenTotal}`} />
      <Readout label={pick(txt.answer)} value={done ? classNames[best] : pick(txt.waiting)} />
      <Readout label={pick(txt.conf)} value={done ? pct(probs[best]) : pick(txt.waiting)} />
    </>
  );

  const controls = (
    <>
      <PixelInput value={input} onChange={setInput} />
      <ButtonRow>
        <button
          className="primary"
          onClick={() => {
            setPhase(0);
            setPlaying(true);
          }}
        >
          {pick(txt.send)}
        </button>
      </ButtonRow>
      <Slider label={pick(txt.phase)} hint={pick(txt.phaseHint)} value={phase} min={0} max={L} step={0.05} onChange={(v) => { setPlaying(false); setPhase(v); }} format={(v) => v.toFixed(2)} />
      <h3>{pick({ hu: 'Rejtett neuronok', en: 'Hidden neurons' })}</h3>
      <Slider label={pick(txt.neuron)} value={shown + 1} min={1} max={h1} step={1} onChange={(v) => setNeuron(v - 1)} />
      <WeightMap net={net} neuron={shown} label={pick(txt.weights)} />
      <Readout label={pick(txt.neuronVal)} value={nVal > 0 ? nVal.toFixed(2) : `0 (${pick(txt.silent)})`} />
      <small className="panel-hint">{pick(txt.neuronHint)}</small>
      <h3>{pick({ hu: 'A háló mérete', en: 'Network size' })}</h3>
      <Slider label={pick(txt.h1)} value={h1} min={3} max={14} step={1} onChange={setH1} />
      <Slider label={pick(txt.h2)} value={h2} min={2} max={10} step={1} onChange={setH2} />
      <Readout label={pick(txt.acc)} value={pct(testAcc)} />
      <small className="panel-hint">{pick(txt.sizeHint)}</small>
    </>
  );

  return (
    <LessonLayout
      category="deep"
      title={{ hu: 'Bemenettől a kimenetig', en: 'From input to output' }}
      intro={{
        hu: 'Kövesd végig egy rajz útját a hálón: hogyan lesz 49 pixelből rejtett jellemző, és abból valószínűség.',
        en: 'Follow a drawing through the network: how 49 pixels become hidden features, and features become probabilities.',
      }}
      scene={scene}
      overlay={overlay}
      controls={controls}
      sections={sections}
    />
  );
}
