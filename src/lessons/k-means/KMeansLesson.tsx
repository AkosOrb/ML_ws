import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Segments } from '../../components/ClassificationScene';
import { ButtonRow, Slider, Toggle } from '../../components/Controls';
import { LessonLayout, type LessonSection } from '../../components/LessonLayout';
import { CLUSTER_COLORS, PointCloudScene, Points, UNASSIGNED } from '../../components/PointCloudScene';
import { Readout } from '../../components/Readout';
import { useLang } from '../../i18n/i18n';
import { makeBlobs3d, type Vec3 } from '../../ml/data3d';
import { inertia, initKmeans, kmeansHalfStep, type KmeansInit, type KmeansState } from '../../ml/kmeans';
import { useTrainingLoop } from '../../useTrainingLoop';

const txt = {
  k: { hu: 'k (klaszterek száma)', en: 'k (number of clusters)' },
  blobs: { hu: 'Valódi csoportok az adatban', en: 'True groups in the data' },
  spread: { hu: 'Szórás', en: 'Spread' },
  points: { hu: 'Pontok száma', en: 'Number of points' },
  init: { hu: 'Kezdés', en: 'Initialisation' },
  random: { hu: 'Véletlen', en: 'Random' },
  plusplus: { hu: 'k-means++', en: 'k-means++' },
  lines: { hu: 'Vonalak a középpontokhoz', en: 'Lines to centres' },
  halfStep: { hu: 'Fél lépés', en: 'Half step' },
  restart: { hu: '↺ Új kezdőpontok', en: '↺ New starting centres' },
  newData: { hu: '🎲 Új adatok', en: '🎲 New data' },
  iteration: { hu: 'Iteráció', en: 'Iteration' },
  next: { hu: 'Következő lépés', en: 'Next step' },
  assign: { hu: 'pontok besorolása', en: 'assign points' },
  update: { hu: 'középpontok mozgatása', en: 'move centres' },
  done: { hu: 'kész, nem változik', en: 'done, no change' },
  inertia: { hu: 'Szóródás (inercia)', en: 'Spread (inertia)' },
};

