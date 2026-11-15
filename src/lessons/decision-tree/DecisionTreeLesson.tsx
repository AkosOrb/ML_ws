import { useMemo, useState } from 'react';
import { ClassificationScene, Segments } from '../../components/ClassificationScene';
import { Slider } from '../../components/Controls';
import { useDataset } from '../../components/DatasetControls';
import { LessonLayout, type LessonSection } from '../../components/LessonLayout';
import { pct, Readout } from '../../components/Readout';
import { useLang } from '../../i18n/i18n';
import { accuracy, EXTENT } from '../../ml/datasets';
import { buildForest, buildTree, countLeaves, forestProba, treeProba, type TreeNode } from '../../ml/tree';

const txt = {
  mode: { hu: 'Modell', en: 'Model' },
  tree: { hu: 'Egy döntési fa', en: 'Single decision tree' },
  forest: { hu: 'Véletlen erdő', en: 'Random forest' },
  depth: { hu: 'Maximális mélység', en: 'Maximum depth' },
  depthHint: { hu: 'Hány kérdést tehet fel egymás után a fa.', en: 'How many questions the tree may ask in a row.' },
  minSplit: { hu: 'Min. pont vágáshoz', en: 'Min. points to split' },
  minSplitHint: { hu: 'Ennél kevesebb pontot tartalmazó csoportot már nem vág tovább.', en: 'Groups with fewer points are not split further.' },
  trees: { hu: 'Fák száma', en: 'Number of trees' },
  acc: { hu: 'Pontosság', en: 'Accuracy' },
  leaves: { hu: 'Levelek (dobozok)', en: 'Leaves (boxes)' },
  height: { hu: 'P(piros)', en: 'P(red)' },
};

/** Floor lines for every split, clipped to the region the split applies to. */
function splitLines(node: TreeNode, box = { x1: [-EXTENT, EXTENT], x2: [-EXTENT, EXTENT] }): [number, number, number][] {
  if (node.leaf) return [];
  const t = node.threshold;
  const y = 0.01;
  const line: [number, number, number][] =
    node.feature === 'x1'
      ? [[t, y, box.x2[0]], [t, y, box.x2[1]]]
      : [[box.x1[0], y, t], [box.x1[1], y, t]];
  const leftBox = { ...box, [node.feature]: [box[node.feature][0], t] };
  const rightBox = { ...box, [node.feature]: [t, box[node.feature][1]] };
  return [...line, ...splitLines(node.left, leftBox), ...splitLines(node.right, rightBox)];
}

const sections: LessonSection[] = [
  {
    heading: 'whatIsIt',
    body: {
      hu: (
        <p>
          A döntési fa úgy dönt, mint egy „Gondoltam valamire” játékos: <b>egymás után igen/nem kérdéseket tesz fel</b>,
          például „x₁ nagyobb mint 0,7?”. Minden kérdés kettévágja a teret, így a végén téglalap alakú dobozok jönnek létre,
          mindegyikben egy válasszal. A <b>véletlen erdő</b> sok kicsit eltérő fát növeszt, és szavaztatja őket.
        </p>
      ),
      en: (
        <p>
          A decision tree decides like a player of "twenty questions": it <b>asks yes/no questions one after another</b>,
          such as "is x₁ greater than 0.7?". Each question cuts the space in two, so in the end you get rectangular boxes,
          each with one answer. A <b>random forest</b> grows many slightly different trees and lets them vote.
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
            Minden lépésben a fa azt a vágást választja, amely után a két csoport a lehető legtisztább (legkevésbé kevert
            színű). A sárga vonalak a padlón a vágások, a felület lépcsői a dobozok.
          </p>
          <p>
            Egy mély fa bármit meg tud tanulni, de hajlamos a <b>túlillesztésre</b>. Az erdő minden fája az adatok egy
            véletlen mintáján és véletlen kérdésekkel tanul, így a hibáik kiátlagolódnak, és a felület simább, megbízhatóbb lesz.
          </p>
        </>
      ),
      en: (
        <>
          <p>
            At every step the tree picks the cut that leaves the two groups as pure (least mixed in colour) as possible. The
            yellow lines on the floor are the cuts, and the steps of the surface are the boxes.
          </p>
          <p>
            A deep tree can learn anything but tends to <b>overfit</b>. Each tree in a forest learns from a random sample of
            the data with random questions, so their errors average out and the surface becomes smoother and more reliable.
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
          <li>Állítsd a mélységet 1-re: egyetlen kérdés, egyetlen vágás. Aztán növeld lépésenként.</li>
          <li>Az XOR adaton figyeld meg, hogy kell legalább 2 szint, hogy a fa megoldja.</li>
          <li>Nagy zajnál és nagy mélységnél a fa apró dobozokat gyárt a zajos pontok köré: ez a túlillesztés.</li>
          <li>Válts véletlen erdőre, és növeld a fák számát: a lépcsők kisimulnak.</li>
        </ul>
      ),
      en: (
        <ul>
          <li>Set the depth to 1: one question, one cut. Then increase it step by step.</li>
          <li>On XOR, notice that the tree needs at least 2 levels to solve it.</li>
          <li>With high noise and depth, the tree builds tiny boxes around noisy points: that is overfitting.</li>
          <li>Switch to random forest and add trees: the steps smooth out.</li>
        </ul>
      ),
    },
  },
  {
    heading: 'math',
    body: {
      hu: (
        <>
          <p className="formula">Gini(S) = 2·p·(1 − p),  p = a pirosak aránya S-ben</p>
          <p className="formula">legjobb vágás = argmin (|S_bal|/|S|)·Gini(S_bal) + (|S_jobb|/|S|)·Gini(S_jobb)</p>
          <p>
            Az erdő minden fája bootstrap mintán tanul (visszatevéses mintavétel), és minden vágásnál csak egy véletlenül
            választott jellemzőt vizsgál. A jóslat a fák valószínűségeinek átlaga.
          </p>
        </>
      ),
      en: (
        <>
          <p className="formula">Gini(S) = 2·p·(1 − p),  p = share of red in S</p>
          <p className="formula">best cut = argmin (|S_left|/|S|)·Gini(S_left) + (|S_right|/|S|)·Gini(S_right)</p>
          <p>
            Each tree in the forest trains on a bootstrap sample (sampling with replacement) and looks at only one randomly
            chosen feature per cut. The prediction is the average of the trees' probabilities.
          </p>
        </>
      ),
    },
  },
  {
    heading: 'usedFor',
    body: {
      hu: <p>Táblázatos adatokon az egyik legerősebb módszer: csalásfelderítés, ügyfélelvándorlás előrejelzése, orvosi döntéstámogatás. Egy fa szabályai ráadásul emberi nyelven is elmondhatók.</p>,
      en: <p>One of the strongest methods on tabular data: fraud detection, churn prediction, medical decision support. A single tree's rules can even be read out in plain language.</p>,
    },
  },
];

