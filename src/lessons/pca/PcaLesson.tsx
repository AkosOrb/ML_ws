import { useMemo, useState } from 'react';
import * as THREE from 'three';
import { Segments } from '../../components/ClassificationScene';
import { Slider, Toggle } from '../../components/Controls';
import { LessonLayout, type LessonSection } from '../../components/LessonLayout';
import { PointCloudScene, Points } from '../../components/PointCloudScene';
import { TextSprite } from '../../components/TextSprite';
import { useLang } from '../../i18n/i18n';
import type { Vec3 } from '../../ml/data3d';
import { flatten, makeEllipsoidCloud, pca } from '../../ml/pca';

const AXIS_COLORS = ['#e8553a', '#3ccf91', '#4f9dff'];

const txt = {
  s1: { hu: 'Nyújtás 1. irányban', en: 'Stretch along direction 1' },
  s2: { hu: 'Nyújtás 2. irányban', en: 'Stretch along direction 2' },
  s3: { hu: 'Nyújtás 3. irányban', en: 'Stretch along direction 3' },
  tilt: { hu: 'Dőlésszög', en: 'Tilt' },
  points: { hu: 'Pontok száma', en: 'Number of points' },
  flatten: { hu: 'Vetítés 3D → 2D', en: 'Projection 3D → 2D' },
  flattenHint: {
    hu: 'Húzd jobbra: a pontok a két legfontosabb főtengely síkjára simulnak.',
    en: 'Drag right: the points settle onto the plane of the two most important axes.',
  },
  axes: { hu: 'Főtengelyek mutatása', en: 'Show principal axes' },
  plane: { hu: 'Vetítési sík mutatása', en: 'Show projection plane' },
  explained: { hu: 'Megmagyarázott variancia', en: 'Explained variance' },
  kept: { hu: 'Két tengellyel megtartva', en: 'Kept with two axes' },
};

