import en from './languages/en';
import enApp from './languages/en-app';
import hi from './languages/hi';
import hiApp from './languages/hi-app';
import mr from './languages/mr';
import mrApp from './languages/mr-app';
import type { Dictionary, Entry } from './languages/types';
import type { LanguageCode } from '@/types/common';

/** Website text (en.ts …) + app page text (en-app.ts …), app text winning on clashes. */
export function mergeDictionaries(base: Dictionary, extra: Dictionary): Dictionary {
  const out: Dictionary = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    const prev = out[k];
    out[k] =
      prev && typeof prev === 'object' && !Array.isArray(prev) && typeof v === 'object' && !Array.isArray(v)
        ? mergeDictionaries(prev as Dictionary, v as Dictionary)
        : v;
  }
  return out;
}

export const LANGUAGES: { code: LanguageCode; label: string; short: string }[] = [
  { code: 'mr', label: 'मराठी', short: 'म' },
  { code: 'hi', label: 'हिन्दी', short: 'हि' },
  { code: 'en', label: 'English', short: 'EN' },
];

const DICTS: Record<LanguageCode, Dictionary> = {
  en: mergeDictionaries(en as Dictionary, enApp),
  hi: mergeDictionaries(hi, hiApp),
  mr: mergeDictionaries(mr, mrApp),
};
export const LANGUAGE_STORAGE_KEY = 'pavti_lang';

function lookup(dict: Dictionary, key: string): Entry | undefined {
  let node: Entry | undefined = dict;
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && !Array.isArray(node)) node = node[part];
    else return undefined;
  }
  return node;
}

/** Text for a key in the chosen language, falling back to English, then to the key itself. */
export function translate(lang: LanguageCode, key: string, vars?: Record<string, string | number>): string {
  const value = lookup(DICTS[lang], key) ?? lookup(DICTS.en, key);
  if (typeof value !== 'string' && typeof value !== 'number') return key;
  const text = String(value);
  return vars ? text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? '')) : text;
}

/** Lists and objects (e.g. landing page features) for the chosen language. */
export function translateList<T>(lang: LanguageCode, key: string): T {
  return (lookup(DICTS[lang], key) ?? lookup(DICTS.en, key) ?? []) as T;
}

export function readSavedLanguage(fallback: LanguageCode): LanguageCode {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as LanguageCode | null;
    if (saved && saved in DICTS) return saved;
  } catch {
    /* ignore */
  }
  return fallback;
}
