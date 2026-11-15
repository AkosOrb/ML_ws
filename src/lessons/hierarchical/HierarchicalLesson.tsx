import { useMemo, useState } from 'react';
import { Segments } from '../../components/ClassificationScene';
import { ButtonRow, Slider } from '../../components/Controls';
import { LessonLayout, type LessonSection } from '../../components/LessonLayout';
import { CLUSTER_COLORS, PointCloudScene, Points } from '../../components/PointCloudScene';
import { Readout } from '../../components/Readout';
import { useLang } from '../../i18n/i18n';
import { makeBlobs3d, type Vec3 } from '../../ml/data3d';
import { agglomerate, labelsAfter, type Linkage } from '../../ml/hierarchical';
import { useTrainingLoop } from '../../useTrainingLoop';
import { Dendrogram } from './Dendrogram';

const txt = {
  clusters: { hu: 'Csoportok száma (vágás)', en: 'Number of clusters (cut)' },
  linkage: { hu: 'Csoporttávolság (linkage)', en: 'Cluster distance (linkage)' },
  single: { hu: 'Legközelebbi', en: 'Single' },
  complete: { hu: 'Legtávolabbi', en: 'Complete' },
  average: { hu: 'Átlagos', en: 'Average' },
  linkHint: {
    hu: 'Legközelebbi: a két legközelebbi pont számít (hosszú „láncok”). Legtávolabbi: a két legtávolabbi (kompakt csoportok).',
    en: 'Single: the two closest points count (long "chains"). Complete: the two farthest (compact groups).',
  },
  blobs: { hu: 'Valódi csoportok az adatban', en: 'True groups in the data' },
  spread: { hu: 'Szórás', en: 'Spread' },
  points: { hu: 'Pontok száma', en: 'Number of points' },
  playMerge: { hu: '▶ Összevonások lejátszása', en: '▶ Play merges' },
  restart: { hu: '↺ Minden pont külön', en: '↺ Every point separate' },
  newData: { hu: '🎲 Új adatok', en: '🎲 New data' },
  dendro: {
    hu: 'Dendrogram: minden vízszintes vonal egy összevonás, a magassága a két csoport távolsága. A piros szaggatott vonal a vágás.',
    en: 'Dendrogram: every horizontal bar is a merge, its height the distance between the two groups. The red dashed line is the cut.',
  },
  lastMerge: { hu: 'Utolsó összevonás távolsága', en: 'Last merge distance' },
  count: { hu: 'Csoportok', en: 'Clusters' },
};

const sections: LessonSection[] = [
  {
    heading: 'whatIsIt',
    body: {
      hu: (
        <p>
          A hierarchikus klaszterezés nem egyetlen csoportosítást ad, hanem egy egész <b>családfát</b>. Kezdetben minden
          pont külön csoport, aztán mindig a két legközelebbi csoport egyesül, amíg végül egyetlen nagy csoport marad. A
          családfát (dendrogramot) bármelyik magasságban „elvághatjuk”, és annyi csoportot kapunk, ahány ágat a vágás metsz.
        </p>
      ),
      en: (
        <p>
          Hierarchical clustering does not give one grouping but a whole <b>family tree</b>. At first every point is its own
          group; then the two closest groups keep merging until a single big group remains. The tree (dendrogram) can be
          "cut" at any height, giving as many groups as branches the cut crosses.
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
            A kulcskérdés, hogy mit jelent két <b>csoport</b> távolsága. A legközelebbi módszer a két legközelebbi pontjukat
            nézi, ezért hajlamos hosszú láncokat fűzni; a legtávolabbi a két legtávolabbit, ezért kerek, kompakt csoportokat
            ad; az átlagos a kettő közötti kompromisszum.
          </p>
          <p>
            A dendrogramon jól látszik a természetes csoportszám: ahol az ágak között <b>nagy függőleges ugrás</b> van, ott
            érdemes vágni, mert onnan már egymástól távoli csoportokat kellene összevonni.
          </p>
        </>
      ),
      en: (
        <>
          <p>
            The key question is what the distance between two <b>groups</b> means. Single linkage uses their two closest
            points, so it tends to string long chains; complete linkage uses the two farthest, giving round, compact groups;
            average linkage is a compromise.
          </p>
          <p>
            The dendrogram reveals the natural number of groups: cut where there is a <b>big vertical jump</b> between
            branches, because above it groups far apart would have to merge.
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
          <li>Nyomd meg az „Összevonások lejátszása” gombot, és nézd, ahogy a sok kis csoport egyre nagyobbakká olvad.</li>
          <li>Keresd meg a dendrogramon a legnagyobb ugrást, és állítsd oda a csoportszámot.</li>
          <li>Hasonlítsd össze a legközelebbi és a legtávolabbi módszert nagy szórásnál.</li>
        </ul>
      ),
      en: (
        <ul>
          <li>Press "Play merges" and watch many small groups melt into bigger ones.</li>
          <li>Find the biggest jump in the dendrogram and set the number of clusters there.</li>
          <li>Compare single and complete linkage with a large spread.</li>
        </ul>
      ),
    },
  },
  {
    heading: 'math',
    body: {
      hu: (
        <>
          <p className="formula">d_legközelebbi(A, B) = min ‖a − b‖,  d_legtávolabbi(A, B) = max ‖a − b‖</p>
          <p className="formula">d_átlagos(A, B) = (1 / |A||B|) Σ Σ ‖a − b‖</p>
          <p>
            n pontból n − 1 összevonás lesz. Az egyszerű megvalósítás O(n³) idejű, ezért itt legfeljebb 150 pontot
            használunk; nagy adatokon okosabb adatszerkezetek kellenek.
          </p>
        </>
      ),
      en: (
        <>
          <p className="formula">d_single(A, B) = min ‖a − b‖,  d_complete(A, B) = max ‖a − b‖</p>
          <p className="formula">d_average(A, B) = (1 / |A||B|) Σ Σ ‖a − b‖</p>
          <p>
            n points give n − 1 merges. The simple implementation takes O(n³) time, so we use at most 150 points here; large
            datasets need smarter data structures.
          </p>
        </>
      ),
    },
  },
  {
    heading: 'usedFor',
    body: {
      hu: <p>Biológiai törzsfák, génexpressziós adatok, dokumentumok és termékek kategóriarendszere. Akkor hasznos, ha nem tudjuk előre, hány csoport van, vagy maga a hierarchia is érdekes.</p>,
      en: <p>Phylogenetic trees, gene-expression data, category systems for documents and products. Useful when the number of groups is unknown, or the hierarchy itself is interesting.</p>,
    },
  },
];

