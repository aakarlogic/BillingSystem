import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import Button from '@/components/ui/button';
import { Field } from '@/components/ui/form';
import { useToast } from '@/components/ui/toast';
import { useLanguage } from '@/context/LanguageContext';
import { apiRegister, apiSendOtp } from '@/services/AuthService';
import type { SendOtpData } from '@/types/auth';
import type { BusinessType } from '@/types/business';
import useAuth from '@/utils/hooks/useAuth';
import AuthShell, { cleanMobile, MIN_PASSWORD, OtpField } from './AuthShell';

const BUSINESS_TYPES: BusinessType[] = ['RESTAURANT', 'CAFE', 'SHOP', 'SERVICE'];

/** Owner sign-up: details, then an OTP to the mobile, then the account is made and signed in. */
export default function Register() {
  const { t } = useLanguage();
  const toast = useToast();
  const { enter } = useAuth();
  const [form, setForm] = useState({
    businessName: '',
    businessType: 'RESTAURANT' as BusinessType,
    ownerName: '',
    mobileNo: '',
    email: '',
    password: '',
  });
  const [otpInfo, setOtpInfo] = useState<SendOtpData | null>(null);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const mobile = cleanMobile(form.mobileNo);

  const sendOtp = async (e?: FormEvent) => {
    e?.preventDefault();
    setError('');
    if (!mobile) return setError(t('signup.mobileInvalid'));
    if (form.password.length < MIN_PASSWORD) return setError(t('signup.passwordShort'));
    setBusy(true);
    try {
      setOtpInfo(await apiSendOtp({ mobileNo: mobile, purpose: 'REGISTER' }));
      setOtp('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await apiRegister({
        businessName: form.businessName.trim(),
        businessType: form.businessType,
        ownerName: form.ownerName.trim(),
        mobileNo: mobile,
        email: form.email.trim() || null,
        password: form.password,
        otp,
      });
      toast.success(t('signup.created'));
      await enter(data);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  if (otpInfo) {
    return (
      <AuthShell>
        <form className="form" onSubmit={create}>
          <h2>{t('signup.otpTitle')}</h2>
          <p className="muted">{t('signup.otpSent', { mobile, minutes: otpInfo.validMinutes })}</p>
          {otpInfo.devOtp && <div className="alert alert-info">{t('signup.devOtp', { otp: otpInfo.devOtp })}</div>}
          <OtpField value={otp} onChange={setOtp} />
          {error && <div className="alert alert-danger">{error}</div>}
          <Button type="submit" className="btn-block" disabled={busy || otp.length < 4}>
            {t('signup.create')}
          </Button>
          <div className="auth-row">
            <button type="button" className="link-btn" onClick={() => setOtpInfo(null)} disabled={busy}>
              {t('signup.change')}
            </button>
            <button type="button" className="link-btn" onClick={() => sendOtp()} disabled={busy}>
              {t('signup.resend')}
            </button>
          </div>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form className="form" onSubmit={sendOtp}>
        <h2>{t('signup.title')}</h2>
        <p className="muted">{t('signup.sub')}</p>
        <Field label={t('signup.businessName')}>
          <input className="input" value={form.businessName} onChange={(e) => set({ businessName: e.target.value })} maxLength={150} required />
        </Field>
        <Field label={t('signup.businessType')}>
          <select className="input" value={form.businessType} onChange={(e) => set({ businessType: e.target.value as BusinessType })}>
            {BUSINESS_TYPES.map((bt) => (
              <option key={bt} value={bt}>
                {t(`platform.type.${bt}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t('signup.ownerName')}>
          <input className="input" value={form.ownerName} onChange={(e) => set({ ownerName: e.target.value })} autoComplete="name" maxLength={100} required />
        </Field>
        <Field label={t('login.mobile')}>
          <input
            className="input"
            type="tel"
            value={form.mobileNo}
            onChange={(e) => set({ mobileNo: e.target.value })}
            inputMode="tel"
            autoComplete="tel"
            placeholder="98XXXXXXXX"
            required
          />
        </Field>
        <Field label={`${t('signup.email')} (${t('common.optional')})`}>
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={(e) => set({ email: e.target.value })}
            autoComplete="email"
            autoCapitalize="none"
          />
        </Field>
        <Field label={t('login.password')} hint={t('signup.passwordHint')}>
          <input
            className="input"
            type="password"
            value={form.password}
            onChange={(e) => set({ password: e.target.value })}
            autoComplete="new-password"
            minLength={MIN_PASSWORD}
            required
          />
        </Field>
        {error && <div className="alert alert-danger">{error}</div>}
        <Button type="submit" className="btn-block" disabled={busy}>
          {t('signup.sendOtp')}
        </Button>
        <p className="auth-switch">
          {t('signup.haveAccount')} <Link to="/auth/login">{t('login.submit')}</Link>
        </p>
      </form>
    </AuthShell>
  );
}
