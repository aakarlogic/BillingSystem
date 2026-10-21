import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import appConfig from '@/configs/app.config';
import type { LanguageCode } from '@/types/common';
import { LANGUAGE_STORAGE_KEY, readSavedLanguage, translate, translateList } from '@/utils/i18n';

type LanguageContextValue = {
  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  tl: <T>(key: string) => T;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<LanguageCode>(() => readSavedLanguage(appConfig.defaultLanguage));

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  const t = useCallback((key: string, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
  const tl = useCallback(<T,>(key: string) => translateList<T>(lang, key), [lang]);
  const value = useMemo(() => ({ lang, setLang, t, tl }), [lang, t, tl]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
