import type { Bilingual } from './i18n';

/** Interface strings shared across the whole site. */
export const ui = {
  siteTitle: { hu: 'ML műhely', en: 'ML Workshop' },
  tagline: {
    hu: 'A gépi tanulás interaktív 3D-s bemutatása: forgasd, állítsd, figyeld, ahogy a gép tanul.',
    en: 'An interactive 3D tour of machine learning: rotate, tweak, and watch the machine learn.',
  },
  home: { hu: 'Kezdőlap', en: 'Home' },
  comingSoon: { hu: 'Hamarosan', en: 'Coming soon' },
  open: { hu: 'Megnyitás', en: 'Open' },
  back: { hu: '← Vissza a leckékhez', en: '← Back to lessons' },
  parameters: { hu: 'Paraméterek', en: 'Parameters' },
  play: { hu: '▶ Tanítás indítása', en: '▶ Start training' },
  pause: { hu: '⏸ Szünet', en: '⏸ Pause' },
  step: { hu: 'Egy lépés', en: 'One step' },
  reset: { hu: '↺ Modell visszaállítása', en: '↺ Reset model' },
  newData: { hu: '🎲 Új adatok', en: '🎲 New data' },
  sceneHint: {
    hu: 'Húzd az egeret a forgatáshoz, görgess a nagyításhoz.',
    en: 'Drag to rotate, scroll to zoom.',
  },
  whatIsIt: { hu: 'Mi ez?', en: 'What is it?' },
  howItWorks: { hu: 'Hogyan működik?', en: 'How does it work?' },
  tryIt: { hu: 'Próbáld ki!', en: 'Try it!' },
  math: { hu: 'A matek röviden', en: 'The math in brief' },
  usedFor: { hu: 'Hol használják?', en: 'Where is it used?' },
  languageName: { hu: 'English', en: 'Magyar' },
} satisfies Record<string, Bilingual>;

export type UiKey = keyof typeof ui;