const sections: LessonSection[] = [
  {
    heading: 'whatIsIt',
    body: {
      hu: (
        <p>
          A főkomponens-analízis (PCA) azt keresi, <b>melyik irányban változik a legjobban</b> az adat. Ha egy pontfelhő
          olyan, mint egy lapos szivar, akkor a hossza mentén sok, a vastagsága mentén alig van információ. A PCA megtalálja
          ezeket az irányokat, és így <b>kevesebb számmal</b> is jól leírhatjuk az adatokat: 3D helyett 2D-ben, vagy 1000
          jellemző helyett 50-ben.
        </p>
      ),
      en: (
        <p>
          Principal component analysis (PCA) looks for <b>the directions in which the data varies most</b>. If a cloud of
          points looks like a flat cigar, there is a lot of information along its length and hardly any along its thickness.
          PCA finds these directions, so we can describe the data with <b>fewer numbers</b>: 2D instead of 3D, or 50
          features instead of 1000.
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
            A színes nyilak a <b>főtengelyek</b>: a piros a legnagyobb szórás iránya, a zöld a következő (merőleges rá), a kék
            a maradék. A nyilak hossza a szórással arányos.
          </p>
          <p>
            Ha a vetítés csúszkát jobbra húzod, a pontok a kék tengely mentén „összenyomódnak” a piros–zöld síkra. Amennyi
            információ elveszik, az a kék tengely varianciája. Ha az kicsi, a 2D-s kép szinte mindent megőriz.
          </p>
        </>
      ),
      en: (
        <>
          <p>
            The coloured arrows are the <b>principal axes</b>: red is the direction of greatest spread, green the next one
            (perpendicular to it), blue the rest. Arrow lengths are proportional to the spread.
          </p>
          <p>
            Drag the projection slider right and the points get squashed along the blue axis onto the red–green plane. The
            information lost is the blue axis's variance. If it is small, the 2D picture keeps almost everything.
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
          <li>Vetítsd le a felhőt 2D-be: a pontok színe (az 1. főtengely menti helyzetük) ugyanabban a sorrendben marad.</li>
          <li>Növeld a 3. irányú nyújtást: a kék tengely megnő, és a 2D vetítés már sokat veszít.</li>
          <li>Állíts be három egyforma nyújtást: gömb alakú felhőnél nincs kitüntetett irány, a tengelyek „ide-oda ugrálnak”.</li>
          <li>Változtasd a dőlést: a PCA a felhő saját irányait találja meg, nem a koordinátatengelyeket.</li>
        </ul>
      ),
      en: (
        <ul>
          <li>Project the cloud to 2D: the point colours (their position along axis 1) stay in the same order.</li>
          <li>Increase the stretch in direction 3: the blue axis grows and the 2D projection loses a lot.</li>
          <li>Make all three stretches equal: a round cloud has no preferred direction, and the axes "jump around".</li>
          <li>Change the tilt: PCA finds the cloud's own directions, not the coordinate axes.</li>
        </ul>
      ),
    },
  },
  {
    heading: 'math',
    body: {
      hu: (
        <>
          <p className="formula">C = (1/n) Σ (xᵢ − μ)(xᵢ − μ)ᵀ,  C·vₖ = λₖ·vₖ</p>
          <p className="formula">megmagyarázott arány = λₖ / (λ₁ + λ₂ + λ₃)</p>
          <p>
            A főtengelyek a kovarianciamátrix sajátvektorai, a hozzájuk tartozó sajátértékek a varianciák. Itt a 3×3-as
            mátrixot a Jacobi-módszer bontja fel; nagy adatokon szinguláris érték-felbontást (SVD) szokás használni.
          </p>
        </>
      ),
      en: (
        <>
          <p className="formula">C = (1/n) Σ (xᵢ − μ)(xᵢ − μ)ᵀ,  C·vₖ = λₖ·vₖ</p>
          <p className="formula">explained ratio = λₖ / (λ₁ + λ₂ + λ₃)</p>
          <p>
            The principal axes are the eigenvectors of the covariance matrix, and their eigenvalues are the variances. Here the
            3×3 matrix is decomposed with the Jacobi method; on large data, singular value decomposition (SVD) is the norm.
          </p>
        </>
      ),
    },
  },
  {
    heading: 'usedFor',
    body: {
      hu: <p>Sok dimenziós adatok megjelenítése 2D-ben, zajszűrés, tömörítés, arcfelismerés („sajátarcok”), és előfeldolgozás más algoritmusok előtt, hogy gyorsabbak legyenek.</p>,
      en: <p>Visualising high-dimensional data in 2D, denoising, compression, face recognition ("eigenfaces"), and preprocessing before other algorithms to make them faster.</p>,
    },
  },
];

function Arrow({ from, dir, length, color, label }: { from: Vec3; dir: Vec3; length: number; color: string; label: string }) {
  const end: Vec3 = [from[0] + dir[0] * length, from[1] + dir[1] * length, from[2] + dir[2] * length];
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...dir)), [dir]);
  return (
    <group>
      <Segments points={[from, end]} color={color} opacity={1} />
      <mesh position={end} quaternion={quat}>
        <coneGeometry args={[0.1, 0.3, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
      </mesh>
      <TextSprite text={label} position={[end[0] + dir[0] * 0.4, end[1] + dir[1] * 0.4 + 0.15, end[2] + dir[2] * 0.4]} color={color} size={0.32} />
    </group>
  );
}

function ProjectionPlane({ mean, a, b, size }: { mean: Vec3; a: Vec3; b: Vec3; size: number }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const c = (s: number, t: number) => [mean[0] + a[0] * s + b[0] * t, mean[1] + a[1] * s + b[1] * t, mean[2] + a[2] * s + b[2] * t];
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...c(-size, -size), ...c(size, -size), ...c(size, size), ...c(-size, size)]), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    return g;
  }, [mean, a, b, size]);
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color="#f3f1ec" transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

const ramp = [new THREE.Color('#4f9dff'), new THREE.Color('#f3f1ec'), new THREE.Color('#e8553a')];
function rampColor(t: number): string {
  const c = t < 0.5 ? ramp[0].clone().lerp(ramp[1], t * 2) : ramp[1].clone().lerp(ramp[2], (t - 0.5) * 2);
  return '#' + c.getHexString();
}

