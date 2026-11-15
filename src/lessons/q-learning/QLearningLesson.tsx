import { useMemo, useRef, useState } from 'react';
import { ButtonRow, Slider, Toggle } from '../../components/Controls';
import { LessonLayout, type LessonSection } from '../../components/LessonLayout';
import { LossChart } from '../../components/LossChart';
import { Readout } from '../../components/Readout';
import { useLang } from '../../i18n/i18n';
import { createAgent, defaultWorld, greedyPath, qStep } from '../../ml/qlearning';
import { useTrainingLoop } from '../../useTrainingLoop';
import { GridScene } from './GridScene';

const txt = {
  speed: { hu: 'Sebesség (lépés/mp)', en: 'Speed (steps/s)' },
  alpha: { hu: 'α (tanulási ráta)', en: 'α (learning rate)' },
  gamma: { hu: 'γ (türelem / diszkont)', en: 'γ (patience / discount)' },
  gammaHint: {
    hu: 'Mennyire számít a későbbi jutalom. Kicsi γ: rövidlátó ágens.',
    en: 'How much future reward matters. Small γ: a short-sighted agent.',
  },
  epsilon: { hu: 'ε (felfedezés)', en: 'ε (exploration)' },
  epsilonHint: {
    hu: 'Ennyi eséllyel lép véletlenszerűen, hogy új utakat próbáljon ki.',
    en: 'The chance of taking a random step to try new routes.',
  },
  heat: { hu: 'Értéktérkép (legjobb Q)', en: 'Value map (best Q)' },
  arrows: { hu: 'Tanult irányok (nyilak)', en: 'Learned directions (arrows)' },
  path: { hu: 'Legjobb út a starttól', en: 'Best route from the start' },
  episode: { hu: 'Epizód', en: 'Episode' },
  avg: { hu: 'Átlagos jutalom (utolsó 50)', en: 'Average reward (last 50)' },
  chart: { hu: 'Jutalom epizódonként', en: 'Reward per episode' },
  reset: { hu: '↺ Ágens újrakezdése', en: '↺ Reset agent' },
  legend: {
    hu: 'Sárga golyó: ágens · zöld zászló: cél (+1) · narancs láva: csapda (−1) · minden lépés −0,04',
    en: 'Yellow ball: agent · green flag: goal (+1) · orange lava: trap (−1) · every step −0.04',
  },
};

const sections: LessonSection[] = [
  {
    heading: 'whatIsIt',
    body: {
      hu: (
        <p>
          A megerősítéses tanulásban nincs tanító adat. Egy <b>ágens</b> cselekszik egy környezetben, és minden lépés után
          <b> jutalmat vagy büntetést</b> kap. A célja, hogy összességében minél több jutalmat gyűjtsön. Itt egy labirintusban
          kell megtalálnia a célt, és elkerülnie a lávát, úgy, hogy előre semmit nem tud a pályáról.
        </p>
      ),
      en: (
        <p>
          In reinforcement learning there is no training data. An <b>agent</b> acts in an environment and gets a{' '}
          <b>reward or penalty</b> after every step. Its aim is to collect as much reward as possible overall. Here it must find
          the goal in a maze and avoid the lava, knowing nothing about the map in advance.
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
            A Q-learning minden mezőre és minden irányra megjegyez egy számot, a <b>Q-értéket</b>: „mennyi jutalmat várhatok,
            ha innen erre lépek, és utána okosan folytatom?”. Kezdetben minden nulla, az ágens bolyong. Amikor egyszer
            véletlenül célba ér, a jutalom híre lépésről lépésre <b>visszaszivárog</b> az odavezető mezőkre.
          </p>
          <p>
            Az értéktérképen ez látszik: a zöld a cél felől terjed szét. A nyilak mutatják, merre lépne most a legszívesebben.
            Az ε miatt néha szándékosan véletlenszerűen lép, hogy ne ragadjon le az első talált útnál
            (<b>felfedezés kontra kihasználás</b>).
          </p>
        </>
      ),
      en: (
        <>
          <p>
            Q-learning stores a number for every cell and every direction, the <b>Q-value</b>: "how much reward can I expect if
            I step this way from here and play smart afterwards?". At first everything is zero and the agent wanders. When it
            stumbles onto the goal, news of the reward <b>trickles back</b> step by step to the cells leading there.
          </p>
          <p>
            You can see it on the value map: green spreads out from the goal. The arrows show where it would most like to step
            now. Because of ε it sometimes moves randomly on purpose, so it does not get stuck on the first route it found
            (<b>exploration versus exploitation</b>).
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
          <li>Indítsd lassan, és kövesd az első epizódokat: az ágens teljesen vaktában bolyong.</li>
          <li>Gyorsíts fel 1000 lépés/mp-re, és nézd, ahogy az értéktérkép a céltól visszafelé kizöldül.</li>
          <li>Állítsd ε-t 0-ra a tanulás elején: az ágens beragadhat egy rossz szokásba.</li>
          <li>Csökkentsd γ-t 0,5 alá: a távoli cél „nem éri meg”, az ágens rövidlátó lesz.</li>
          <li>Kapcsold be a legjobb utat: a sárga vonal mutatja, mit tanult meg.</li>
        </ul>
      ),
      en: (
        <ul>
          <li>Start slowly and follow the first episodes: the agent wanders completely blind.</li>
          <li>Speed up to 1000 steps/s and watch the value map turn green backwards from the goal.</li>
          <li>Set ε to 0 at the start of training: the agent can get stuck in a bad habit.</li>
          <li>Lower γ below 0.5: the distant goal is "not worth it" and the agent becomes short-sighted.</li>
          <li>Turn on the best route: the yellow line shows what it has learned.</li>
        </ul>
      ),
    },
  },
  {
    heading: 'math',
    body: {
      hu: (
        <>
          <p className="formula">Q(s, a) ← Q(s, a) + α · [r + γ · maxₐ′ Q(s′, a′) − Q(s, a)]</p>
          <p>
            s az állapot (mező), a a lépés, r a kapott jutalom, s′ az új mező. A szögletes zárójel a „meglepetés”: mennyivel
            jobb vagy rosszabb lett a helyzet a vártnál. Az ε-mohó stratégia ε valószínűséggel véletlenszerű, egyébként a
            legnagyobb Q-értékű lépést választja.
          </p>
        </>
      ),
      en: (
        <>
          <p className="formula">Q(s, a) ← Q(s, a) + α · [r + γ · maxₐ′ Q(s′, a′) − Q(s, a)]</p>
          <p>
            s is the state (cell), a the action, r the reward received, s′ the new cell. The bracket is the "surprise": how
            much better or worse things turned out than expected. The ε-greedy strategy acts randomly with probability ε and
            otherwise picks the action with the highest Q-value.
          </p>
        </>
      ),
    },
  },
  {
    heading: 'usedFor',
    body: {
      hu: <p>Játékok (a sakkot és a gót legyőző programok), robotok mozgásának tanulása, forgalomirányítás, ajánlórendszerek, és a nagy nyelvi modellek finomhangolása emberi visszajelzésből (RLHF).</p>,
      en: <p>Games (programs that beat humans at chess and Go), teaching robots to move, traffic control, recommender systems, and fine-tuning large language models from human feedback (RLHF).</p>,
    },
  },
];

