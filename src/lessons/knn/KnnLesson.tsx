import { useMemo, useState } from 'react';
import { ClassificationScene, probaColor, Rings, Segments, SURFACE_H, toScene } from '../../components/ClassificationScene';
import { Slider, Toggle } from '../../components/Controls';
import { useDataset } from '../../components/DatasetControls';
import { LessonLayout, type LessonSection } from '../../components/LessonLayout';
import { pct, Readout } from '../../components/Readout';
import { useLang } from '../../i18n/i18n';
import { accuracy } from '../../ml/datasets';
import { knnProba, nearest, type Metric } from '../../ml/knn';

const txt = {
  k: { hu: 'k (szomszédok száma)', en: 'k (number of neighbours)' },
  kHint: {
    hu: 'Kis k: szeszélyes, minden pontra figyel. Nagy k: sima, de elmossa a részleteket.',
    en: 'Small k: jumpy, follows every point. Large k: smooth, but blurs details.',
  },
  manhattan: { hu: 'Manhattan-távolság (csak vízszintes/függőleges lépések)', en: 'Manhattan distance (only horizontal/vertical moves)' },
  probe: { hu: 'Kattints a padlóra egy új pont lerakásához!', en: 'Click the floor to drop a new point!' },
  acc: { hu: 'Pontosság (tanító adaton)', en: 'Accuracy (training data)' },
  probeP: { hu: 'Az új pont: P(piros)', en: 'New point: P(red)' },
  height: { hu: 'P(piros)', en: 'P(red)' },
};

const sections: LessonSection[] = [
  {
    heading: 'whatIsIt',
    body: {
      hu: (
        <p>
          A k-legközelebbi szomszéd a legegyszerűbb tanuló algoritmus: <b>nem tanul semmit előre</b>, csak megjegyzi az
          összes példát. Ha jön egy új pont, megnézi a hozzá legközelebbi <b>k</b> ismert pontot, és szavaztat: amelyik
          szín többségben van, az lesz a válasz.
        </p>
      ),
      en: (
        <p>
          k-nearest neighbours is the simplest learning algorithm: it <b>learns nothing in advance</b>, it just remembers
          every example. When a new point arrives, it looks at the <b>k</b> closest known points and lets them vote: the
          majority colour wins.
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
            A felület magassága minden helyen azt mutatja, hogy a k szomszéd hányad része piros. Kattints a padlóra: a sárga
            vonalak a kiválasztott szomszédokhoz vezetnek, a gömb magassága pedig a szavazás eredménye.
          </p>
          <p>
            Ez a <b>túlillesztés</b> legszemléletesebb példája: k = 1-nél a tanító adaton mindig 100% a pontosság, mert
            minden pont a saját legközelebbi szomszédja, de a határ cikcakkos, és új adaton rosszul teljesít.
          </p>
        </>
      ),
      en: (
        <>
          <p>
            At every location, the surface height shows what share of the k neighbours are red. Click the floor: the yellow
            lines lead to the chosen neighbours, and the sphere's height is the result of the vote.
          </p>
          <p>
            This is the clearest example of <b>overfitting</b>: with k = 1 training accuracy is always 100%, because every
            point is its own nearest neighbour, but the boundary zigzags and performs poorly on new data.
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
          <li>Állítsd k-t 1-re, és növeld a zajt: a felület tüskés szigetekre esik szét.</li>
          <li>Növeld k-t 15–25-re: a határ kisimul, a pontosság kicsit csökken, de a modell általánosabb.</li>
          <li>Rakj le pontot a két osztály határára, és figyeld, hogyan változik a szavazás k-val.</li>
          <li>Kapcsold be a Manhattan-távolságot: a határ szögletesebb lesz.</li>
        </ul>
      ),
      en: (
        <ul>
          <li>Set k to 1 and raise the noise: the surface breaks into spiky islands.</li>
          <li>Raise k to 15–25: the boundary smooths out, accuracy drops a little, but the model generalises better.</li>
          <li>Drop a point on the border between the classes and watch the vote change with k.</li>
          <li>Turn on Manhattan distance: the boundary becomes more angular.</li>
        </ul>
      ),
    },
  },
  {
    heading: 'math',
    body: {
      hu: (
        <>
          <p className="formula">P(piros | x) = (1/k) · Σ_{'{'}i ∈ N_k(x){'}'} yᵢ</p>
          <p className="formula">d_euklideszi = √((a₁−b₁)² + (a₂−b₂)²),  d_Manhattan = |a₁−b₁| + |a₂−b₂|</p>
          <p>
            Nincs tanítási fázis, viszont minden jóslatnál végig kell nézni az összes pontot, ezért nagy adathalmazon lassú.
            A jellemzőket érdemes azonos skálára hozni, különben a nagy számokkal mért jellemző dominál.
          </p>
        </>
      ),
      en: (
        <>
          <p className="formula">P(red | x) = (1/k) · Σ_{'{'}i ∈ N_k(x){'}'} yᵢ</p>
          <p className="formula">d_Euclidean = √((a₁−b₁)² + (a₂−b₂)²),  d_Manhattan = |a₁−b₁| + |a₂−b₂|</p>
          <p>
            There is no training phase, but every prediction scans all points, so it is slow on large datasets. Features
            should be on the same scale, otherwise the one measured in large numbers dominates.
          </p>
        </>
      ),
    },
  },
  {
    heading: 'usedFor',
    body: {
      hu: <p>Ajánlórendszerek („akik ezt vették, ezt is vették”), hasonló képek vagy dokumentumok keresése, hiányzó adatok pótlása.</p>,
      en: <p>Recommender systems ("people who bought this also bought…"), finding similar images or documents, filling in missing data.</p>,
    },
  },
];