const sections: LessonSection[] = [
  {
    heading: 'whatIsIt',
    body: {
      hu: (
        <p>
          A k-means <b>címkék nélkül</b> keres csoportokat: senki nem mondja meg neki, melyik pont hova tartozik. Csak
          annyit kérünk, hogy <b>k darab</b> csoportot találjon, amelyekben a pontok közel vannak egymáshoz. Például
          vásárlókat szegmentál vásárlási szokás szerint, vagy egy kép színeit csökkenti néhány fő színre.
        </p>
      ),
      en: (
        <p>
          k-means finds groups <b>without labels</b>: nobody tells it which point belongs where. We only ask it to find{' '}
          <b>k</b> groups whose points are close to each other. For example, it can segment customers by shopping habits or
          reduce an image's colours to a few main ones.
        </p>
      ),
    },
  },
  {
    heading: 'howItWorks',
    body: {
      hu: (
        <>
          <p>Két egyszerű lépést ismételget, amíg már semmi nem változik:</p>
          <ol>
            <li><b>Besorolás:</b> minden pont ahhoz a középponthoz kerül, amelyik a legközelebb van.</li>
            <li><b>Mozgatás:</b> minden középpont a hozzá tartozó pontok átlagába ugrik.</li>
          </ol>
          <p>
            A „Fél lépés” gombbal ezeket külön-külön is megnézheted. Az eredmény a kezdőpontoktól függ: rossz kezdésnél
            két középpont osztozhat egy csoporton. A <b>k-means++</b> ezért egymástól távoli kezdőpontokat választ.
          </p>
        </>
      ),
      en: (
        <>
          <p>It repeats two simple steps until nothing changes:</p>
          <ol>
            <li><b>Assign:</b> every point goes to the nearest centre.</li>
            <li><b>Move:</b> every centre jumps to the average of its points.</li>
          </ol>
          <p>
            Use the "Half step" button to see them one at a time. The result depends on the starting centres: with a bad
            start two centres may share one group. That is why <b>k-means++</b> picks starting centres far from each other.
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
          <li>Lépkedj fél lépésekkel, és figyeld, hogyan ugranak a nagy gömbök a csoportjaik közepére.</li>
          <li>Válts véletlen kezdésre, és kattints többször az „Új kezdőpontok” gombra: néha rossz megoldásban ragad.</li>
          <li>Állíts k-t nagyobbra, mint a valódi csoportok száma: a szóródás csökken, de a csoportok szétdarabolódnak.</li>
          <li>Növeld a szórást: amikor a csoportok összeérnek, már nincs „helyes” válasz.</li>
        </ul>
      ),
      en: (
        <ul>
          <li>Step through half-steps and watch the big spheres jump to the middle of their groups.</li>
          <li>Switch to random initialisation and press "New starting centres" a few times: sometimes it gets stuck in a poor solution.</li>
          <li>Set k higher than the true number of groups: inertia drops, but groups get chopped up.</li>
          <li>Increase the spread: once groups overlap, there is no "right" answer any more.</li>
        </ul>
      ),
    },
  },
  {
    heading: 'math',
    body: {
      hu: (
        <>
          <p className="formula">min Σⱼ Σ_{'{'}x ∈ Cⱼ{'}'} ‖x − μⱼ‖²</p>
          <p className="formula">μⱼ = (1/|Cⱼ|) Σ_{'{'}x ∈ Cⱼ{'}'} x</p>
          <p>
            Mindkét lépés csökkenti (vagy változatlanul hagyja) az inerciát, ezért az algoritmus biztosan megáll, de csak egy
            helyi minimumban. A jó k megválasztására gyakori módszer a „könyök-szabály”: ahol a k növelése már alig csökkenti
            az inerciát.
          </p>
        </>
      ),
      en: (
        <>
          <p className="formula">min Σⱼ Σ_{'{'}x ∈ Cⱼ{'}'} ‖x − μⱼ‖²</p>
          <p className="formula">μⱼ = (1/|Cⱼ|) Σ_{'{'}x ∈ Cⱼ{'}'} x</p>
          <p>
            Both steps lower (or keep) the inertia, so the algorithm always stops, but only in a local minimum. A common way
            to choose k is the "elbow rule": pick the k after which adding clusters barely reduces the inertia.
          </p>
        </>
      ),
    },
  },
  {
    heading: 'usedFor',
    body: {
      hu: <p>Ügyfélszegmentálás, képtömörítés (színcsökkentés), dokumentumok témák szerinti csoportosítása, anomáliák keresése (a minden középponttól távoli pontok).</p>,
      en: <p>Customer segmentation, image compression (colour quantisation), grouping documents by topic, spotting anomalies (points far from every centre).</p>,
    },
  },
];

/** A centroid that glides towards its target position. */
function Centroid({ target, color }: { target: Vec3; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    const m = ref.current;
    if (!m) return;
    m.position.lerp(new THREE.Vector3(...target), 1 - Math.exp(-dt * 8));
    m.rotation.y += dt;
  });
  return (
    <mesh ref={ref} position={target}>
      <octahedronGeometry args={[0.28]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} />
    </mesh>
  );
}