export default function QLearningLesson() {
  const { pick, t } = useLang();
  const world = useMemo(() => defaultWorld(), []);
  const [seed, setSeed] = useState(1);
  const agentRef = useRef(createAgent(world, seed));
  const [, setVersion] = useState(0);
  const [running, setRunning] = useState(false);
  const [logSpeed, setLogSpeed] = useState(1); // 10^1 = 10 steps/s
  const [alpha, setAlpha] = useState(0.5);
  const [gamma, setGamma] = useState(0.95);
  const [epsilon, setEpsilon] = useState(0.2);
  const [showHeat, setShowHeat] = useState(true);
  const [showArrows, setShowArrows] = useState(true);
  const [showPath, setShowPath] = useState(false);
  const speed = Math.round(Math.pow(10, logSpeed));

  const ag = agentRef.current;
  const step = (n: number) => {
    for (let i = 0; i < n; i++) qStep(world, ag, { alpha, gamma, epsilon, maxSteps: 200 });
    setVersion((v) => v + 1);
  };
  useTrainingLoop(running, speed, step);

  const reset = () => {
    agentRef.current = createAgent(world, seed + 1);
    setSeed((s) => s + 1);
    setVersion((v) => v + 1);
  };

  const recent = ag.returns.slice(-50);
  const avg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
  const smoothed = ag.returns.map((_, i, arr) => {
    const w = arr.slice(Math.max(0, i - 9), i + 1);
    return w.reduce((a, b) => a + b, 0) / w.length;
  });
  const path = showPath ? greedyPath(world, ag.Q) : [];

  return (
    <LessonLayout
      category="reinforcement"
      title={{ hu: 'Q-learning', en: 'Q-learning' }}
      intro={{
        hu: 'Egy ágens próbálkozással tanulja meg az utat a labirintusban: jutalom a célért, büntetés a láváért.',
        en: 'An agent learns its way through a maze by trial and error: a reward for the goal, a penalty for the lava.',
      }}
      scene={<GridScene world={world} Q={ag.Q} agentPos={ag.pos} path={path} showHeat={showHeat} showArrows={showArrows} version={ag.episode} />}
      overlay={
        <>
          <Readout label={pick(txt.episode)} value={ag.episode} />
          <Readout label={pick(txt.avg)} value={recent.length ? avg.toFixed(2) : '–'} />
          <LossChart history={smoothed.slice(-300)} label={pick(txt.chart)} />
        </>
      }
      controls={
        <>
          <small className="panel-hint">{pick(txt.legend)}</small>
          <ButtonRow>
            <button className="primary" onClick={() => setRunning((r) => !r)}>
              {running ? t('pause') : t('play')}
            </button>
            <button onClick={() => step(1)} disabled={running}>
              {t('step')}
            </button>
          </ButtonRow>
          <button className="full" onClick={reset}>
            {pick(txt.reset)}
          </button>
          <Slider label={pick(txt.speed)} value={logSpeed} min={0} max={3.3} step={0.05} onChange={setLogSpeed} format={() => String(speed)} />
          <Slider label={pick(txt.alpha)} value={alpha} min={0.01} max={1} step={0.01} onChange={setAlpha} format={(v) => v.toFixed(2)} />
          <Slider label={pick(txt.gamma)} hint={pick(txt.gammaHint)} value={gamma} min={0} max={0.99} step={0.01} onChange={setGamma} format={(v) => v.toFixed(2)} />
          <Slider label={pick(txt.epsilon)} hint={pick(txt.epsilonHint)} value={epsilon} min={0} max={1} step={0.01} onChange={setEpsilon} format={(v) => v.toFixed(2)} />
          <Toggle label={pick(txt.heat)} checked={showHeat} onChange={setShowHeat} />
          <Toggle label={pick(txt.arrows)} checked={showArrows} onChange={setShowArrows} />
          <Toggle label={pick(txt.path)} checked={showPath} onChange={setShowPath} />
        </>
      }
      sections={sections}
    />
  );
}