export default function KnnLesson() {
  const { pick } = useLang();
  const { data, controls: dataControls } = useDataset({ kind: 'moons', noise: 0.3 });
  const [k, setK] = useState(5);
  const [manhattan, setManhattan] = useState(false);
  const [probe, setProbe] = useState<{ x1: number; x2: number } | null>({ x1: 0.3, x2: 0.2 });
  const metric: Metric = manhattan ? 'manhattan' : 'euclidean';

  const proba = useMemo(() => (a: number, b: number) => knnProba(data, a, b, k, metric), [data, k, metric]);
  const acc = useMemo(() => accuracy(data, proba), [data, proba]);
  const neighbours = useMemo(() => (probe ? nearest(data, probe.x1, probe.x2, k, metric) : []), [data, probe, k, metric]);
  const probeP = probe ? proba(probe.x1, probe.x2) : 0;

  const scene = (
    <ClassificationScene data={data} proba={proba} heightLabel={pick(txt.height)} surfaceOpacity={0.6} onFloorClick={(x1, x2) => setProbe({ x1, x2 })}>
      {probe && (
        <>
          <Rings data={data} indices={neighbours} />
          <Segments
            points={neighbours.flatMap((i) => [toScene(probe.x1, probe.x2, probeP * SURFACE_H), toScene(data[i].x1, data[i].x2, data[i].label * SURFACE_H)])}
          />
          <Segments points={[toScene(probe.x1, probe.x2, 0), toScene(probe.x1, probe.x2, probeP * SURFACE_H)]} color="#ffffff" opacity={0.5} />
          <mesh position={toScene(probe.x1, probe.x2, probeP * SURFACE_H)}>
            <sphereGeometry args={[0.16, 24, 16]} />
            <meshStandardMaterial color={probaColor(probeP)} emissive="#ffd166" emissiveIntensity={0.35} />
          </mesh>
        </>
      )}
    </ClassificationScene>
  );

  return (
    <LessonLayout
      category="supervised"
      title={{ hu: 'k-legközelebbi szomszéd', en: 'k-nearest neighbours' }}
      intro={{
        hu: 'Mondd meg, kik a szomszédaid, és megmondom, ki vagy: a legközelebbi k pont szavaz az új pont színéről.',
        en: 'Tell me who your neighbours are and I will tell you who you are: the k nearest points vote on the new point.',
      }}
      scene={scene}
      overlay={
        <>
          <Readout label={pick(txt.acc)} value={pct(acc)} />
          {probe && <Readout label={pick(txt.probeP)} value={pct(probeP)} />}
        </>
      }
      controls={
        <>
          <small className="panel-hint">{pick(txt.probe)}</small>
          <Slider label={pick(txt.k)} hint={pick(txt.kHint)} value={k} min={1} max={31} step={1} onChange={setK} />
          <Toggle label={pick(txt.manhattan)} checked={manhattan} onChange={setManhattan} />
          <h3>{pick({ hu: 'Adatok', en: 'Data' })}</h3>
          {dataControls}
        </>
      }
      sections={sections}
    />
  );
}
