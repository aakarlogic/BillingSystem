import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import Button from '@/components/ui/button';
import { Field } from '@/components/ui/form';
import { useToast } from '@/components/ui/toast';
import { useLanguage } from '@/context/LanguageContext';
import appConfig from '@/configs/app.config';
import { apiResetPassword, apiSendOtp } from '@/services/AuthService';
import type { SendOtpData } from '@/types/auth';
import AuthShell, { cleanMobile, MIN_PASSWORD, OtpField } from './AuthShell';

/** Forgot password: mobile, then OTP + new password, then back to sign in. */
export default function ForgotPassword() {
  const { t } = useLanguage();
  const toast = useToast();
  const navigate = useNavigate();
  const [mobileText, setMobileText] = useState('');
  const [otpInfo, setOtpInfo] = useState<SendOtpData | null>(null);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const mobile = cleanMobile(mobileText);

  const sendOtp = async (e?: FormEvent) => {
    e?.preventDefault();
    setError('');
    if (!mobile) return setError(t('signup.mobileInvalid'));
    setBusy(true);
    try {
      setOtpInfo(await apiSendOtp({ mobileNo: mobile, purpose: 'RESET_PASSWORD' }));
      setOtp('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < MIN_PASSWORD) return setError(t('signup.passwordShort'));
    if (password !== confirm) return setError(t('forgot.mismatch'));
    setBusy(true);
    try {
      await apiResetPassword({ mobileNo: mobile, otp, newPassword: password });
      toast.success(t('forgot.done'));
      navigate(appConfig.unAuthenticatedEntryPath, { replace: true });
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  if (!otpInfo) {
    return (
      <AuthShell>
        <form className="form" onSubmit={sendOtp}>
          <h2>{t('forgot.title')}</h2>
          <p className="muted">{t('forgot.sub')}</p>
          <Field label={t('login.mobile')}>
            <input
              className="input"
              type="tel"
              value={mobileText}
              onChange={(e) => setMobileText(e.target.value)}
              inputMode="tel"
              autoComplete="tel"
              placeholder="98XXXXXXXX"
              required
            />
          </Field>
          {error && <div className="alert alert-danger">{error}</div>}
          <Button type="submit" className="btn-block" disabled={busy}>
            {t('signup.sendOtp')}
          </Button>
          <p className="auth-switch">
            <Link to="/auth/login">← {t('forgot.back')}</Link>
          </p>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form className="form" onSubmit={reset}>
        <h2>{t('forgot.title')}</h2>
        <p className="muted">{t('signup.otpSent', { mobile, minutes: otpInfo.validMinutes })}</p>
        {otpInfo.devOtp && <div className="alert alert-info">{t('signup.devOtp', { otp: otpInfo.devOtp })}</div>}
        <OtpField value={otp} onChange={setOtp} />
        <Field label={t('forgot.newPassword')} hint={t('signup.passwordHint')}>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={MIN_PASSWORD}
            required
          />
        </Field>
        <Field label={t('forgot.confirm')}>
          <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />
        </Field>
        {error && <div className="alert alert-danger">{error}</div>}
        <Button type="submit" className="btn-block" disabled={busy || otp.length < 4}>
          {t('forgot.submit')}
        </Button>
        <div className="auth-row">
          <button type="button" className="link-btn" onClick={() => setOtpInfo(null)} disabled={busy}>
            {t('signup.changeMobile')}
          </button>
          <button type="button" className="link-btn" onClick={() => sendOtp()} disabled={busy}>
            {t('signup.resend')}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
