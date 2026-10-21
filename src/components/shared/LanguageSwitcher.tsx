import { useLanguage } from '@/context/LanguageContext';
import type { LanguageCode } from '@/types/common';
import { LANGUAGES } from '@/utils/i18n';

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang, t } = useLanguage();
  return (
    <label className={`lang ${compact ? 'compact' : ''}`} title={t('common.language')}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
      </svg>
      <select value={lang} onChange={(e) => setLang(e.target.value as LanguageCode)} aria-label={t('common.language')}>
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {compact ? l.short : l.label}
          </option>
        ))}
      </select>
    </label>
  );
}
