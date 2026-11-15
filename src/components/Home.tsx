import { useLang } from '../i18n/i18n';
import { categories, lessons } from '../lessons/registry';
import { reviews } from '../lessons/quizzes';
import { lessonHref } from '../useHashRoute';
import { useScores } from '../progress';
import { HeroArt } from './HeroArt';
import { LessonIcon } from './LessonIcon';
import { scrollToCategory } from './Footer';

const principles = [
  {
    title: { hu: 'Forgasd', en: 'Rotate' },
    body: {
      hu: 'Minden lecke közepén egy 3D-s jelenet van: húzd, nagyítsd, nézd meg az adatokat és a modellt minden oldalról.',
      en: 'Every lesson centres on a 3D scene: drag, zoom and look at the data and the model from every side.',
    },
  },
  {
    title: { hu: 'Állítsd', en: 'Tweak' },
    body: {
      hu: 'A paraméterpanelen minden fontos beállítás csúszkán van; a változás azonnal látszik.',
      en: 'Every important setting is a slider in the parameter panel; you see the effect immediately.',
    },
  },
  {
    title: { hu: 'Figyeld', en: 'Watch' },
    body: {
      hu: 'Indítsd el a tanítást, és kövesd lépésről lépésre, ahogy a hiba csökken és a modell alakul.',
      en: 'Start training and follow step by step as the error drops and the model takes shape.',
    },
  },
  {
    title: { hu: 'Ellenőrizd', en: 'Check' },
    body: {
      hu: 'A leckék végén rövid összefoglaló és kvíz vár; az eredményed itt, a kezdőlapon is megjelenik.',
      en: 'Each lesson ends with a short summary and quiz; your score also shows up here on the home page.',
    },
  },
];

export function Home() {
  const { t, pick } = useLang();
  const scores = useScores();
  const built = lessons.filter((l) => l.component);
  const questions = built.reduce((n, l) => n + (reviews[l.id]?.quiz.length ?? 0), 0);
  const first = built[0];
  let counter = 0;

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-top">
          <div className="hero-art dark">
            <HeroArt />
            <span className="label math-label">fig. 01 — ŷ = w·x + b</span>
          </div>
          <div className="hero-side">
            <div className="tags label">
              <span>HU / EN</span>
              <span>3D · WebGL</span>
            </div>
          </div>
        </div>
        <div className="hero-main">
          <div className="hero-title">
            <h1>
              {pick({ hu: 'Gépi tanulás, láthatóan.', en: 'Machine learning, made visible.' })}
              <br />
              {pick({ hu: 'Állítsd, forgasd, értsd meg.', en: 'Tweak it, turn it, get it.' })}
            </h1>
            <div className="foot">
              <p>{t('tagline')}</p>
              <span className="label">v1 · 2026</span>
            </div>
          </div>
          <div className="hero-note">
            <p>
              {pick({
                hu: 'Minden lecke ugyanarra épül: egy élő 3D-s modell, paraméterek, amelyeket te állítasz, rövid magyarázat a matekkal, és a végén egy kvíz.',
                en: 'Every lesson follows the same system: a live 3D model, parameters you control, a short explanation with the maths, and a quiz at the end.',
              })}
            </p>
            {first && (
              <a className="btn light" href={lessonHref(first.id)}>
                {pick({ hu: 'Kezdés', en: 'Start' })} →
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="stats dark">
        <div className="stat-grid">
          {[
            [built.length, pick({ hu: 'Interaktív lecke', en: 'Interactive lessons' })],
            [categories.length, pick({ hu: 'Tanulási terület', en: 'Learning areas' })],
            [questions, pick({ hu: 'Kvízkérdés', en: 'Quiz questions' })],
            ['2', pick({ hu: 'Nyelv: magyar és angol', en: 'Languages: Hungarian & English' })],
          ].map(([n, label], i) => (
            <div className="stat cut" key={i}>
              <b>{n}</b>
              <span className="label">{label}</span>
            </div>
          ))}
        </div>
        <div className="stat-text cut">
          <h2>{pick({ hu: 'Képletek helyett először kép.', en: 'Pictures first, formulas second.' })}</h2>
          <p>
            {pick({
              hu: 'Egyetemistáknak készült: minden algoritmust először látsz működni, utána jön a „miért”, a pontos matek és a gyakorlati példák.',
              en: 'Built for university students: you first see each algorithm work, then comes the "why", the exact maths and real-world uses.',
            })}
          </p>
        </div>
      </section>

      {categories.map((cat, ci) => (
        <section key={cat.id} className="category" id={`cat-${cat.id}`}>
          <div className="category-head">
            <span className="label">
              {String(ci + 1).padStart(2, '0')} / {String(categories.length).padStart(2, '0')}
            </span>
            <h2>{pick(cat.title)}</h2>
            <p className="category-summary">{pick(cat.summary)}</p>
          </div>
          <div className="lesson-grid">
            {lessons
              .filter((l) => l.category === cat.id)
              .map((l) => {
                const ready = Boolean(l.component);
                const n = ++counter;
                const alt = n % 2 === 1;
                const score = scores[l.id];
                const body = (
                  <>
                    <div className="tile cut">
                      <h3>{pick(l.title)}</h3>
                      <span className="num">{String(n).padStart(2, '0')}</span>
                      <div className="icon">
                        <LessonIcon id={l.id} />
                      </div>
                    </div>
                    <div className="caption cut">
                      <p style={{ margin: 0 }}>{pick(l.teaser)}</p>
                      <div className="card-foot">
                        <span className="badge">{ready ? t('open') + ' →' : t('comingSoon')}</span>
                        {score && (
                          <span className={score.best === score.total ? 'score full' : 'score'}>
                            {t('quizDone')} {score.best}/{score.total}
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                );
                return ready ? (
                  <a key={l.id} className={alt ? 'lesson-card alt' : 'lesson-card'} href={lessonHref(l.id)}>
                    {body}
                  </a>
                ) : (
                  <div key={l.id} className="lesson-card" aria-disabled>
                    {body}
                  </div>
                );
              })}
          </div>
        </section>
      ))}

      <section className="principles">
        <div className="principles-head">
          <h2>{pick({ hu: 'Így tanulj itt: négy lépés.', en: 'How to learn here: four steps.' })}</h2>
        </div>
        <div className="principles-list">
          {principles.map((p, i) => (
            <details key={i} open={i === 0}>
              <summary>{pick(p.title)}</summary>
              <p>{pick(p.body)}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="cta dark">
        <HeroArt variant="band" />
        <div>
          <p className="label">
            {pick({
              hu: 'Felügyelt, felügyelet nélküli, megerősítéses és mélytanulás egy helyen, az első egyenestől a Transformerig.',
              en: 'Supervised, unsupervised, reinforcement and deep learning in one place, from the first straight line to Transformers.',
            })}
          </p>
        </div>
        <div className="end">
          <h2>{pick({ hu: 'Építsd fel a tudásod rétegről rétegre.', en: 'Build your understanding layer by layer.' })}</h2>
          <button className="primary" onClick={() => scrollToCategory(categories[0].id)}>
            {pick({ hu: 'Leckék', en: 'Lessons' })} →
          </button>
        </div>
      </section>
    </div>
  );
}
