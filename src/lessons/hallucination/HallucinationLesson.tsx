import { useEffect, useMemo, useRef, useState } from 'react';
import { ButtonRow, Slider, Toggle } from '../../components/Controls';
import { LessonLayout, type LessonSection } from '../../components/LessonLayout';
import { pct, Readout } from '../../components/Readout';
import { useLang } from '../../i18n/i18n';
import { buildNgram, CORPUS, END, inCorpus, nextWords, openers, possibleSentences, sampleWord } from '../../ml/ngram';
import { adversarial, argmax, confidentOnNoise, predict, SHAPES, trainedPixelNet } from '../../ml/pixelNet';
import { createRng } from '../../ml/random';
import { canonical, PixelInput, SHAPE_NAMES } from '../forward-pass/PixelInput';
import { PixelNetScene } from '../forward-pass/PixelNetScene';
import { NgramScene, type Candidate } from './NgramScene';

const txt = {
  tabVision: { hu: 'Magabiztos tévedés', en: 'Confident mistakes' },
  tabLm: { hu: 'Nyelvi modell', en: 'Language model' },
  threshold: { hu: 'Bizonytalansági küszöb', en: 'Uncertainty threshold' },
  thresholdHint: {
    hu: 'Ha a legnagyobb valószínűség ez alatt van, a háló azt mondja: „nem tudom”.',
    en: 'If the top probability is below this, the network says "I don\'t know".',
  },
  fool: { hu: '🎯 Megtévesztő példa (pár pixel átbillentése)', en: '🎯 Adversarial example (flip a few pixels)' },
  answer: { hu: 'Válasz', en: 'Answer' },
  conf: { hu: 'Biztonság', en: 'Confidence' },
  dunno: { hu: 'nem tudom', en: "I don't know" },
  noiseShare: { hu: 'Véletlen zajképek, amelyeket a küszöb fölött besorol', en: 'Random noise images it labels above the threshold' },
  flips: { hu: 'Átbillentett pixelek (sárga)', en: 'Flipped pixels (yellow)' },
  layersIn: { hu: 'Bemenet 7×7', en: 'Input 7×7' },
  out: { hu: 'Kimenet', en: 'Output' },
  // language model
  start: { hu: 'A mondat eleje', en: 'Start of the sentence' },
  next: { hu: 'Következő szó', en: 'Next word' },
  finish: { hu: 'Mondat befejezése', en: 'Finish the sentence' },
  again: { hu: '↺ Újra', en: '↺ Again' },
  context: { hu: 'Kontextus (hány előző szót lát)', en: 'Context (previous words it sees)' },
  contextHint: {
    hu: 'Egy szó után csak azt tudja, mi szokott jönni utána, azt nem, miről szól a mondat.',
    en: 'With one word it only knows what usually comes next, not what the sentence is about.',
  },
  temp: { hu: 'Hőmérséklet', en: 'Temperature' },
  tempHint: {
    hu: 'Alacsony: a gyakoribb szót választja; magas: merészebben választ. Ha két szó egyformán gyakori, a hőmérséklet nem segít.',
    en: 'Low: prefers the more frequent word; high: picks more boldly. If two words are equally common, temperature does not help.',
  },
  grounded: { hu: 'Tudásbázis bekapcsolása (visszakeresés, RAG)', en: 'Turn on the knowledge base (retrieval, RAG)' },
  groundedHint: {
    hu: 'Csak olyan szót enged, amellyel a mondat egy ismert tényt folytat.',
    en: 'Only allows words that continue a known fact.',
  },
  corpus: { hu: 'A tanítószöveg (minden, amit a modell valaha olvasott)', en: 'The training text (everything the model ever read)' },
  sentence: { hu: 'Mondat', en: 'Sentence' },
  verdict: { hu: 'Ellenőrzés', en: 'Check' },
  truthy: { hu: '✓ igaz: így szerepelt a tanítószövegben', en: '✓ true: it was in the training text' },
  made: { hu: '✗ kitalált: folyékony, de nem igaz', en: '✗ made up: fluent but false' },
  pending: { hu: '…', en: '…' },
  space: { hu: 'Lehetséges mondatok ebből a kezdésből', en: 'Possible sentences from this start' },
  ofWhich: { hu: 'igaz', en: 'true' },
  legend: { hu: 'Zöld oszlop: igaz tényhez vezet · Narancs: kitalált mondathoz', en: 'Green bar: leads to a true fact · Orange: to a made-up sentence' },
  end: { hu: '(pont)', en: '(full stop)' },
};

