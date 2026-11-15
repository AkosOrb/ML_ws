import type { Bilingual } from '../i18n/i18n';

export interface QuizQuestion {
  q: Bilingual;
  options: Bilingual[];
  /** Index of the correct option. */
  answer: number;
  /** Shown after answering, whether right or wrong. */
  explain: Bilingual;
}

export interface LessonReview {
  /** Three key takeaways shown in the "summary" box. */
  summary: Bilingual[];
  quiz: QuizQuestion[];
}

const o = (hu: string, en: string): Bilingual => ({ hu, en });

export const reviews: Record<string, LessonReview> = {
  'linear-regression': {
    summary: [
      o('A lineáris regresszió egy egyenest (síkot) illeszt az adatokra, hogy számértéket jósoljon.', 'Linear regression fits a line (plane) to the data to predict a number.'),
      o('A hibát az átlagos négyzetes hibával (MSE) mérjük, és ezt csökkentjük.', 'Error is measured by the mean squared error (MSE), which we minimise.'),
      o('A gradiens-ereszkedés kis lépésekben, a lejtő irányával szemben javítja a paramétereket.', 'Gradient descent improves the parameters in small steps against the slope.'),
    ],
    quiz: [
      {
        q: o('Mi történik, ha a tanulási ráta túl nagy?', 'What happens if the learning rate is too large?'),
        options: [o('A tanulás nagyon lassú lesz', 'Training becomes very slow'), o('A modell túllő a minimumon, akár szét is szállhat', 'The model overshoots the minimum and may even diverge'), o('A modell mindig pontosabb lesz', 'The model always gets more accurate')],
        answer: 1,
        explain: o('Túl nagy lépésekkel a modell átugorja a völgy alját, és a hiba nőhet is.', 'With steps that are too big the model jumps over the valley floor and the error can even grow.'),
      },
      {
        q: o('Miért négyzetre emeljük a hibákat az MSE-ben?', 'Why are the errors squared in MSE?'),
        options: [o('Hogy a pozitív és negatív hibák ne oltsák ki egymást, és a nagy hibák többet számítsanak', 'So positive and negative errors don\'t cancel and big errors count more'), o('Hogy gyorsabb legyen a számítás', 'To make computation faster'), o('Hogy a hiba mindig 0 és 1 közé essen', 'So the error always lies between 0 and 1')],
        answer: 0,
        explain: o('A négyzet mindig pozitív, és a nagy eltéréseket erősebben bünteti.', 'A square is always positive and punishes large deviations more strongly.'),
      },
      {
        q: o('Milyen kimenetet ad a lineáris regresszió?', 'What kind of output does linear regression give?'),
        options: [o('Egy osztálycímkét', 'A class label'), o('Egy folytonos számot', 'A continuous number'), o('Egy klaszterszámot', 'A cluster number')],
        answer: 1,
        explain: o('Regresszió = számérték jóslása (pl. ár, hőmérséklet).', 'Regression = predicting a number (e.g. price, temperature).'),
      },
    ],
  },
  'logistic-regression': {
    summary: [
      o('A logisztikus regresszió osztályoz: valószínűséget ad arra, hogy egy pont melyik osztályba tartozik.', 'Logistic regression classifies: it gives the probability that a point belongs to a class.'),
      o('A szigmoid függvény a lineáris pontszámot 0 és 1 közé nyomja.', 'The sigmoid squashes the linear score into the range 0 to 1.'),
      o('A döntési határ egyenes (sík), ezért nem lineárisan szétválasztható adatnál gyenge.', 'The decision boundary is a line (plane), so it struggles with non-linearly separable data.'),
    ],
    quiz: [
      {
        q: o('Mit csinál a szigmoid függvény?', 'What does the sigmoid function do?'),
        options: [o('Bármely számot 0 és 1 közé képez', 'Maps any number into the range 0 to 1'), o('Négyzetre emeli a hibát', 'Squares the error'), o('Kiválasztja a legközelebbi szomszédot', 'Picks the nearest neighbour')],
        answer: 0,
        explain: o('Így a kimenet valószínűségként értelmezhető.', 'That lets the output be read as a probability.'),
      },
      {
        q: o('Milyen alakú a logisztikus regresszió döntési határa?', 'What shape is logistic regression\'s decision boundary?'),
        options: [o('Kör', 'A circle'), o('Egyenes vagy sík', 'A line or plane'), o('Tetszőleges görbe', 'Any curve')],
        answer: 1,
        explain: o('A határ ott van, ahol a lineáris pontszám 0, ez pedig egyenes/sík.', 'The boundary is where the linear score is 0, which is a line/plane.'),
      },
      {
        q: o('Melyik hibafüggvényt használjuk jellemzően?', 'Which loss function is typically used?'),
        options: [o('Kereszt-entrópia (log-veszteség)', 'Cross-entropy (log loss)'), o('Átlagos abszolút hiba', 'Mean absolute error'), o('Klaszteren belüli szórás', 'Within-cluster variance')],
        answer: 0,
        explain: o('A kereszt-entrópia erősen bünteti a magabiztos, de rossz jóslatokat.', 'Cross-entropy strongly punishes confident but wrong predictions.'),
      },
    ],
  },
  knn: {
    summary: [
      o('A kNN nem tanul paramétereket: egy új pontot a k legközelebbi ismert pont szavazata alapján osztályoz.', 'kNN learns no parameters: it classifies a new point by a vote of its k nearest known points.'),
      o('Kis k: zajos, szaggatott határ (túlillesztés). Nagy k: túl sima határ.', 'Small k: noisy, jagged boundary (overfitting). Large k: overly smooth boundary.'),
      o('A távolság mértéke és a jellemzők skálázása nagyon számít.', 'The distance measure and feature scaling matter a lot.'),
    ],
    quiz: [
      {
        q: o('Mi történik k = 1 esetén?', 'What happens with k = 1?'),
        options: [o('A határ nagyon sima lesz', 'The boundary becomes very smooth'), o('Minden pont a legközelebbi szomszédja osztályát kapja, a határ zajos', 'Each point takes its nearest neighbour\'s class; the boundary is noisy'), o('A modell nem tud dönteni', 'The model cannot decide')],
        answer: 1,
        explain: o('Egyetlen zajos pont is „szigetet” hoz létre maga körül.', 'A single noisy point creates an "island" around itself.'),
      },
      {
        q: o('Mikor dolgozik a kNN a legtöbbet?', 'When does kNN do most of its work?'),
        options: [o('Tanításkor', 'During training'), o('Jósláskor, mert ekkor keresi meg a szomszédokat', 'At prediction time, because it searches for neighbours then'), o('Soha, előre mindent kiszámol', 'Never, everything is precomputed')],
        answer: 1,
        explain: o('„Lusta” tanuló: csak eltárolja az adatot, és jósláskor számol.', 'It is a "lazy" learner: it only stores the data and computes at prediction time.'),
      },
      {
        q: o('Miért fontos a jellemzők skálázása kNN-nél?', 'Why is feature scaling important for kNN?'),
        options: [o('Mert a nagy skálájú jellemző uralná a távolságot', 'Because a large-scale feature would dominate the distance'), o('Mert különben nem fut le', 'Because otherwise it will not run'), o('Nem fontos', 'It is not important')],
        answer: 0,
        explain: o('Ha az egyik tengely méterben, a másik kilométerben van, a távolság torzul.', 'If one axis is in metres and another in kilometres, distances get distorted.'),
      },
    ],
  },
  'decision-tree': {
    summary: [
      o('A döntési fa igen/nem kérdések sorozatával osztja fel a teret téglalap alakú tartományokra.', 'A decision tree splits space into box-shaped regions with a series of yes/no questions.'),
      o('Minden vágásnál azt a kérdést választja, amely a legjobban csökkenti a kevertséget (Gini).', 'At each split it picks the question that most reduces impurity (Gini).'),
      o('A mély fa túlillesztésre hajlamos; sok fa átlaga (véletlen erdő) stabilabb.', 'Deep trees tend to overfit; averaging many trees (a random forest) is more stable.'),
    ],
    quiz: [
      {
        q: o('Mit mér a Gini-index?', 'What does the Gini index measure?'),
        options: [o('Mennyire keverednek az osztályok egy csomópontban', 'How mixed the classes are in a node'), o('A fa mélységét', 'The depth of the tree'), o('A tanulási rátát', 'The learning rate')],
        answer: 0,
        explain: o('0 = tiszta csomópont, nagyobb érték = kevertebb.', '0 = a pure node; larger values = more mixed.'),
      },
      {
        q: o('Mi a fő veszélye a nagyon mély fának?', 'What is the main risk of a very deep tree?'),
        options: [o('Alulillesztés', 'Underfitting'), o('Túlillesztés: megtanulja a zajt is', 'Overfitting: it learns the noise too'), o('Nem tud osztályozni', 'It cannot classify')],
        answer: 1,
        explain: o('Minden egyes pontnak saját dobozt tud vágni, ami nem általánosít.', 'It can carve a box for every single point, which does not generalise.'),
      },
      {
        q: o('Miért jobb gyakran a véletlen erdő egyetlen fánál?', 'Why is a random forest often better than a single tree?'),
        options: [o('Mert gyorsabb', 'Because it is faster'), o('Mert sok, kissé eltérő fa szavazata kiátlagolja a hibákat', 'Because the vote of many slightly different trees averages out errors'), o('Mert mélyebb', 'Because it is deeper')],
        answer: 1,
        explain: o('A fák más-más mintán és jellemzőkön tanulnak, így hibáik kevésbé esnek egybe.', 'The trees learn on different samples and features, so their mistakes rarely coincide.'),
      },
    ],
  },
  svm: {
    summary: [
      o('Az SVM azt a határt keresi, amely a lehető legszélesebb sávval (margóval) választja el az osztályokat.', 'An SVM looks for the boundary that separates the classes with the widest possible margin.'),
      o('Csak a határhoz legközelebbi pontok, a támaszvektorok számítanak.', 'Only the points closest to the boundary, the support vectors, matter.'),
      o('A kernel-trükkel görbe határokat is tud húzni.', 'With the kernel trick it can draw curved boundaries.'),
    ],
    quiz: [
      {
        q: o('Mik a támaszvektorok?', 'What are support vectors?'),
        options: [o('A határhoz legközelebbi pontok, amelyek kijelölik a margót', 'The points closest to the boundary that define the margin'), o('A legtávolabbi pontok', 'The farthest points'), o('A súlyvektor elemei', 'The elements of the weight vector')],
        answer: 0,
        explain: o('Ha a többi pontot elvennénk, a határ nem változna.', 'If all other points were removed, the boundary would not change.'),
      },
      {
        q: o('Mit szabályoz a C paraméter?', 'What does the C parameter control?'),
        options: [o('Mennyire büntetjük a margón belüli vagy rossz oldalra eső pontokat', 'How much points inside the margin or on the wrong side are penalised'), o('A klaszterek számát', 'The number of clusters'), o('A fák számát', 'The number of trees')],
        answer: 0,
        explain: o('Nagy C: kevés hibát enged, keskeny margó. Kis C: szélesebb, „engedékenyebb” margó.', 'Large C: allows few errors, narrow margin. Small C: wider, more "forgiving" margin.'),
      },
      {
        q: o('Mire jó az RBF-kernel?', 'What is the RBF kernel for?'),
        options: [o('Görbe, nem lineáris határok húzására', 'Drawing curved, non-linear boundaries'), o('A tanítás gyorsítására', 'Speeding up training'), o('Az adatok normalizálására', 'Normalising the data')],
        answer: 0,
        explain: o('A kernel egy magasabb dimenziós térben számol, ahol a határ már lehet egyenes.', 'The kernel works in a higher-dimensional space where the boundary can be straight.'),
      },
    ],
  },
  'neural-network': {
    summary: [
      o('Egy neuron súlyozott összeget számol, majd egy nemlineáris aktivációs függvényt alkalmaz.', 'A neuron computes a weighted sum and then applies a non-linear activation function.'),
      o('Rejtett rétegekkel a háló görbe döntési határokat is meg tud tanulni.', 'With hidden layers the network can learn curved decision boundaries.'),
      o('A visszaterjesztés (backpropagation) kiszámolja, melyik súlyt merre kell mozdítani.', 'Backpropagation computes which way each weight should move.'),
    ],
    quiz: [
      {
        q: o('Miért kell nemlineáris aktivációs függvény?', 'Why is a non-linear activation function needed?'),
        options: [o('Nélküle sok réteg is csak egy lineáris függvényt adna', 'Without it, many layers would still be just one linear function'), o('Hogy gyorsabb legyen', 'To make it faster'), o('Hogy kevesebb súly legyen', 'To have fewer weights')],
        answer: 0,
        explain: o('Lineáris függvények egymásba ágyazása is lineáris marad.', 'Composing linear functions stays linear.'),
      },
      {
        q: o('Mit csinál a visszaterjesztés?', 'What does backpropagation do?'),
        options: [o('Kiszámolja a hiba gradiensét minden súlyra', 'Computes the error gradient for every weight'), o('Véletlenszerűen keveri a súlyokat', 'Randomly shuffles the weights'), o('Új adatokat generál', 'Generates new data')],
        answer: 0,
        explain: o('A láncszabállyal a kimenettől visszafelé halad, rétegről rétegre.', 'Using the chain rule it moves backwards from the output, layer by layer.'),
      },
      {
        q: o('Mit segít a momentum a veszteségtájon?', 'How does momentum help on the loss landscape?'),
        options: [o('Átlendíti a labdát a kis gödrökön és platókon', 'It carries the ball through small pits and plateaus'), o('Megállítja a tanulást', 'It stops training'), o('Csökkenti a rétegek számát', 'It reduces the number of layers')],
        answer: 0,
        explain: o('A korábbi lépések iránya „lendületként” megmarad.', 'The direction of earlier steps is kept as "momentum".'),
      },
    ],
  },
  'deep-network': {
    summary: [
      o('Egy mély háló minden rétege átalakítja (hajlítja, nyújtja) a teret.', 'Each layer of a deep network transforms (bends, stretches) the space.'),
      o('Az utolsó rétegre az eredetileg összegabalyodott osztályok szétválaszthatóvá válnak.', 'By the last layer, originally tangled classes become separable.'),
      o('A mélység összetettebb jellemzők fokozatos felépítését teszi lehetővé.', 'Depth allows complex features to be built up step by step.'),
    ],
    quiz: [
      {
        q: o('Mit csinál egy rejtett réteg geometriailag?', 'What does a hidden layer do geometrically?'),
        options: [o('Lineárisan transzformálja, majd nemlineárisan „hajlítja” a teret', 'Transforms the space linearly, then "bends" it non-linearly'), o('Törli a pontok felét', 'Deletes half the points'), o('Csak sorba rendezi a pontokat', 'Just sorts the points')],
        answer: 0,
        explain: o('Súlymátrix + eltolás, majd aktivációs függvény.', 'Weight matrix + bias, then an activation function.'),
      },
      {
        q: o('Miért lesz könnyű az osztályozás az utolsó rétegben?', 'Why is classification easy at the last layer?'),
        options: [o('Mert a korábbi rétegek úgy rendezték át a pontokat, hogy egy sík elválassza őket', 'Because earlier layers rearranged the points so a plane separates them'), o('Mert ott kevesebb pont van', 'Because there are fewer points there'), o('Mert ott nincs aktiváció', 'Because there is no activation there')],
        answer: 0,
        explain: o('A háló lényegében egy jó „nézőpontot” tanul meg az adatokra.', 'The network essentially learns a good "point of view" on the data.'),
      },
      {
        q: o('Mi a „mély” szó jelentése a mélytanulásban?', 'What does "deep" mean in deep learning?'),
        options: [o('Sok egymásra épülő réteg', 'Many stacked layers'), o('Nagyon sok adat', 'Very large amounts of data'), o('Lassú tanulás', 'Slow training')],
        answer: 0,
        explain: o('A mélység a rétegek számára utal.', 'Depth refers to the number of layers.'),
      },
    ],
  },
  cnn: {
    summary: [
      o('A konvolúciós háló kis szűrőket (kerneleket) csúsztat végig a képen, és mintázatokat keres.', 'A convolutional network slides small filters (kernels) across the image to find patterns.'),
      o('A ReLU kinullázza a negatív válaszokat, a max-pooling összesűríti a térképet.', 'ReLU zeroes negative responses; max pooling condenses the map.'),
      o('Ugyanaz a szűrő mindenhol ugyanazt keresi, így kevés súllyal sokat tud.', 'The same filter looks for the same thing everywhere, so few weights do a lot.'),
    ],
    quiz: [
      {
        q: o('Mit számol ki egy konvolúciós szűrő egy adott helyen?', 'What does a convolution filter compute at one position?'),
        options: [o('A szűrő és az alatta lévő képrészlet elemenkénti szorzatainak összegét', 'The sum of element-wise products of the filter and the patch under it'), o('A kép átlagos fényességét', 'The image\'s average brightness'), o('A legközelebbi szomszédot', 'The nearest neighbour')],
        answer: 0,
        explain: o('Ahol a képrészlet hasonlít a szűrőre, ott nagy a válasz.', 'Where the patch resembles the filter, the response is large.'),
      },
      {
        q: o('Mire jó a max-pooling?', 'What is max pooling for?'),
        options: [o('Kicsinyíti a térképet, megtartva a legerősebb jeleket', 'It shrinks the map while keeping the strongest signals'), o('Színessé teszi a képet', 'It colours the image'), o('Új szűrőket tanul', 'It learns new filters')],
        answer: 0,
        explain: o('Így a háló kevésbé érzékeny a kis eltolásokra is.', 'This also makes the network less sensitive to small shifts.'),
      },
      {
        q: o('Miért kell kevesebb súly egy CNN-ben, mint egy teljesen kapcsolt hálóban?', 'Why does a CNN need fewer weights than a fully connected network?'),
        options: [o('Mert ugyanazt a kis szűrőt használja a kép minden pontján', 'Because it reuses the same small filter at every position'), o('Mert kisebb képeket használ', 'Because it uses smaller images'), o('Mert nincs benne tanulás', 'Because it does no learning')],
        answer: 0,
        explain: o('Ez a súlymegosztás.', 'This is weight sharing.'),
      },
    ],
  },
  attention: {
    summary: [
      o('A figyelem során minden szó eldönti, a mondat többi szavára mennyire figyeljen.', 'With attention, every word decides how much to focus on each other word in the sentence.'),
      o('A súlyok a kérdés (query) és a címkék (key) egyezéséből, softmax-szal készülnek.', 'Weights come from matching the query with the keys, via a softmax.'),
      o('Sok figyelemfej és sok réteg együtt adja a Transformer erejét.', 'Many heads and many layers together give the Transformer its power.'),
    ],
    quiz: [
      {
        q: o('Mennyi egy sor összege a figyelemmátrixban?', 'What does one row of the attention matrix sum to?'),
        options: [o('1', '1'), o('A szavak száma', 'The number of words'), o('0', '0')],
        answer: 0,
        explain: o('A softmax miatt a súlyok egy valószínűség-eloszlást alkotnak.', 'Because of the softmax, the weights form a probability distribution.'),
      },
      {
        q: o('Mit csinál a „csak visszafelé” (kauzális) maszk?', 'What does the "only look back" (causal) mask do?'),
        options: [o('Megtiltja, hogy egy szó a későbbi szavakra figyeljen', 'It forbids a word from attending to later words'), o('Megfordítja a mondatot', 'It reverses the sentence'), o('Kitörli a névmásokat', 'It deletes pronouns')],
        answer: 0,
        explain: o('A szöveget generáló modell nem láthatja előre, mi jön.', 'A text-generating model must not see what comes next.'),
      },
      {
        q: o('Mi történik nagyon magas hőmérsékletnél?', 'What happens at a very high temperature?'),
        options: [o('A figyelem egyenletesen szétterül', 'Attention spreads out evenly'), o('Minden figyelem egy szóra esik', 'All attention falls on one word'), o('A modell gyorsabb lesz', 'The model gets faster')],
        answer: 0,
        explain: o('A pontszámokat elosztjuk a hőmérséklettel, így a különbségek eltűnnek.', 'Scores are divided by the temperature, so the differences fade.'),
      },
    ],
  },
  'k-means': {
    summary: [
      o('A k-means k csoportra bontja az adatokat címkék nélkül.', 'k-means splits the data into k groups without any labels.'),
      o('Két lépést ismétel: pontok hozzárendelése a legközelebbi középponthoz, majd a középpontok áthelyezése.', 'It repeats two steps: assign points to the nearest centre, then move the centres.'),
      o('Az eredmény a kezdőpontoktól függ; a k-means++ okosabb kezdést ad.', 'The result depends on the starting points; k-means++ gives a smarter start.'),
    ],
    quiz: [
      {
        q: o('Hová kerül egy középpont a frissítési lépésben?', 'Where does a centre move in the update step?'),
        options: [o('A hozzá tartozó pontok átlagába', 'To the mean of its assigned points'), o('A legtávolabbi pontra', 'To the farthest point'), o('Véletlen helyre', 'To a random place')],
        answer: 0,
        explain: o('Ez csökkenti a klaszteren belüli négyzetes távolságot.', 'This reduces the within-cluster squared distance.'),
      },
      {
        q: o('Kell-e a k-means-nek címkézett adat?', 'Does k-means need labelled data?'),
        options: [o('Nem, felügyelet nélküli módszer', 'No, it is an unsupervised method'), o('Igen, minden ponthoz', 'Yes, for every point'), o('Csak a középpontokhoz', 'Only for the centres')],
        answer: 0,
        explain: o('Maga keresi meg a csoportokat.', 'It finds the groups by itself.'),
      },
      {
        q: o('Milyen alakú klasztereket talál jól a k-means?', 'What shape of clusters does k-means find well?'),
        options: [o('Kerek, hasonló méretű csoportokat', 'Round groups of similar size'), o('Hosszú, csavart spirálokat', 'Long, twisted spirals'), o('Egymásba ágyazott gyűrűket', 'Nested rings')],
        answer: 0,
        explain: o('A legközelebbi középponthoz rendelés gömbszerű határokat ad.', 'Assigning to the nearest centre gives sphere-like boundaries.'),
      },
    ],
  },
  hierarchical: {
    summary: [
      o('A hierarchikus klaszterezés minden pontot külön csoportként kezd, és lépésenként összevonja a legközelebbieket.', 'Hierarchical clustering starts with every point as its own group and merges the closest ones step by step.'),
      o('Az összevonások sorrendjét a dendrogram mutatja.', 'The dendrogram shows the order of merges.'),
      o('A kapcsolási mód (single, complete, average) határozza meg, mit jelent két csoport távolsága.', 'The linkage (single, complete, average) defines the distance between two groups.'),
    ],
    quiz: [
      {
        q: o('Mit mutat a dendrogram magassága?', 'What does the height in a dendrogram show?'),
        options: [o('Milyen távol voltak a csoportok az összevonáskor', 'How far apart the groups were when merged'), o('A pontok számát', 'The number of points'), o('Az idő múlását', 'The passing of time')],
        answer: 0,
        explain: o('Ahol nagy ugrás van, ott érdemes „elvágni” a fát.', 'Where there is a large jump is a good place to "cut" the tree.'),
      },
      {
        q: o('Mire hajlamos a single linkage?', 'What does single linkage tend to do?'),
        options: [o('Hosszú, láncszerű klasztereket képez', 'It forms long, chain-like clusters'), o('Mindig egyenlő méretű klasztereket ad', 'It always gives equal-sized clusters'), o('Nem tud összevonni', 'It cannot merge')],
        answer: 0,
        explain: o('Elég egyetlen közeli pontpár az összevonáshoz.', 'A single close pair of points is enough to merge.'),
      },
      {
        q: o('Kell-e előre megadni a klaszterek számát?', 'Do you need to fix the number of clusters in advance?'),
        options: [o('Nem, utólag választhatunk a dendrogramon', 'No, you can choose afterwards on the dendrogram'), o('Igen, mindig', 'Yes, always'), o('Csak páros számot lehet', 'Only an even number is allowed')],
        answer: 0,
        explain: o('Ez a módszer egyik nagy előnye a k-means-szel szemben.', 'This is one of its big advantages over k-means.'),
      },
    ],
  },
  pca: {
    summary: [
      o('A főkomponens-elemzés megkeresi azokat az irányokat, amelyek mentén az adat a legjobban szóródik.', 'PCA finds the directions along which the data varies the most.'),
      o('Ezekre vetítve kevesebb dimenzióval is megtartható az információ nagy része.', 'Projecting onto them keeps most of the information with fewer dimensions.'),
      o('A főkomponensek egymásra merőlegesek, és a kovariancia-mátrix sajátvektorai.', 'The principal components are mutually perpendicular eigenvectors of the covariance matrix.'),
    ],
    quiz: [
      {
        q: o('Mit mutat az első főkomponens?', 'What does the first principal component show?'),
        options: [o('A legnagyobb szórás irányát', 'The direction of greatest variance'), o('A legkisebb szórás irányát', 'The direction of least variance'), o('Az x tengelyt', 'The x axis')],
        answer: 0,
        explain: o('Ebben az irányban „nyúlik el” leginkább a pontfelhő.', 'This is the direction in which the point cloud is most stretched.'),
      },
      {
        q: o('Mire használják leggyakrabban a PCA-t?', 'What is PCA most often used for?'),
        options: [o('Dimenziócsökkentésre és megjelenítésre', 'Dimensionality reduction and visualisation'), o('Osztályozásra címkékkel', 'Classification with labels'), o('Jutalom maximalizálására', 'Maximising reward')],
        answer: 0,
        explain: o('Pl. sokdimenziós adat 2D-s ábrázolására.', 'E.g. plotting high-dimensional data in 2D.'),
      },
      {
        q: o('Milyen viszonyban vannak a főkomponensek egymással?', 'How are the principal components related to each other?'),
        options: [o('Merőlegesek', 'They are perpendicular'), o('Párhuzamosak', 'They are parallel'), o('Véletlenszerűek', 'They are random')],
        answer: 0,
        explain: o('Így mindegyik új, az előzőektől független információt hordoz.', 'So each carries new information independent of the previous ones.'),
      },
    ],
  },
  'q-learning': {
    summary: [
      o('A Q-learning minden állapot–cselekvés párhoz megtanulja, mennyi jövőbeli jutalom várható.', 'Q-learning learns how much future reward to expect for every state–action pair.'),
      o('Az ágens egyensúlyoz a felfedezés (ε) és a már ismert jó lépések kihasználása között.', 'The agent balances exploration (ε) against exploiting known good moves.'),
      o('A γ diszkontfaktor szabja meg, mennyire számít a távoli jövő.', 'The discount factor γ sets how much the distant future matters.'),
    ],
    quiz: [
      {
        q: o('Mit jelent a nagy ε (epszilon)?', 'What does a large ε (epsilon) mean?'),
        options: [o('Az ágens gyakran véletlen lépést tesz (felfedez)', 'The agent often takes random moves (explores)'), o('Az ágens mindig a legjobbnak hitt lépést választja', 'The agent always picks the move it thinks is best'), o('A jutalom nagyobb', 'The reward is larger')],
        answer: 0,
        explain: o('Felfedezés nélkül az ágens beragadhat egy rossz útvonalba.', 'Without exploration the agent can get stuck on a poor route.'),
      },
      {
        q: o('Mi történik, ha γ közel van 0-hoz?', 'What happens when γ is close to 0?'),
        options: [o('Az ágens csak az azonnali jutalommal törődik', 'The agent only cares about immediate reward'), o('Az ágens nagyon előrelátó', 'The agent is very far-sighted'), o('A tanulás leáll', 'Learning stops')],
        answer: 0,
        explain: o('A jövőbeli jutalmak súlya γ hatványaival csökken.', 'Future rewards are weighted by powers of γ.'),
      },
      {
        q: o('Honnan tudja az ágens, mi a jó lépés?', 'How does the agent know what a good move is?'),
        options: [o('A kapott jutalmakból, próbálkozással', 'From the rewards it receives, by trial and error'), o('Felcímkézett példákból', 'From labelled examples'), o('Előre megkapja a térképet', 'It is given the map in advance')],
        answer: 0,
        explain: o('Ez a megerősítéses tanulás lényege.', 'That is the essence of reinforcement learning.'),
      },
    ],
  },
};
