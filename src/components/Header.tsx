import { useLang } from '../i18n/i18n';

export function Header() {
  const { t, lang, setLang } = useLang();
  return (
    <header className="site-header">
      <a className="brand" href="#/">
        <span className="brand-mark cut" aria-hidden>
          ML
        </span>
        {t('siteTitle')}
      </a>
      <div className="header-right">
        <button
          className="lang-toggle"
          onClick={() => setLang(lang === 'hu' ? 'en' : 'hu')}
          aria-label={lang === 'hu' ? 'Switch to English' : 'Váltás magyarra'}
        >
          {t('languageName')}
        </button>
      </div>
    </header>
  );
}