export default function DecisionTreeLesson() {
  const { pick } = useLang();
  const { data, controls: dataControls } = useDataset({ kind: 'circles', noise: 0.2 });
  const [forestMode, setForestMode] = useState(false);
  const [depth, setDepth] = useState(3);
  const [minSplit, setMinSplit] = useState(2);
  const [trees, setTrees] = useState(20);

  const tree = useMemo(() => buildTree(data, { maxDepth: depth, minSamplesSplit: minSplit }), [data, depth, minSplit]);
  const forest = useMemo(
    () => (forestMode ? buildForest(data, trees, { maxDepth: depth, minSamplesSplit: minSplit }, 11) : []),
    [forestMode, data, trees, depth, minSplit],
  );
  const proba = useMemo(
    () => (forestMode ? (a: number, b: number) => forestProba(forest, a, b) : (a: number, b: number) => treeProba(tree, a, b)),
    [forestMode, forest, tree],
  );
  const acc = useMemo(() => accuracy(data, proba), [data, proba]);
  const lines = useMemo(() => (forestMode ? [] : splitLines(tree)), [forestMode, tree]);

  return (
    <LessonLayout
      category="supervised"
      title={{ hu: 'Döntési fa és véletlen erdő', en: 'Decision tree & random forest' }}
      intro={{
        hu: 'Egymás utáni igen/nem kérdések dobozokra vágják a teret, és sok fa közösen még jobban dönt.',
        en: 'A chain of yes/no questions cuts the space into boxes, and many trees together decide even better.',
      }}
      scene={
        <ClassificationScene data={data} proba={proba} heightLabel={pick(txt.height)}>
          {lines.length > 0 && <Segments points={lines} />}
        </ClassificationScene>
      }
      overlay={
        <>
          <Readout label={pick(txt.acc)} value={pct(acc)} />
          {!forestMode && <Readout label={pick(txt.leaves)} value={countLeaves(tree)} />}
        </>
      }
      controls={
        <>
          <div className="control">
            <span className="control-row">{pick(txt.mode)}</span>
            <div className="chip-row">
              <button className={!forestMode ? 'chip active' : 'chip'} onClick={() => setForestMode(false)}>
                {pick(txt.tree)}
              </button>
              <button className={forestMode ? 'chip active' : 'chip'} onClick={() => setForestMode(true)}>
                {pick(txt.forest)}
              </button>
            </div>
          </div>
          <Slider label={pick(txt.depth)} hint={pick(txt.depthHint)} value={depth} min={1} max={10} step={1} onChange={setDepth} />
          <Slider label={pick(txt.minSplit)} hint={pick(txt.minSplitHint)} value={minSplit} min={2} max={30} step={1} onChange={setMinSplit} />
          {forestMode && <Slider label={pick(txt.trees)} value={trees} min={1} max={60} step={1} onChange={setTrees} />}
          <h3>{pick({ hu: 'Adatok', en: 'Data' })}</h3>
          {dataControls}
        </>
      }
      sections={sections}
    />
  );
}