const sections: LessonSection[] = [
  {
    heading: 'whatIsIt',
    body: {
      hu: (
        <>
          <p>
            <b>Hallucinációnak</b> nevezzük, amikor egy MI-modell magabiztosan állít valamit, ami nem igaz: kitalál egy
            forrást, egy dátumot, egy idézetet. Ez nem hiba a programban, hanem abból következik, <b>ahogyan ezek a
            modellek működnek</b>.
          </p>
          <p>
            A neurális háló kimenete mindig egy valószínűség-eloszlás, amelynek összege 100%. Nincs benne beépített „nem
            tudom” válasz: a háló akkor is választ, ha a kérdés egészen más, mint amit valaha látott.
          </p>
        </>
      ),
      en: (
        <>
          <p>
            <b>Hallucination</b> is when an AI model confidently states something that is not true: it invents a source, a
            date, a quote. It is not a bug in the program; it follows from <b>how these models work</b>.
          </p>
          <p>
            A neural network's output is always a probability distribution that adds up to 100%. There is no built-in "I
            don't know": the network picks an answer even when the question is unlike anything it has seen.
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
            <b>Magabiztos tévedés.</b> Az alakfelismerő háló csak négyféle rajzot látott. Ha zajt, üres képet vagy egy T betűt
            kap, akkor is kiválaszt egy osztályt, gyakran 90% feletti biztonsággal. Az ilyen, a tanítóadattól eltérő bemenetet{' '}
            <b>eloszláson kívüli</b> (out-of-distribution) adatnak hívják. A <b>megtévesztő példák</b> (adversarial examples)
            ennek a fordítottjai: pár jól megválasztott pixel átbillentésével a háló véleménye átfordul, pedig egy ember még
            mindig ugyanazt látja.
          </p>
          <p>
            <b>Nyelvi modell.</b> A nyelvi modell a következő szót jósolja. Ez a kicsi modell csak megszámolja, melyik szó
            melyik után jött a tanítószövegben. „Magyarország fővárosa” után egy szónyi kontextussal csak a „fővárosa” szót
            látja, ami után ötféle város jött. Így ugyanolyan valószínűnek tartja, hogy „Magyarország fővárosa Róma”: a
            mondat nyelvtanilag hibátlan, csak nem igaz. A nagy nyelvi modellek sokkal többet látnak, de ugyanígy a{' '}
            <b>valószínű folytatást</b> keresik, nem az igazat. Ahol a tanítóadat kevés vagy ellentmondásos, ott ugyanígy
            összekevernek tényeket.
          </p>
          <p>A hallucináció csökkentésének módjai:</p>
          <ul>
            <li><b>Visszakeresés (RAG):</b> a modell válasz előtt egy tudásbázisban keres, és abból dolgozik (a „Tudásbázis” kapcsoló).</li>
            <li><b>Több és jobb adat, hosszabb kontextus:</b> a kontextus csúszkán látod, hogy több előző szóval kevesebb a keveredés.</li>
            <li><b>Bizonytalanság jelzése:</b> küszöb, „nem tudom” válasz, több modell összevetése. Ez sem tökéletes: a zajképek egy részét a háló a küszöb fölött is besorolja.</li>
            <li><b>Ellenőrzés:</b> forrás kérése, és az eredmény emberi vagy automatikus átnézése.</li>
          </ul>
        </>
      ),
      en: (
        <>
          <p>
            <b>Confident mistakes.</b> The shape network has only seen four kinds of drawing. Given noise, a blank image or the
            letter T, it still picks a class, often with over 90% confidence. Such inputs, unlike the training data, are called{' '}
            <b>out-of-distribution</b>. <b>Adversarial examples</b> are the reverse: flipping a few well-chosen pixels flips the
            network's opinion, while a person still sees the same thing.
          </p>
          <p>
            <b>Language model.</b> A language model predicts the next word. This small one just counts which word followed
            which in its training text. After "The capital of Hungary is" with one word of context it only sees "is", after
            which five different cities appeared. So it finds "The capital of Hungary is Rome" just as likely: the sentence is
            grammatically perfect, just false. Large language models see far more, but they too look for the <b>likely
            continuation</b>, not the true one. Where training data is thin or contradictory, they mix facts up in the same way.
          </p>
          <p>Ways to reduce hallucination:</p>
          <ul>
            <li><b>Retrieval (RAG):</b> before answering, the model searches a knowledge base and works from it (the "knowledge base" switch).</li>
            <li><b>More and better data, longer context:</b> the context slider shows that more previous words mean less mixing.</li>
            <li><b>Signalling uncertainty:</b> a threshold, an "I don't know" answer, comparing several models. This is not perfect either: the network labels some noise images above the threshold too.</li>
            <li><b>Checking:</b> asking for sources, and having people or tools review the result.</li>
          </ul>
        </>
      ),
    },
  },
  {
    heading: 'tryIt',
    body: {
      hu: (
        <ul>
          <li>A „Magabiztos tévedés” fülön nyomd meg többször a „Zaj” gombot. Hány százalékos biztonsággal sorolja be a háló?</li>
          <li>Emeld a küszöböt 90%-ra: a zajképek hány százalékára mondja még mindig, hogy biztos?</li>
          <li>Válaszd az X mintát, és kérj megtévesztő példát: hány pixel kell, hogy mást mondjon?</li>
          <li>A „Nyelvi modell” fülön kezdd a mondatot „Albert” szóval, és fejezd be többször. Hányszor igaz az eredmény?</li>
          <li>Állítsd a kontextust 2-re vagy 3-ra, majd kapcsold be a tudásbázist. Mi változik?</li>
        </ul>
      ),
      en: (
        <ul>
          <li>On the "Confident mistakes" tab press "Noise" a few times. How confident is the network?</li>
          <li>Raise the threshold to 90%: what share of noise images is it still "sure" about?</li>
          <li>Choose the X sample and ask for an adversarial example: how many pixels does it take to change its mind?</li>
          <li>On the "Language model" tab start with "Albert" and finish the sentence a few times. How often is the result true?</li>
          <li>Set the context to 2 or 3, then turn on the knowledge base. What changes?</li>
        </ul>
      ),
    },
  },
  {
    heading: 'math',
    body: {
      hu: (
        <>
          <p className="formula">P(wₜ | wₜ₋ₖ … wₜ₋₁) = darab(wₜ₋ₖ … wₜ) / darab(wₜ₋ₖ … wₜ₋₁)</p>
          <p className="formula">pᵢ ∝ darabᵢ^(1/T)   (T = hőmérséklet),   Σᵢ pᵢ = 1</p>
          <p>
            k a kontextus hossza. Az eloszlás minden lépésben 1-re összegződik, akár van megbízható tudás mögötte, akár
            nincs. A nagy nyelvi modellek ugyanezt a feltételes valószínűséget egy Transformer-hálóval becsülik meg, több ezer
            szó kontextusból.
          </p>
        </>
      ),
      en: (
        <>
          <p className="formula">P(wₜ | wₜ₋ₖ … wₜ₋₁) = count(wₜ₋ₖ … wₜ) / count(wₜ₋ₖ … wₜ₋₁)</p>
          <p className="formula">pᵢ ∝ countᵢ^(1/T)   (T = temperature),   Σᵢ pᵢ = 1</p>
          <p>
            k is the context length. At every step the distribution adds up to 1, whether or not reliable knowledge is behind
            it. Large language models estimate the same conditional probability with a Transformer network, from thousands
            of words of context.
          </p>
        </>
      ),
    },
  },
  {
    heading: 'usedFor',
    body: {
      hu: <p>Minden generatív MI-t érint: chatbotok, kódgenerálás, képgenerálás (pl. hat ujjú kezek), orvosi vagy jogi asszisztensek. Ezért fontos, hogy a fontos állításokat forrásból ellenőrizzük, és hogy a rendszerek jelezzék a bizonytalanságukat.</p>,
      en: <p>It affects all generative AI: chatbots, code generation, image generation (e.g. six-fingered hands), medical or legal assistants. That is why important claims should be checked against sources, and why systems should signal their uncertainty.</p>,
    },
  },
];

