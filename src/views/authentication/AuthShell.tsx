import type { ReactNode } from 'react';
import { Link } from 'react-router';
import Icon from '@/components/ui/icon';
import { Field } from '@/components/ui/form';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { useLanguage } from '@/context/LanguageContext';

/** Shared frame of the sign-in, sign-up and forgot-password screens: brand panel + form card. */
export default function AuthShell({ children }: { children: ReactNode }) {
  const { t, tl } = useLanguage();
  return (
    <div className="login">
      <div className="login-hero">
        <Link to="/" className="brand">
          <div className="brand-mark">प</div>
          <div>
            <div className="brand-name">पावती</div>
            <div className="tagline">{t('brand.tagline')}</div>
          </div>
        </Link>
        <h1>{t('login.heroTitle')}</h1>
        <p>{t('login.heroSub')}</p>
        <ul className="hero-list">
          {tl<string[]>('login.heroPoints').map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <Link to="/guide" className="hero-guide">
          <Icon name="help" size={18} /> {t('nav.guide')} →
        </Link>
      </div>

      <div className="login-panel">
        <div className="login-card">
          <div className="login-top">
            <Link to="/" className="back-link">
              <Icon name="back" size={15} /> {t('common.backHome')}
            </Link>
            <LanguageSwitcher compact />
          </div>
          <div className="login-mobile-brand">
            <div className="brand-mark">प</div>
            <div>
              <div className="brand-name">पावती</div>
              <div className="muted small">{t('brand.tagline')}</div>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

/** "9876543210", "+91 98765 43210" → "9876543210"; anything else → "" (same rule as the API). */
export function cleanMobile(text: string): string {
  let digits = text.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  return /^\d{10}$/.test(digits) ? digits : '';
}

export const MIN_PASSWORD = 6;

/** Big digits-only box for the SMS code. */
export function OtpField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useLanguage();
  return (
    <Field label={t('signup.otp')}>
      <input
        className="input otp-input"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        autoFocus
        required
      />
    </Field>
  );
}
