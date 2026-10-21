import { useEffect, useState } from 'react';
import Button from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Field } from '@/components/ui/form';
import Spinner from '@/components/ui/spinner';
import PageHeader from '@/components/shared/PageHeader';
import { useLanguage } from '@/context/LanguageContext';
import { useUserData } from '@/context/UserDataContext';
import { useAction } from '@/hooks/useAction';
import { useApi } from '@/hooks/useApi';
import { apiGetPlans, apiGetSettings, apiSaveSettings } from '@/services/BusinessService';
import type { SettingsSaveRequest } from '@/types/business';
import type { LanguageCode } from '@/types/common';
import { LANGUAGES } from '@/utils/i18n';

export default function Settings() {
  const { t } = useLanguage();
  const { user, setUser, money } = useUserData();
  const { run, busy } = useAction();
  const settings = useApi(apiGetSettings);
  const plans = useApi(apiGetPlans);
  const [f, setF] = useState<SettingsSaveRequest | null>(null);

  useEffect(() => {
    if (settings.data && !f) setF({ ...settings.data });
  }, [settings.data, f]);

  if (!f || !settings.data || !plans.data) return <Spinner />;
  const b = settings.data;
  const plan = plans.data.find((p) => p.planId === b.planId);
  const set = <K extends keyof SettingsSaveRequest>(k: K, v: SettingsSaveRequest[K]) => setF({ ...f, [k]: v });

  return (
    <>
      <PageHeader title={t('nav.settings')} subtitle={t('settings.sub')} />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const saved = await run(() => apiSaveSettings(f), t('settings.saved'));
          if (saved && user) setUser({ ...user, businessName: saved.businessName });
        }}
      >
        <div className="grid-2">
          <Card title={t('settings.business')}>
            <div className="form">
              <Field label={t('settings.name')}>
                <input className="input" value={f.businessName} onChange={(e) => set('businessName', e.target.value)} />
              </Field>
              <div className="form-row">
                <Field label={t('customers.mobile')}>
                  <input className="input" value={f.mobileNo} onChange={(e) => set('mobileNo', e.target.value)} />
                </Field>
                <Field label={t('customers.email')}>
                  <input className="input" value={f.email} onChange={(e) => set('email', e.target.value)} />
                </Field>
              </div>
              <Field label={t('customers.address')}>
                <textarea className="input" rows={2} value={f.addressLine} onChange={(e) => set('addressLine', e.target.value)} />
              </Field>
              <Field label="GSTIN">
                <input className="input" value={f.gstin} onChange={(e) => set('gstin', e.target.value)} />
              </Field>
            </div>
          </Card>
          <Card title={t('settings.billRules')}>
            <div className="form">
              <div className="form-row">
                <Field label={t('settings.prefix')} hint={t('settings.nextBill', { no: `${f.billPrefix}${String(b.nextBillNo).padStart(5, '0')}` })}>
                  <input className="input" value={f.billPrefix} onChange={(e) => set('billPrefix', e.target.value)} />
                </Field>
                <Field label={t('settings.defaultTax')}>
                  <select className="input" value={f.defaultTaxRate} onChange={(e) => set('defaultTaxRate', Number(e.target.value))}>
                    {[0, 5, 12, 18, 28].map((r) => (
                      <option key={r} value={r}>
                        {r}%
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="form-row">
                <Field label={t('settings.chargeLabel')}>
                  <input className="input" value={f.serviceChargeLabel} onChange={(e) => set('serviceChargeLabel', e.target.value)} />
                </Field>
                <Field label={t('settings.chargePct')} hint={t('settings.chargeOff')}>
                  <input className="input" type="number" min="0" max="20" step="0.5" value={f.serviceChargePct} onChange={(e) => set('serviceChargePct', Number(e.target.value))} />
                </Field>
              </div>
              <Field label={t('settings.language')}>
                <select className="input" value={f.defaultLanguage} onChange={(e) => set('defaultLanguage', e.target.value as LanguageCode)}>
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('settings.footer')}>
                <input className="input" value={f.billFooterNote} onChange={(e) => set('billFooterNote', e.target.value)} />
              </Field>
            </div>
          </Card>
        </div>
        <Card title={t('settings.plan')}>
          <p style={{ margin: 0 }}>
            <strong>{plan?.planName}</strong> · {money(plan?.monthlyPrice ?? 0)}/{t('settings.month')} · {t('settings.upTo', { n: plan?.maxUsers ?? 0 })}{' '}
            <span className="muted">{t('settings.planHelp')}</span>
          </p>
        </Card>
        <div className="form-actions">
          <Button variant="ghost" onClick={() => setF({ ...b })}>
            {t('common.reset')}
          </Button>
          <Button type="submit" disabled={busy}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </>
  );
}