export default function HallucinationLesson() {
  const { pick, lang } = useLang();
  const [tab, setTab] = useState<'vision' | 'lm'>('vision');

  // --- confident mistakes ---
  const net = useMemo(() => trainedPixelNet([10, 6]), []);
  const [input, setInput] = useState(() => canonical('cross'));
  const [marked, setMarked] = useState<Set<number>>();
  const [threshold, setThreshold] = useState(0.8);
  const noiseShare = useMemo(() => confidentOnNoise(net, 300, threshold, 5), [net, threshold]);
  const probs = useMemo(() => predict(net, input), [net, input]);
  const best = argmax(probs);
  const classNames = SHAPES.map((s) => pick(SHAPE_NAMES[s]));
  const L = net.sizes.length - 1;
  const layerNames = [pick(txt.layersIn), ...net.sizes.slice(1, -1).map((n, i) => pick({ hu: `${i + 1}. rejtett (${n})`, en: `hidden ${i + 1} (${n})` })), pick(txt.out)];
  const setImage = (x: Float64Array) => {
    setInput(x);
    setMarked(undefined);
  };

  // --- language model ---
  const [context, setContext] = useState(1);
  const [temp, setTemp] = useState(1);
  const [grounded, setGrounded] = useState(false);
  const model = useMemo(() => buildNgram(CORPUS[lang], context), [lang, context]);
  const starts = useMemo(() => openers(model), [model]);
  const [words, setWords] = useState<string[]>([]);
  const rng = useRef(createRng(11));
  useEffect(() => setWords([starts.includes('Albert') ? 'Albert' : starts[0]]), [lang]); // eslint-disable-line react-hooks/exhaustive-deps
  const done = words[words.length - 1] === END;
  const candidates: Candidate[] = useMemo(() => {
    if (!words.length || done) return [];
    return nextWords(model, words, temp, grounded).map((d) => ({
      ...d,
      truthful: model.sentences.some((s) => s.length > words.length && words.every((w, i) => s[i] === w) && s[words.length] === d.word),
    }));
  }, [model, words, temp, grounded, done]);
  const step = (seq: string[]) => {
    const w = sampleWord(nextWords(model, seq, temp, grounded), rng.current);
    return w ? [...seq, w] : seq;
  };
  const finish = () => {
    let seq = words;
    for (let i = 0; i < 14 && seq[seq.length - 1] !== END; i++) {
      const n = step(seq);
      if (n === seq) break;
      seq = n;
    }
    setWords(seq);
  };
  const space = useMemo(() => {
    if (!words.length) return { all: 0, ok: 0 };
    const all = possibleSentences(model, [words[0]], grounded);
    return { all: all.length, ok: all.filter((s) => inCorpus(model, s)).length };
  }, [model, words, grounded]);
  const sentence = words.filter((w) => w !== END).join(' ') + (done ? '.' : ' …');

  const tabs = (
    <div className="scene-tabs">
      <button className={tab === 'vision' ? 'chip active' : 'chip'} onClick={() => setTab('vision')}>
        {pick(txt.tabVision)}
      </button>
      <button className={tab === 'lm' ? 'chip active' : 'chip'} onClick={() => setTab('lm')}>
        {pick(txt.tabLm)}
      </button>
    </div>
  );

  const scene = (
    <>
      {tabs}
      {tab === 'vision' ? (
        <PixelNetScene net={net} input={input} phase={L} classNames={classNames} layerNames={layerNames} marked={marked} />
      ) : (
        <NgramScene words={words} candidates={candidates} endLabel={pick(txt.end)} />
      )}
    </>
  );

  const overlay =
    tab === 'vision' ? (
      <>
        <Readout label={pick(txt.answer)} value={probs[best] >= threshold ? classNames[best] : pick(txt.dunno)} />
        <Readout label={pick(txt.conf)} value={pct(probs[best])} />
        <Readout label={pick(txt.noiseShare)} value={pct(noiseShare)} />
        {marked && <Readout label={pick(txt.flips)} value={marked.size} />}
      </>
    ) : (
      <>
        <Readout label={pick(txt.sentence)} value={sentence} />
        <Readout label={pick(txt.verdict)} value={done ? (inCorpus(model, words) ? pick(txt.truthy) : pick(txt.made)) : pick(txt.pending)} />
        <Readout label={pick(txt.space)} value={`${space.all} (${pick(txt.ofWhich)}: ${space.ok})`} />
      </>
    );

  const visionControls = (
    <>
      <PixelInput value={input} onChange={setImage} strangers />
      <button
        className="full"
        onClick={() => {
          const a = adversarial(net, input, 12);
          setInput(a.img);
          setMarked(new Set(a.flips));
        }}
      >
        {pick(txt.fool)}
      </button>
      <Slider label={pick(txt.threshold)} hint={pick(txt.thresholdHint)} value={threshold} min={0.3} max={0.99} step={0.01} onChange={setThreshold} format={(v) => pct(v)} />
    </>
  );

  const lmControls = (
    <>
      <div className="control">
        <span className="control-row">{pick(txt.start)}</span>
        <div className="chip-row">
          {starts.map((s) => (
            <button key={s} className={words[0] === s ? 'chip active' : 'chip'} onClick={() => setWords([s])}>
              {s}
            </button>
          ))}
        </div>
      </div>
      <ButtonRow>
        <button className="primary" onClick={() => setWords(step(words))} disabled={done}>
          {pick(txt.next)}
        </button>
        <button onClick={finish} disabled={done}>
          {pick(txt.finish)}
        </button>
      </ButtonRow>
      <button className="full" onClick={() => setWords(words.slice(0, 1))}>
        {pick(txt.again)}
      </button>
      <small className="panel-hint">{pick(txt.legend)}</small>
      <Slider label={pick(txt.context)} hint={pick(txt.contextHint)} value={context} min={1} max={3} step={1} onChange={(v) => { setContext(v); setWords(words.slice(0, 1)); }} />
      <Slider label={pick(txt.temp)} hint={pick(txt.tempHint)} value={temp} min={0.2} max={2} step={0.1} onChange={setTemp} format={(v) => v.toFixed(1)} />
      <Toggle label={pick(txt.grounded)} checked={grounded} onChange={(v) => { setGrounded(v); setWords(words.slice(0, 1)); }} />
      <small className="panel-hint">{pick(txt.groundedHint)}</small>
      <h3>{pick(txt.corpus)}</h3>
      <ul className="corpus-list">
        {CORPUS[lang].map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </>
  );

  return (
    <LessonLayout
      category="deep"
      title={{ hu: 'Hallucináció', en: 'Hallucination' }}
      intro={{
        hu: 'Miért állít a háló magabiztosan valótlant? Adj neki zajt, csapd be pár pixellel, és nézd, ahogy egy kis nyelvi modell tényeket kever.',
        en: 'Why does a network confidently state falsehoods? Feed it noise, fool it with a few pixels, and watch a small language model mix up facts.',
      }}
      scene={scene}
      overlay={overlay}
      controls={tab === 'vision' ? visionControls : lmControls}
      sections={sections}
    />
  );
}
