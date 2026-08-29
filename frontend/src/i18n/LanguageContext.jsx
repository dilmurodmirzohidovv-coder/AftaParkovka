import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { translations, LANGUAGES } from './translations.js';

const LanguageContext = createContext(null);

const STORAGE_KEY = 'parktop_lang';
const SUPPORTED = LANGUAGES.map(l => l.code);

function getInitialLanguage() {
  if (typeof window === 'undefined') return 'uz';
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved && SUPPORTED.includes(saved)) return saved;
  const nav = (navigator.language || '').slice(0, 2);
  if (SUPPORTED.includes(nav)) return nav;
  return 'uz';
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = lang;
    window.localStorage.setItem(STORAGE_KEY, lang);
  }, [lang]);

  const setLang = useCallback((code) => {
    if (SUPPORTED.includes(code)) setLangState(code);
  }, []);

  const t = useCallback((key) => {
    return translations[lang]?.[key] ?? translations.uz[key] ?? key;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t, languages: LANGUAGES }), [lang, setLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
