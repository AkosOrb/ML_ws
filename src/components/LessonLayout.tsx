import type { ReactNode } from 'react';
import { useLang, type Bilingual } from '../i18n/i18n';
import type { UiKey } from '../i18n/strings';
import { categories, type CategoryId } from '../lessons/registry';

export interface LessonSection {
  heading: UiKey;
  body: Record<'hu' | 'en', ReactNode>;
}

interface Props {
  category: CategoryId;
  title: Bilingual;
  intro: Bilingual;
  /** The interactive 3D scene (a <Canvas>). */
  scene: ReactNode;
  /** Live readouts shown over the scene (loss, step count…). */
  overlay?: ReactNode;
  /** Parameter controls in the side panel. */
  controls: ReactNode;
  sections: LessonSection[];
}

/**
 * Shared layout for every lesson: title, a 3D scene with a parameter panel
 * beside it, and explanation sections underneath.
 */
export function LessonLayout({ category, title, intro, scene, overlay, controls, sections }: Props) {
  const { t, pick, lang } = useLang();
  const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  const cat = categories.find((c) => c.id === category)!;

  return (
    <article className="lesson" style={{ '--accent': cat.color } as React.CSSProperties}>
      <a className="back-link" href="#/">{t('back')}</a>
      <div className="lesson-head">
        <div>
          <p className="eyebrow">{pick(cat.title)}</p>
          <h1>{pick(title)}</h1>
        </div>
        <p className="lesson-intro">{pick(intro)}</p>
      </div>

      <div className="workbench">
        <div className="scene cut" role="group" aria-label={`${pick(title)}: ${t('scene3d')}`}>
          {scene}
          {overlay && <div className="scene-overlay">{overlay}</div>}
          <div className="scene-hint">{t(touch ? 'sceneHintTouch' : 'sceneHint')}</div>
        </div>
        <aside className="panel">
          <h2>{t('parameters')}</h2>
          {controls}
        </aside>
      </div>

      <div className="sections">
        {sections.map((s) => (
          <section key={s.heading} className="explain">
            <h2>{t(s.heading)}</h2>
            <div>{s.body[lang]}</div>
          </section>
        ))}
      </div>
    </article>
  );
}