export default function HierarchicalLesson() {
  const { pick, t } = useLang();
  const [blobs, setBlobs] = useState(4);
  const [spread, setSpread] = useState(0.45);
  const [count, setCount] = useState(90);
  const [seed, setSeed] = useState(1);
  const [linkage, setLinkage] = useState<Linkage>('average');
  const [clusters, setClusters] = useState(4);
  const [playing, setPlaying] = useState(false);
  // the first press replays the whole history from "every point separate"
  const [played, setPlayed] = useState(false);

  const { points } = useMemo(() => makeBlobs3d(count, blobs, spread, seed), [count, blobs, spread, seed]);
  const merges = useMemo(() => agglomerate(points, linkage), [points, linkage]);
  const n = points.length;
  const k = Math.min(Math.max(clusters, 1), n);
  const steps = n - k;
  const labels = useMemo(() => labelsAfter(n, merges, steps), [n, merges, steps]);
  const colors = useMemo(() => labels.map((l) => CLUSTER_COLORS[l % CLUSTER_COLORS.length]), [labels]);

  // star lines from each point to its cluster centre
  const segs = useMemo(() => {
    const sums = new Map<number, Vec3 & { 3?: number }>();
    const counts = new Map<number, number>();
    labels.forEach((l, i) => {
      const s = sums.get(l) ?? [0, 0, 0];
      sums.set(l, [s[0] + points[i][0], s[1] + points[i][1], s[2] + points[i][2]]);
      counts.set(l, (counts.get(l) ?? 0) + 1);
    });
    return labels.flatMap((l, i) => {
      const c = counts.get(l)!;
      if (c < 2) return [];
      const s = sums.get(l)!;
      return [points[i], [s[0] / c, s[1] / c, s[2] / c] as Vec3];
    });
  }, [labels, points]);

  useTrainingLoop(playing, Math.max(4, n / 6), (stepsNow) => {
    const next = Math.max(1, k - stepsNow);
    setClusters(next);
    return next > 1;
  }, () => setPlaying(false));

  return (
    <LessonLayout
      category="unsupervised"
      title={{ hu: 'Hierarchikus klaszterezés', en: 'Hierarchical clustering' }}
      intro={{
        hu: 'Csoportok egyre nagyobb csoportokba olvadnak, és az egészből egy családfa (dendrogram) rajzolódik ki.',
        en: 'Groups melt into ever larger groups, drawing a family tree (dendrogram) along the way.',
      }}
      scene={
        <PointCloudScene>
          <Points points={points} colors={colors} radius={0.09} />
          {segs.length > 0 && <Segments points={segs} color="#9aa7c7" opacity={0.25} />}
        </PointCloudScene>
      }
      overlay={
        <>
          <Readout label={pick(txt.count)} value={k} />
          <Readout label={pick(txt.lastMerge)} value={steps > 0 ? merges[steps - 1].height.toFixed(2) : '–'} />
        </>
      }
      controls={
        <>
          <ButtonRow>
            <button
              className="primary"
              onClick={() => {
                if (!playing && (k === 1 || !played)) setClusters(n);
                setPlayed(true);
                setPlaying((p) => !p);
              }}
            >
              {playing ? t('pause') : pick(txt.playMerge)}
            </button>
          </ButtonRow>
          <ButtonRow>
            <button onClick={() => { setPlaying(false); setClusters(n); }}>{pick(txt.restart)}</button>
            <button onClick={() => { setPlaying(false); setSeed((s) => s + 1); }}>{pick(txt.newData)}</button>
          </ButtonRow>
          <Dendrogram n={n} merges={merges} steps={steps} colors={colors} />
          <small className="panel-hint">{pick(txt.dendro)}</small>
          <Slider label={pick(txt.clusters)} value={k} min={1} max={n} step={1} onChange={setClusters} />
          <div className="control">
            <span className="control-row">{pick(txt.linkage)}</span>
            <div className="chip-row">
              {(['single', 'complete', 'average'] as Linkage[]).map((l) => (
                <button key={l} className={l === linkage ? 'chip active' : 'chip'} onClick={() => setLinkage(l)}>
                  {pick(txt[l])}
                </button>
              ))}
            </div>
            <small>{pick(txt.linkHint)}</small>
          </div>
          <h3>{pick({ hu: 'Adatok', en: 'Data' })}</h3>
          <Slider label={pick(txt.blobs)} value={blobs} min={1} max={6} step={1} onChange={setBlobs} />
          <Slider label={pick(txt.spread)} value={spread} min={0.15} max={1.5} step={0.05} onChange={setSpread} format={(v) => v.toFixed(2)} />
          <Slider label={pick(txt.points)} value={count} min={20} max={150} step={10} onChange={setCount} />
        </>
      }
      sections={sections}
    />
  );
}
