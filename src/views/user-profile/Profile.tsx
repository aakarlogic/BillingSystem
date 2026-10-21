import { useState } from 'react';
import Button from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/form';
import { useToast } from '@/components/ui/toast';
import PageHeader from '@/components/shared/PageHeader';
import { useLanguage } from '@/context/LanguageContext';
import { useUserData } from '@/context/UserDataContext';
import { useAction } from '@/hooks/useAction';
import { apiChangePassword, apiUpdateProfile } from '@/services/AuthService';
import { PERMISSION_CODES } from '@/types/auth';
import type { LanguageCode } from '@/types/common';
import { LANGUAGES } from '@/utils/i18n';

export default function Profile() {
  const { t, setLang } = useLanguage();
  const { user, setUser, can } = useUserData();
  const toast = useToast();
  const { run, busy } = useAction();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [language, setLanguage] = useState<LanguageCode>(user?.preferredLanguage ?? 'mr');
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  if (!user) return null;

  return (
    <>
      <PageHeader title={t('nav.profile')} subtitle={user.businessName ?? t('nav.platformConsole')} />
      <div className="grid-2">
        <Card title={t('profile.details')}>
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              const saved = await run(() => apiUpdateProfile({ fullName, mobileNo: user.mobileNo, preferredLanguage: language }), t('profile.saved'));
              if (saved) {
                setUser(saved);
                setLang(language);
              }
            }}
          >
            <Field label={t('team.name')}>
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </Field>
            <Field label={t('login.mobile')}>
              <input className="input" value={user.mobileNo} disabled />
            </Field>
            <Field label={t('team.colRole')}>
              <input className="input" value={t(`roleCode.${user.roleCode}`)} disabled />
            </Field>
            <Field label={t('settings.language')}>
              <select className="input" value={language} onChange={(e) => setLanguage(e.target.value as LanguageCode)}>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </Field>
            <div>
              <Button type="submit" disabled={busy}>
                {t('common.save')}
              </Button>
            </div>
          </form>
        </Card>
        <Card title={t('profile.password')}>
          <form
            className="form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (pw.next !== pw.confirm) {
                toast.error(t('profile.noMatch'));
                return;
              }
              if (await run(() => apiChangePassword({ currentPassword: pw.current, newPassword: pw.next }), t('profile.passwordChanged'))) {
                setPw({ current: '', next: '', confirm: '' });
              }
            }}
          >
            <Field label={t('profile.current')}>
              <input className="input" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
            </Field>
            <Field label={t('profile.new')} hint={t('team.passwordHint')}>
              <input className="input" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
            </Field>
            <Field label={t('profile.confirm')}>
              <input className="input" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
            </Field>
            <div>
              <Button type="submit" disabled={busy}>
                {t('profile.password')}
              </Button>
            </div>
          </form>
        </Card>
      </div>
      {user.roleCode !== 'SUPER_ADMIN' && (
        <Card title={t('profile.canDo')}>
          <div className="perm-grid">
            {PERMISSION_CODES.map((p) => (
              <div key={p} className={`perm ${can(p) ? 'yes' : 'no'}`}>
                <span>{can(p) ? '✓' : '—'}</span>
                {t(`perm.${p}.label`)}
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
