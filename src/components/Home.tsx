import { useLang } from '../i18n/i18n';
import { categories, lessons } from '../lessons/registry';
import { lessonHref } from '../useHashRoute';

export function Home() {
  const { t, pick } = useLang();
  return (
    <div className="home">
      <section className="hero">
        <h1>{t('siteTitle')}</h1>
        <p>{t('tagline')}</p>
      </section>

      {categories.map((cat) => (
        <section key={cat.id} className="category" style={{ '--accent': cat.color } as React.CSSProperties}>
          <h2>{pick(cat.title)}</h2>
          <p className="category-summary">{pick(cat.summary)}</p>
          <div className="lesson-grid">
            {lessons
              .filter((l) => l.category === cat.id)
              .map((l) => {
                const ready = Boolean(l.component);
                const body = (
                  <>
                    <h3>{pick(l.title)}</h3>
                    <p>{pick(l.teaser)}</p>
                    <span className="badge">{ready ? t('open') + ' →' : t('comingSoon')}</span>
                  </>
                );
                return ready ? (
                  <a key={l.id} className="lesson-card" href={lessonHref(l.id)}>
                    {body}
                  </a>
                ) : (
                  <div key={l.id} className="lesson-card disabled" aria-disabled>
                    {body}
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
