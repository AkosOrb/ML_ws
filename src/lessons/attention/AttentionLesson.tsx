import { useMemo, useState } from 'react';
import { Slider, Toggle } from '../../components/Controls';
import { LessonLayout, type LessonSection } from '../../components/LessonLayout';
import { useLang } from '../../i18n/i18n';
import { attention, HEADS, SENTENCES, type HeadId } from '../../ml/attention';
import { AttentionScene } from './AttentionScene';

const txt = {
  tabArcs: { hu: 'Figyelem-ívek', en: 'Attention arcs' },
  tabSpace: { hu: 'Jelentéstér', en: 'Meaning space' },
  sentence: { hu: 'Mondat', en: 'Sentence' },
  head: { hu: 'Figyelemfej', en: 'Attention head' },
  pronoun: { hu: 'Névmás → főnév', en: 'Pronoun → noun' },
  verb: { hu: 'Ki mit csinál?', en: 'Who does what?' },
  meaning: { hu: 'Hasonló jelentés', en: 'Similar meaning' },
  neighbour: { hu: 'Szomszédok', en: 'Neighbours' },
  headHint: {
    pronoun: { hu: 'A névmás megkeresi, kire vagy mire utal.', en: 'The pronoun looks for what it refers to.' },
    verb: { hu: 'Az ige a cselekvőt és a tárgyat keresi, a főnevek az igét.', en: 'The verb looks for its doer and object; nouns look for the verb.' },
    meaning: { hu: 'Minden szó a hozzá hasonló jelentésű szavakra figyel.', en: 'Every word attends to words with similar meaning.' },
    neighbour: { hu: 'Minden szó a közvetlen szomszédaira figyel (szórend).', en: 'Every word attends to its immediate neighbours (word order).' },
  },
  token: { hu: 'Melyik szó „kérdez”? (vagy kattints a 3D-ben)', en: 'Which word is "asking"? (or click in 3D)' },
  temp: { hu: 'Hőmérséklet (élesség)', en: 'Temperature (sharpness)' },
  tempHint: {
    hu: 'Alacsony: a figyelem egy szóra fókuszál. Magas: szétterül mindenkire.',
    en: 'Low: attention focuses on one word. High: it spreads over everyone.',
  },
  causal: { hu: 'Csak visszafelé nézhet (GPT-stílus)', en: 'Can only look back (GPT style)' },
  matrix: { hu: 'Figyelemmátrix (sor = kérdező szó)', en: 'Attention matrix (row = asking word)' },
  axes: {
    hu: ['élőlény ↔ tárgy', 'cselekvés', 'hely ↔ tulajdonság'],
    en: ['living ↔ thing', 'action', 'place ↔ property'],
  },
};

