import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ui, type UiKey } from './strings';

export type Lang = 'hu' | 'en';

/** A piece of text in both languages. */
export type Bilingual = Record<Lang, string>;

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Translate a UI string by key. */
  t: (key: UiKey) => string;
  /** Pick the current language from a bilingual value. */
  pick: <T>(value: Record<Lang, T>) => T;
}

const STORAGE_KEY = 'ml-muhely.lang';
const LanguageContext = createContext<LanguageContextValue | null>(null);

function initialLang(): Lang {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  if (saved === 'hu' || saved === 'en') return saved;
  return typeof navigator !== 'undefined' && !navigator.language.startsWith('hu') ? 'en' : 'hu';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      setLang,
      t: (key) => ui[key][lang],
      pick: (v) => v[lang],
    }),
    [lang, setLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside LanguageProvider');
  return ctx;
}

/** Hungarian writes decimals with a comma: 0.30 → 0,30. Applied to numbers shown in the UI. */
export function localizeNumbers(text: string, lang: Lang): string {
  return lang === 'hu' ? text.replace(/(\d)\.(\d)/g, '$1,$2') : text;
}
