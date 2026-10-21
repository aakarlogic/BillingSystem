import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import Icon from '@/components/ui/icon';
import Button from '@/components/ui/button';
import { Field } from '@/components/ui/form';
import { useToast } from '@/components/ui/toast';
import { useLanguage } from '@/context/LanguageContext';
import appConfig from '@/configs/app.config';
import { apiResetDemo } from '@/services/AuthService';
import type { RoleCode } from '@/types/auth';
import useAuth from '@/utils/hooks/useAuth';
import AuthShell from './AuthShell';

/** One-tap demo logins (mock backend only). */
const DEMO: { role: RoleCode; loginId: string; password: string; noteKey: string; icon: string }[] = [
  { role: 'OWNER', loginId: '9800000001', password: 'owner123', noteKey: 'login.demo.restAdmin', icon: 'chart' },
  { role: 'STAFF', loginId: '9800000002', password: 'waiter123', noteKey: 'login.demo.waiter', icon: 'invoice' },
  { role: 'SUPER_ADMIN', loginId: '9000000000', password: 'admin123', noteKey: 'login.demo.super', icon: 'layers' },
];

export default function Login() {
  const { t } = useLanguage();
  const toast = useToast();
  const location = useLocation();
  const { signIn } = useAuth();
  const from = (location.state as { from?: string } | null)?.from;
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (creds = { loginId: loginId.trim(), password }) => {
    setError('');
    setBusy(true);
    const result = await signIn(creds, from);
    setBusy(false);
    if (result.status === 'failed') setError(result.message);
  };

  return (
    <AuthShell>
      {appConfig.useMockApi ? (
        <>
          <h2>{t('login.chooseTitle')}</h2>
          <p className="muted">{t('login.chooseSub')}</p>
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="role-pick">
            {DEMO.map((d) => (
              <button
                type="button"
                key={d.role}
                className={`role-btn role-btn-${d.role}`}
                disabled={busy}
                onClick={() => submit({ loginId: d.loginId, password: d.password })}
              >
                <span className="role-btn-icon">
                  <Icon name={d.icon} size={22} />
                </span>
                <span className="role-btn-text">
                  <strong>{t(`roleCode.${d.role}`)}</strong>
                  <small>{t(d.noteKey)}</small>
                </span>
                <span className="role-btn-go">{t('login.open')} →</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            className="link-btn"
            onClick={async () => {
              await apiResetDemo();
              toast.info(t('login.resetDone'));
            }}
          >
            {t('login.reset')}
          </button>
        </>
      ) : (
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <h2>{t('login.title')}</h2>
          <p className="muted">{t('login.sub')}</p>
          <Field label={t('login.loginId')}>
            <input
              className="input"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              autoComplete="username"
              inputMode="email"
              autoCapitalize="none"
              required
            />
          </Field>
          <Field label={t('login.password')}>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          <Link to="/auth/forgot-password" className="auth-link auth-link-right">
            {t('login.forgot')}
          </Link>
          {error && <div className="alert alert-danger">{error}</div>}
          <Button type="submit" className="btn-block" disabled={busy}>
            {t('login.submit')}
          </Button>
          <p className="auth-switch">
            {t('login.noAccount')} <Link to="/auth/register">{t('login.signUp')}</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