const sections: LessonSection[] = [
  {
    heading: 'whatIsIt',
    body: {
      hu: (
        <p>
          A <b>Transformer</b> a mai nyelvi modellek (például a chatbotok és a gépi fordítók) alapja. A kulcsötlete a{' '}
          <b>figyelem</b> (attention): egy mondat minden szava megnézheti az összes többit, és eldöntheti, melyikre mennyire
          figyeljen. Így érti meg a „mert az puha volt” mondatban, hogy az „az” a szőnyegre utal, a „mert ő fáradt volt”
          mondatban pedig, hogy a macskára.
        </p>
      ),
      en: (
        <p>
          The <b>Transformer</b> is the foundation of today's language models (such as chatbots and machine translators). Its
          key idea is <b>attention</b>: every word in a sentence can look at all the others and decide how much to focus on
          each. That is how it understands that in "because it was soft", "it" means the mat, while in "because it was tired",
          it means the cat.
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
            Minden szó egy számsor (vektor), ami a jelentését írja le. Ebből a szó három dolgot készít: egy <b>kérdést</b>{' '}
            (query: „mit keresek?”), egy <b>címkét</b> (key: „mit kínálok?”) és egy <b>tartalmat</b> (value). A kérdező szó
            összeveti a kérdését mindenki címkéjével; ahol jó az egyezés, oda figyel jobban. Végül a figyelt szavak tartalmának
            súlyozott átlagát veszi: a „Jelentéstér” fülön a lila nyolcszög ez az új, a mondat környezetével gazdagított jelentés.
          </p>
          <p>
            Egy Transformerben sok ilyen <b>figyelemfej</b> dolgozik párhuzamosan, mindegyik más kapcsolatra szakosodik, és
            sok réteg épül egymásra. Ebben a leckében a szóvektorokat és a fejeket kézzel állítottuk be, hogy mindegyiknek
            jól látható feladata legyen; egy valódi modell ezeket több milliárd mondatból tanulja meg.
          </p>
        </>
      ),
      en: (
        <>
          <p>
            Every word is a list of numbers (a vector) describing its meaning. From it the word makes three things: a{' '}
            <b>query</b> ("what am I looking for?"), a <b>key</b> ("what do I offer?") and a <b>value</b> (its content). The
            asking word compares its query with everyone's key; where they match well, it pays more attention. Finally it takes
            a weighted average of the attended words' values: on the "Meaning space" tab the purple octahedron is this new
            meaning, enriched by the sentence context.
          </p>
          <p>
            A Transformer runs many such <b>attention heads</b> in parallel, each specialising in a different relationship, and
            stacks many layers. In this lesson the word vectors and heads are set by hand so that each has a clearly visible job;
            a real model learns them from billions of sentences.
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
          <li>A „Névmás → főnév” fejjel válts a „fáradt” és a „puha” mondat között: az ív átugrik a macskáról a szőnyegre.</li>
          <li>Válts a „Ki mit csinál?” fejre, és kattints az igére: a cselekvőre és a tárgyra figyel.</li>
          <li>Állítsd a hőmérsékletet magasra: a figyelem szétkenődik, a modell „nem tud dönteni”.</li>
          <li>Kapcsold be a „csak visszafelé” módot: így működnek a szöveget generáló modellek, amelyek nem láthatják a jövőt.</li>
          <li>Nézd meg a jelentésteret: a kérdező szó (fehér) a sárga vonal mentén a figyelt szavak felé tolódik.</li>
        </ul>
      ),
      en: (
        <ul>
          <li>With "Pronoun → noun", switch between the "tired" and "soft" sentences: the arc jumps from the cat to the mat.</li>
          <li>Switch to "Who does what?" and click the verb: it attends to the doer and the object.</li>
          <li>Raise the temperature: attention smears out and the model "cannot decide".</li>
          <li>Turn on "only look back": that is how text-generating models work, since they cannot see the future.</li>
          <li>Look at the meaning space: the asking word (white) shifts along the yellow line towards the words it attends to.</li>
        </ul>
      ),
    },
  },
  {
    heading: 'math',
    body: {
      hu: (
        <>
          <p className="formula">Q = XW_Q,  K = XW_K,  V = XW_V</p>
          <p className="formula">Attention(Q, K, V) = softmax(QKᵀ / (τ·√d)) · V</p>
          <p>
            A softmax minden sort 0 és 1 közötti, 1-re összegződő súlyokká alakít (a mátrix egy sora = egy szó figyelme). A τ
            hőmérséklet ezt élesíti vagy simítja. A „csak visszafelé” maszk a jövőbeli pozíciók pontszámát −∞-re állítja.
          </p>
        </>
      ),
      en: (
        <>
          <p className="formula">Q = XW_Q,  K = XW_K,  V = XW_V</p>
          <p className="formula">Attention(Q, K, V) = softmax(QKᵀ / (τ·√d)) · V</p>
          <p>
            Softmax turns every row into weights between 0 and 1 that sum to 1 (one row of the matrix = one word's attention).
            The temperature τ sharpens or smooths it. The "only look back" mask sets future positions' scores to −∞.
          </p>
        </>
      ),
    },
  },
  {
    heading: 'usedFor',
    body: {
      hu: <p>Chatbotok és nagy nyelvi modellek, gépi fordítás, szövegösszefoglalás, programkód-kiegészítés, sőt képek (Vision Transformer) és fehérjék elemzése is.</p>,
      en: <p>Chatbots and large language models, machine translation, summarisation, code completion, and even images (Vision Transformers) and proteins.</p>,
    },
  },
];

export default function AttentionLesson() {
  const { pick, lang } = useLang();
  const [view, setView] = useState<'arcs' | 'space'>('arcs');
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [head, setHead] = useState<HeadId>('pronoun');
  const [temp, setTemp] = useState(1);
  const [causal, setCausal] = useState(false);
  const sentence = SENTENCES[lang][sentenceIdx];
  const [selected, setSelected] = useState(sentence.focus);
  const sel = Math.min(selected, sentence.tokens.length - 1);

  const A = useMemo(() => attention(sentence.tokens, head, temp, causal), [sentence, head, temp, causal]);

  const pickSentence = (i: number) => {
    setSentenceIdx(i);
    setSelected(SENTENCES[lang][i].focus);
  };

  return (
    <LessonLayout
      category="deep"
      title={{ hu: 'Figyelem és Transformer', en: 'Attention & Transformers' }}
      intro={{
        hu: 'A chatbotok titka: minden szó eldönti, a mondat melyik másik szavára figyeljen, és ebből érti meg a jelentést.',
        en: "The secret behind chatbots: every word decides which other words in the sentence to attend to, and that's how meaning is understood.",
      }}
      scene={
        <>
          <div className="scene-tabs">
            <button className={view === 'arcs' ? 'chip active' : 'chip'} onClick={() => setView('arcs')}>
              {pick(txt.tabArcs)}
            </button>
            <button className={view === 'space' ? 'chip active' : 'chip'} onClick={() => setView('space')}>
              {pick(txt.tabSpace)}
            </button>
          </div>
          <AttentionScene view={view} tokens={sentence.tokens} weights={A[sel]} selected={sel} onSelect={setSelected} axisLabels={txt.axes[lang]} />
        </>
      }
      overlay={
        <div className="readout attn-matrix">
          <span>{pick(txt.matrix)}</span>
          <table>
            <tbody>
              {A.map((row, i) => (
                <tr key={i} className={i === sel ? 'sel' : ''} onClick={() => setSelected(i)}>
                  <th>{sentence.tokens[i].text.replace(/[.,]/g, '')}</th>
                  {row.map((v, j) => (
                    <td key={j} style={{ background: `rgba(232, 85, 58, ${v})` }} title={`${Math.round(v * 100)}%`} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
      controls={
        <>
          <div className="control">
            <span className="control-row">{pick(txt.sentence)}</span>
            <div className="chip-col">
              {SENTENCES[lang].map((s, i) => (
                <button key={s.id} className={i === sentenceIdx ? 'chip active' : 'chip'} onClick={() => pickSentence(i)}>
                  {s.tokens.map((t) => t.text).join(' ')}
                </button>
              ))}
            </div>
          </div>
          <div className="control">
            <span className="control-row">{pick(txt.head)}</span>
            <div className="chip-row">
              {HEADS.map((h) => (
                <button key={h} className={h === head ? 'chip active' : 'chip'} onClick={() => setHead(h)}>
                  {pick(txt[h])}
                </button>
              ))}
            </div>
            <small>{pick(txt.headHint[head])}</small>
          </div>
          <div className="control">
            <span className="control-row">{pick(txt.token)}</span>
            <div className="chip-row">
              {sentence.tokens.map((t, i) => (
                <button key={i} className={i === sel ? 'chip active' : 'chip'} onClick={() => setSelected(i)}>
                  {t.text.replace(/[.,]/g, '')}
                </button>
              ))}
            </div>
          </div>
          <Slider label={pick(txt.temp)} hint={pick(txt.tempHint)} value={temp} min={0.2} max={3} step={0.05} onChange={setTemp} format={(v) => v.toFixed(2)} />
          <Toggle label={pick(txt.causal)} checked={causal} onChange={setCausal} />
        </>
      }
      sections={sections}
    />
  );
}
