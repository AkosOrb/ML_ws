import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { Bilingual } from '../i18n/i18n';

export type CategoryId = 'supervised' | 'unsupervised' | 'reinforcement';

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
    color: '#4f9dff',
  },
  {
    id: 'unsupervised',
    title: { hu: 'Felügyelet nélküli tanulás', en: 'Unsupervised learning' },
    summary: {
      hu: 'Nincs helyes válasz: a gép maga keres mintázatokat, csoportokat az adatokban.',
      en: 'No right answers: the machine finds patterns and groups in the data on its own.',
    },
    color: '#3ccf91',
  },
  {
    id: 'reinforcement',
    title: { hu: 'Megerősítéses tanulás', en: 'Reinforcement learning' },
    summary: {
      hu: 'A gép próbálkozik, jutalmat vagy büntetést kap, és ebből tanulja meg a jó stratégiát.',
      en: 'The machine tries things, gets rewards or penalties, and learns a good strategy from them.',
    },
    color: '#ffb547',
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
    id: 'neural-network',
    category: 'supervised',
    title: { hu: 'Neurális háló', en: 'Neural network' },
    teaser: { hu: 'Rétegekbe szervezett mesterséges neuronok, és a gradiens ereszkedés.', en: 'Layers of artificial neurons, and gradient descent.' },
    component: lazy(() => import('./neural-network/NeuralNetworkLesson')),
  },
  {
    id: 'k-means',
    category: 'unsupervised',
    title: { hu: 'k-means klaszterezés', en: 'k-means clustering' },
    teaser: { hu: 'Pontok csoportosítása k darab középpont köré.', en: 'Grouping points around k centres.' },
  },
  {
    id: 'hierarchical',
    category: 'unsupervised',
    title: { hu: 'Hierarchikus klaszterezés', en: 'Hierarchical clustering' },
    teaser: { hu: 'Csoportok egyre nagyobb csoportokba olvasztása, családfaszerűen.', en: 'Merging groups into ever larger groups, like a family tree.' },
  },
  {
    id: 'pca',
    category: 'unsupervised',
    title: { hu: 'Főkomponens-analízis (PCA)', en: 'Principal component analysis (PCA)' },
    teaser: { hu: 'A legfontosabb irányok megtalálása, kevesebb dimenzióban.', en: 'Finding the most important directions, in fewer dimensions.' },
  },
  {
    id: 'q-learning',
    category: 'reinforcement',
    title: { hu: 'Q-learning', en: 'Q-learning' },
    teaser: { hu: 'Egy ágens próbálgatással tanulja meg az utat egy rácsvilágban.', en: 'An agent learns its way through a grid world by trial and error.' },
  },
];

export function findLesson(id: string): LessonMeta | undefined {
  return lessons.find((l) => l.id === id);
}
