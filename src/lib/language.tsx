import React, { createContext, useContext, useEffect, useState } from 'react';
import { UI_TEXT, type Lang } from '@/lib/i18n';

interface LanguageContextValue {
  lang: Lang;
  isAr: boolean;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (typeof UI_TEXT)['ar'] | (typeof UI_TEXT)['en'];
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = 'manga_studio_lang';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'ar';
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === 'en' || saved === 'ar' ? saved : 'ar';
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const value: LanguageContextValue = {
    lang,
    isAr: lang === 'ar',
    setLang: setLangState,
    toggleLang: () => setLangState((prev) => (prev === 'ar' ? 'en' : 'ar')),
    t: UI_TEXT[lang],
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      lang: 'ar',
      isAr: true,
      setLang: () => {},
      toggleLang: () => {},
      t: UI_TEXT.ar,
    };
  }
  return ctx;
}