export default function PcaLesson() {
  const { pick } = useLang();
  const [s1, setS1] = useState(1.8);
  const [s2, setS2] = useState(0.9);
  const [s3, setS3] = useState(0.25);
  const [tilt, setTilt] = useState(0.7);
  const [count, setCount] = useState(400);
  const [t, setT] = useState(0);
  const [showAxes, setShowAxes] = useState(true);
  const [showPlane, setShowPlane] = useState(true);

  const raw = useMemo(() => makeEllipsoidCloud(count, [s1, s2, s3], tilt, 3), [count, s1, s2, s3, tilt]);
  const result = useMemo(() => pca(raw), [raw]);
  const shown = useMemo(() => raw.map((p) => flatten(p, result, t)), [raw, result, t]);
  const colors = useMemo(() => {
    const ax = result.axes[0];
    const proj = raw.map((p) => (p[0] - result.mean[0]) * ax[0] + (p[1] - result.mean[1]) * ax[1] + (p[2] - result.mean[2]) * ax[2]);
    const lim = 2.2 * Math.sqrt(result.variances[0]) || 1;
    return proj.map((v) => rampColor(Math.min(1, Math.max(0, v / lim / 2 + 0.5))));
  }, [raw, result]);

  const total = result.variances.reduce((a, b) => a + b, 0) || 1;
  const ratios = result.variances.map((v) => v / total);

  return (
    <LessonLayout
      category="unsupervised"
      title={{ hu: 'Főkomponens-analízis (PCA)', en: 'Principal component analysis (PCA)' }}
      intro={{
        hu: 'Melyik irányban van a legtöbb információ? A PCA megtalálja, és kevesebb dimenzióba vetíti az adatot.',
        en: 'Which direction holds the most information? PCA finds it and projects the data into fewer dimensions.',
      }}
      scene={
        <PointCloudScene camera={[6, 4, 7]}>
          <Points points={shown} colors={colors} radius={0.06} />
          {showPlane && <ProjectionPlane mean={result.mean} a={result.axes[0]} b={result.axes[1]} size={3.2} />}
          {showAxes &&
            result.axes.map((ax, i) => (
              <Arrow key={i} from={result.mean} dir={ax} length={Math.max(0.3, 2 * Math.sqrt(result.variances[i]))} color={AXIS_COLORS[i]} label={`PC${i + 1}`} />
            ))}
        </PointCloudScene>
      }
      overlay={
        <div className="readout bars">
          <span>{pick(txt.explained)}</span>
          {ratios.map((r, i) => (
            <div key={i} className="bar-row">
              <b style={{ color: AXIS_COLORS[i] }}>PC{i + 1}</b>
              <div className="bar">
                <div style={{ width: `${r * 100}%`, background: AXIS_COLORS[i] }} />
              </div>
              <em>{Math.round(r * 100)}%</em>
            </div>
          ))}
          <span>
            {pick(txt.kept)}: <strong>{Math.round((ratios[0] + ratios[1]) * 100)}%</strong>
          </span>
        </div>
      }
      controls={
        <>
          <Slider label={pick(txt.flatten)} hint={pick(txt.flattenHint)} value={t} min={0} max={1} step={0.01} onChange={setT} format={(v) => `${Math.round(v * 100)}%`} />
          <Toggle label={pick(txt.axes)} checked={showAxes} onChange={setShowAxes} />
          <Toggle label={pick(txt.plane)} checked={showPlane} onChange={setShowPlane} />
          <h3>{pick({ hu: 'A pontfelhő alakja', en: 'Shape of the cloud' })}</h3>
          <Slider label={pick(txt.s1)} value={s1} min={0.1} max={2.5} step={0.05} onChange={setS1} format={(v) => v.toFixed(2)} />
          <Slider label={pick(txt.s2)} value={s2} min={0.1} max={2.5} step={0.05} onChange={setS2} format={(v) => v.toFixed(2)} />
          <Slider label={pick(txt.s3)} value={s3} min={0.1} max={2.5} step={0.05} onChange={setS3} format={(v) => v.toFixed(2)} />
          <Slider label={pick(txt.tilt)} value={tilt} min={0} max={3.14} step={0.01} onChange={setTilt} format={(v) => `${Math.round((v * 180) / Math.PI)}°`} />
          <Slider label={pick(txt.points)} value={count} min={50} max={1000} step={50} onChange={setCount} />
        </>
      }
      sections={sections}
    />
  );
}
