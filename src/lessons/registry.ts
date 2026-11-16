import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { Bilingual } from '../i18n/i18n';

export type CategoryId = 'supervised' | 'unsupervised' | 'reinforcement' | 'deep';

export interface Category {
  id: CategoryId;
  title: Bilingual;
  summary: Bilingual;
  color: string;
}

export interface LessonMeta {
  id: string;
  category: CategoryId;
  title: Bilingual;
  teaser: Bilingual;
  /** Missing until the lesson is built; the home page shows it as "coming soon". */
  component?: LazyExoticComponent<ComponentType>;
}

export const categories: Category[] = [
  {
    id: 'supervised',
    title: { hu: 'Felügyelt tanulás', en: 'Supervised learning' },
    summary: {
      hu: 'A gép felcímkézett példákból tanul: megmutatjuk neki a kérdést és a helyes választ is.',
      en: 'The machine learns from labelled examples: we show it both the question and the right answer.',
    },
    color: '#e8553a',
  },
  {
    id: 'unsupervised',
    title: { hu: 'Felügyelet nélküli tanulás', en: 'Unsupervised learning' },
    summary: {
      hu: 'Nincs helyes válasz: a gép maga keres mintázatokat, csoportokat az adatokban.',
      en: 'No right answers: the machine finds patterns and groups in the data on its own.',
    },
    color: '#e8553a',
  },
  {
    id: 'reinforcement',
    title: { hu: 'Megerősítéses tanulás', en: 'Reinforcement learning' },
    summary: {
      hu: 'A gép próbálkozik, jutalmat vagy büntetést kap, és ebből tanulja meg a jó stratégiát.',
      en: 'The machine tries things, gets rewards or penalties, and learns a good strategy from them.',
    },
    color: '#e8553a',
  },
  {
    id: 'deep',
    title: { hu: 'Mélytanulás', en: 'Deep learning' },
    summary: {
      hu: 'Sok rétegből álló neurális hálók, amelyek lépésről lépésre egyre összetettebb jellemzőket tanulnak meg.',
      en: 'Neural networks with many layers that learn ever more complex features, step by step.',
    },
    color: '#e8553a',
  },
];

