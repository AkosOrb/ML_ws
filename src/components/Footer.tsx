import { useLang } from '../i18n/i18n';
import { categories, lessons } from '../lessons/registry';
import { reviews } from '../lessons/quizzes';
import { lessonHref } from '../useHashRoute';

export function scrollToCategory(id: string) {
  const go = () => document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: 'smooth' });
  if (window.location.hash.startsWith('#/lesson')) {
    window.location.hash = '#/';
    setTimeout(go, 120);
  } else go();
}

export function Footer() {
  const { pick, lang, setLang } = useLang();
  const built = lessons.filter((l) => l.component);
  const first = built[0];
  const questions = built.reduce((n, l) => n + (reviews[l.id]?.quiz.length ?? 0), 0);
  const facts: [number, { hu: string; en: string }][] = [
    [built.length, { hu: 'interaktív lecke', en: 'interactive lessons' }],
    [categories.length, { hu: 'tanulási terület', en: 'learning areas' }],
    [questions, { hu: 'kvízkérdés', en: 'quiz questions' }],
    [2, { hu: 'nyelv: magyar és angol', en: 'languages: Hungarian & English' }],
  ];
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <h2>{pick({ hu: 'Gépi tanulás egyetemistáknak, két nyelven, 3D-ben.', en: 'Machine learning for university students, in two languages, in 3D.' })}</h2>
          {first && (
            <a className="btn" href={lessonHref(first.id)}>
              {pick({ hu: 'Első lecke', en: 'First lesson' })} →
            </a>
          )}
          <div className="footer-mark cut" aria-hidden>
            ML
          </div>
        </div>
        <ul className="footer-nav">
          <li>
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              {pick({ hu: 'Vissza az oldal tetejére', en: 'Back to top' })} <span>↑</span>
            </button>
          </li>
        </ul>
      </div>
      <dl className="footer-facts">
        {facts.map(([n, label]) => (
          <div key={label.en}>
            <dt>{n}</dt>
            <dd className="label">{pick(label)}</dd>
          </div>
        ))}
      </dl>
      <div className="footer-bottom label">
        <span>© 2026 ML {pick({ hu: 'műhely', en: 'Workshop' })}</span>
        <button className="footer-lang label" onClick={() => setLang(lang === 'hu' ? 'en' : 'hu')}>
          {pick({ hu: 'Switch to English →', en: 'Váltás magyarra →' })}
        </button>
      </div>
    </footer>
  );
}
