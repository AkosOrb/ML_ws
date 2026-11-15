import { useLang } from '../i18n/i18n';
import { categories, lessons } from '../lessons/registry';
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
  const first = lessons.find((l) => l.component);
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
          {categories.map((c) => (
            <li key={c.id}>
              <button onClick={() => scrollToCategory(c.id)}>
                {pick(c.title)} <span>→</span>
              </button>
            </li>
          ))}
          <li>
            <a href="https://github.com/AkosOrb/ML_ws" target="_blank" rel="noreferrer">
              {pick({ hu: 'Forráskód', en: 'Source code' })} <span>↗</span>
            </a>
          </li>
        </ul>
      </div>
      <div className="footer-bottom label">
        <span>© 2026 ML {pick({ hu: 'műhely', en: 'Workshop' })}</span>
        <button className="footer-lang label" onClick={() => setLang(lang === 'hu' ? 'en' : 'hu')}>
          {pick({ hu: 'Switch to English →', en: 'Váltás magyarra →' })}
        </button>
      </div>
    </footer>
  );
}