export const lessons: LessonMeta[] = [
  {
    id: 'linear-regression',
    category: 'supervised',
    title: { hu: 'Lineáris regresszió', en: 'Linear regression' },
    teaser: {
      hu: 'Egyenes (vagy sík) illesztése pontokra, hogy számokat jósoljunk.',
      en: 'Fitting a line (or plane) to points to predict numbers.',
    },
    component: lazy(() => import('./linear-regression/LinearRegressionLesson')),
  },
  {
    id: 'logistic-regression',
    category: 'supervised',
    title: { hu: 'Logisztikus regresszió', en: 'Logistic regression' },
    teaser: { hu: 'Igen vagy nem? Valószínűség becslése két osztályra.', en: 'Yes or no? Estimating a probability for two classes.' },
    component: lazy(() => import('./logistic-regression/LogisticRegressionLesson')),
  },
  {
    id: 'knn',
    category: 'supervised',
    title: { hu: 'k-legközelebbi szomszéd', en: 'k-nearest neighbours' },
    teaser: { hu: 'Mondd meg, kik a szomszédaid, és megmondom, ki vagy.', en: 'Tell me who your neighbours are and I will tell you who you are.' },
    component: lazy(() => import('./knn/KnnLesson')),
  },
  {
    id: 'decision-tree',
    category: 'supervised',
    title: { hu: 'Döntési fa és véletlen erdő', en: 'Decision tree & random forest' },
    teaser: { hu: 'Egymás utáni igen/nem kérdések, és sok fa közös szavazása.', en: 'A chain of yes/no questions, and many trees voting together.' },
    component: lazy(() => import('./decision-tree/DecisionTreeLesson')),
  },
  {
    id: 'svm',
    category: 'supervised',
    title: { hu: 'Tartóvektor-gép (SVM)', en: 'Support vector machine (SVM)' },
    teaser: { hu: 'A lehető legszélesebb „utca” a két osztály között.', en: 'The widest possible "street" between two classes.' },
    component: lazy(() => import('./svm/SvmLesson')),
  },
  {
    id: 'neuron',
    category: 'deep',
    title: { hu: 'A neuron', en: 'The neuron' },
    teaser: { hu: 'Bemenetek, súlyok, eltolás, aktiváció: így számol a háló legkisebb egysége.', en: 'Inputs, weights, bias, activation: how the smallest unit of a network computes.' },
    component: lazy(() => import('./neuron/NeuronLesson')),
  },
  {
    id: 'neural-network',
    category: 'deep',
    title: { hu: 'Neurális háló', en: 'Neural network' },
    teaser: { hu: 'Rétegekbe szervezett mesterséges neuronok, és a gradiens ereszkedés.', en: 'Layers of artificial neurons, and gradient descent.' },
    component: lazy(() => import('./neural-network/NeuralNetworkLesson')),
  },
  {
    id: 'forward-pass',
    category: 'deep',
    title: { hu: 'Bemenettől a kimenetig', en: 'From input to output' },
    teaser: { hu: 'Egy rajz útja a hálón át: pixelek, rejtett neuronok, valószínűségek.', en: 'A drawing travels through the network: pixels, hidden neurons, probabilities.' },
    component: lazy(() => import('./forward-pass/ForwardPassLesson')),
  },
  {
    id: 'deep-network',
    category: 'deep',
    title: { hu: 'Mély háló belülről', en: 'Inside a deep network' },
    teaser: { hu: 'Rétegről rétegre: hogyan hajtogatja a háló a teret, amíg az osztályok szétválnak.', en: 'Layer by layer: how the network folds space until the classes come apart.' },
    component: lazy(() => import('./deep-network/DeepNetworkLesson')),
  },
  {
    id: 'overfitting',
    category: 'deep',
    title: { hu: 'Túltanulás és általánosítás', en: 'Overfitting and generalisation' },
    teaser: { hu: 'Amikor a háló bemagol tanulás helyett, és hogyan lehet ezt megakadályozni.', en: 'When the network memorises instead of learning, and how to prevent it.' },
    component: lazy(() => import('./overfitting/OverfittingLesson')),
  },
  {
    id: 'cnn',
    category: 'deep',
    title: { hu: 'Konvolúciós háló (CNN)', en: 'Convolutional network (CNN)' },
    teaser: { hu: 'Szűrők csúsznak végig a képen, és éleket, formákat keresnek.', en: 'Filters slide across an image, looking for edges and shapes.' },
    component: lazy(() => import('./cnn/CnnLesson')),
  },
  {
    id: 'attention',
    category: 'deep',
    title: { hu: 'Figyelem és Transformer', en: 'Attention & Transformers' },
    teaser: { hu: 'A chatbotok alapja: minden szó eldönti, melyik másikra figyeljen.', en: 'The basis of chatbots: every word decides which others to attend to.' },
    component: lazy(() => import('./attention/AttentionLesson')),
  },
  {
    id: 'hallucination',
    category: 'deep',
    title: { hu: 'Hallucináció', en: 'Hallucination' },
    teaser: { hu: 'Miért mond a modell magabiztosan valótlant? Zaj, megtévesztés és egy kis nyelvi modell.', en: 'Why does a model confidently say false things? Noise, adversarial pixels and a tiny language model.' },
    component: lazy(() => import('./hallucination/HallucinationLesson')),
  },
  {
    id: 'k-means',
    category: 'unsupervised',
    title: { hu: 'k-means klaszterezés', en: 'k-means clustering' },
    teaser: { hu: 'Pontok csoportosítása k darab középpont köré.', en: 'Grouping points around k centres.' },
    component: lazy(() => import('./k-means/KMeansLesson')),
  },
  {
    id: 'hierarchical',
    category: 'unsupervised',
    title: { hu: 'Hierarchikus klaszterezés', en: 'Hierarchical clustering' },
    teaser: { hu: 'Csoportok egyre nagyobb csoportokba olvasztása, családfaszerűen.', en: 'Merging groups into ever larger groups, like a family tree.' },
    component: lazy(() => import('./hierarchical/HierarchicalLesson')),
  },
  {
    id: 'pca',
    category: 'unsupervised',
    title: { hu: 'Főkomponens-analízis (PCA)', en: 'Principal component analysis (PCA)' },
    teaser: { hu: 'A legfontosabb irányok megtalálása, kevesebb dimenzióban.', en: 'Finding the most important directions, in fewer dimensions.' },
    component: lazy(() => import('./pca/PcaLesson')),
  },
  {
    id: 'q-learning',
    category: 'reinforcement',
    title: { hu: 'Q-learning', en: 'Q-learning' },
    teaser: { hu: 'Egy ágens próbálgatással tanulja meg az utat egy rácsvilágban.', en: 'An agent learns its way through a grid world by trial and error.' },
    component: lazy(() => import('./q-learning/QLearningLesson')),
  },
];

export function findLesson(id: string): LessonMeta | undefined {
  return lessons.find((l) => l.id === id);
}