export default function KMeansLesson() {
  const { pick, t } = useLang();
  const [k, setK] = useState(3);
  const [blobs, setBlobs] = useState(3);
  const [spread, setSpread] = useState(0.5);
  const [count, setCount] = useState(240);
  const [seed, setSeed] = useState(1);
  const [initSeed, setInitSeed] = useState(1);
  const [init, setInit] = useState<KmeansInit>('plusplus');
  const [lines, setLines] = useState(true);
  const [running, setRunning] = useState(false);

  const { points } = useMemo(() => makeBlobs3d(count, blobs, spread, seed), [count, blobs, spread, seed]);
  const fresh = useMemo(() => initKmeans(points, k, init, initSeed), [points, k, init, initSeed]);
  const [state, setState] = useState<KmeansState>(fresh);
  // restart whenever the data or setup changes
  const [lastFresh, setLastFresh] = useState(fresh);
  if (lastFresh !== fresh) {
    setLastFresh(fresh);
    setState(fresh);
  }

  useTrainingLoop(running, 2, () => {
    const next = kmeansHalfStep(points, state);
    setState(next);
    return !next.converged;
  }, () => setRunning(false));

  const colors = useMemo(() => state.assignment.map((a) => (a < 0 ? UNASSIGNED : CLUSTER_COLORS[a % CLUSTER_COLORS.length])), [state.assignment]);
  const segs = useMemo(
    () => (lines && state.assignment[0] >= 0 ? points.flatMap((p, i) => [p, state.centroids[state.assignment[i]]]) : []),
    [lines, points, state],
  );

  const phase = state.converged ? pick(txt.done) : state.phase === 'assign' ? pick(txt.assign) : pick(txt.update);

  return (
    <LessonLayout
      category="unsupervised"
      title={{ hu: 'k-means klaszterezés', en: 'k-means clustering' }}
      intro={{
        hu: 'Címkék nélkül csoportosít: k középpont addig vándorol, amíg mindegyik a saját pontfelhője közepére nem ér.',
        en: 'Grouping without labels: k centres wander until each one sits in the middle of its own cloud of points.',
      }}
      scene={
        <PointCloudScene>
          <Points points={points} colors={colors} />
          {segs.length > 0 && <Segments points={segs} color="#9aa7c7" opacity={0.18} />}
          {state.centroids.map((c, j) => (
            <Centroid key={j} target={c} color={CLUSTER_COLORS[j % CLUSTER_COLORS.length]} />
          ))}
        </PointCloudScene>
      }
      overlay={
        <>
          <Readout label={pick(txt.iteration)} value={state.iteration} />
          <Readout label={pick(txt.next)} value={phase} />
          <Readout label={pick(txt.inertia)} value={state.assignment[0] >= 0 ? inertia(points, state).toFixed(1) : '–'} />
        </>
      }
      controls={
        <>
          <ButtonRow>
            <button className="primary" onClick={() => setRunning((r) => !r)} disabled={state.converged}>
              {running ? t('pause') : t('play')}
            </button>
            <button onClick={() => setState(kmeansHalfStep(points, state))} disabled={running || state.converged}>
              {pick(txt.halfStep)}
            </button>
          </ButtonRow>
          <ButtonRow>
            <button onClick={() => { setRunning(false); setInitSeed((s) => s + 1); }}>{pick(txt.restart)}</button>
            <button onClick={() => { setRunning(false); setSeed((s) => s + 1); }}>{pick(txt.newData)}</button>
          </ButtonRow>
          <Slider label={pick(txt.k)} value={k} min={1} max={8} step={1} onChange={setK} />
          <div className="control">
            <span className="control-row">{pick(txt.init)}</span>
            <div className="chip-row">
              {(['random', 'plusplus'] as KmeansInit[]).map((i) => (
                <button key={i} className={i === init ? 'chip active' : 'chip'} onClick={() => setInit(i)}>
                  {pick(txt[i])}
                </button>
              ))}
            </div>
          </div>
          <Toggle label={pick(txt.lines)} checked={lines} onChange={setLines} />
          <h3>{pick({ hu: 'Adatok', en: 'Data' })}</h3>
          <Slider label={pick(txt.blobs)} value={blobs} min={1} max={6} step={1} onChange={setBlobs} />
          <Slider label={pick(txt.spread)} value={spread} min={0.15} max={1.5} step={0.05} onChange={setSpread} format={(v) => v.toFixed(2)} />
          <Slider label={pick(txt.points)} value={count} min={30} max={600} step={30} onChange={setCount} />
        </>
      }
      sections={sections}
    />
  );
}
