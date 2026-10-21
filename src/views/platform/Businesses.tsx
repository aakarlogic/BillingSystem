import { useState } from 'react';
import Button from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Dialog from '@/components/ui/dialog';
import { Field, SearchBox } from '@/components/ui/form';
import Spinner from '@/components/ui/spinner';
import { ReasonDialog } from '@/components/shared/ConfirmDialog';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { useLanguage } from '@/context/LanguageContext';
import { useAction } from '@/hooks/useAction';
import { useApi } from '@/hooks/useApi';
import { apiGetBusinesses, apiGetPlans, apiSaveBusiness, apiSetBusinessStatus } from '@/services/BusinessService';
import type { BusinessListItem, BusinessSaveRequest, BusinessType } from '@/types/business';
import { formatDate } from '@/utils/formatDate';
import { formatMoney } from '@/utils/money';

const TYPES: BusinessType[] = ['RESTAURANT', 'CAFE', 'SHOP', 'SERVICE'];

export default function Businesses() {
  const { t } = useLanguage();
  const { run, busy } = useAction();
  const list = useApi(apiGetBusinesses);
  const plans = useApi(apiGetPlans);
  const [q, setQ] = useState('');
  const [form, setForm] = useState<BusinessSaveRequest | null>(null);
  const [pausing, setPausing] = useState<BusinessListItem | null>(null);
  if (!list.data || !plans.data) return <Spinner />;

  const rows = list.data.filter((b) => !q || `${b.businessName} ${b.ownerName}`.toLowerCase().includes(q.toLowerCase()));
  const blank: BusinessSaveRequest = {
    businessName: '', businessType: 'RESTAURANT', mobileNo: '', email: '', addressLine: '', gstin: '', billPrefix: '',
    planId: plans.data[0]?.planId ?? 0, ownerName: '', ownerMobileNo: '', ownerPassword: '',
  };
  const set = <K extends keyof BusinessSaveRequest>(k: K, v: BusinessSaveRequest[K]) => form && setForm({ ...form, [k]: v });
  const inr = (v: number) => formatMoney(v, 'INR');

  return (
    <>
      <PageHeader title={t('nav.businesses')} subtitle={t('platform.businessesSub')} actions={<Button icon="plus" onClick={() => setForm(blank)}>{t('dash.addBusiness')}</Button>} />
      <Card pad={false}>
        <div className="toolbar">
          <SearchBox value={q} onChange={setQ} placeholder={t('platform.search')} />
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t('dash.businesses')}</th>
                <th>{t('nav.plans')}</th>
                <th>{t('nav.team')}</th>
                <th className="num">{t('nav.invoices')}</th>
                <th className="num">{t('dash.processed')}</th>
                <th>{t('platform.since')}</th>
                <th>{t('dash.colStatus')}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.businessId}>
                  <td>
                    <strong>{b.businessName}</strong>
                    <div className="muted small">
                      {t(`platform.type.${b.businessType}`)} · {b.ownerName}
                    </div>
                  </td>
                  <td>
                    {b.planName}
                    <div className="muted small">{inr(plans.data?.find((p) => p.planId === b.planId)?.monthlyPrice ?? 0)}/{t('settings.month')}</div>
                  </td>
                  <td>
                    {b.userCount} / {b.maxUsers}
                  </td>
                  <td className="num">{b.billCount}</td>
                  <td className="num">{inr(b.collected)}</td>
                  <td className="nowrap">{formatDate(b.insertedDate)}</td>
                  <td>
                    <StatusBadge status={b.status} />
                    {b.statusReason && <div className="muted small">{b.statusReason}</div>}
                  </td>
                  <td className="row-actions">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon="edit"
                      onClick={() =>
                        setForm({
                          businessId: b.businessId, businessName: b.businessName, businessType: b.businessType, mobileNo: b.mobileNo,
                          email: b.email, addressLine: b.addressLine, gstin: b.gstin, billPrefix: b.billPrefix, planId: b.planId,
                        })
                      }
                    >
                      {t('common.edit')}
                    </Button>
                    {b.status === 'ACTIVE' ? (
                      <Button size="sm" variant="ghost-danger" onClick={() => setPausing(b)}>
                        {t('platform.pause')}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () =>
                          (await run(() => apiSetBusinessStatus({ businessId: b.businessId, status: 'ACTIVE', reason: '' }), t('platform.activated'))) && list.reload()
                        }
                      >
                        {t('platform.activate')}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog
        open={!!form}
        wide
        title={form?.businessId ? t('platform.editBusiness') : t('dash.addBusiness')}
        onClose={() => setForm(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setForm(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                if (form && (await run(() => apiSaveBusiness(form), form.businessId ? t('platform.saved') : t('platform.created')))) {
                  setForm(null);
                  list.reload();
                }
              }}
            >
              {t('common.save')}
            </Button>
          </>
        }
      >
        {form && (
          <div className="form">
            <div className="form-row">
              <Field label={t('settings.name')}>
                <input className="input" value={form.businessName} onChange={(e) => set('businessName', e.target.value)} autoFocus />
              </Field>
              <Field label={t('platform.typeLabel')}>
                <select className="input" value={form.businessType} onChange={(e) => set('businessType', e.target.value as BusinessType)}>
                  {TYPES.map((x) => (
                    <option key={x} value={x}>
                      {t(`platform.type.${x}`)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="form-row">
              <Field label={t('nav.plans')}>
                <select className="input" value={form.planId} onChange={(e) => set('planId', Number(e.target.value))}>
                  {plans.data?.map((p) => (
                    <option key={p.planId} value={p.planId}>
                      {p.planName} · {inr(p.monthlyPrice)} · {t('settings.upTo', { n: p.maxUsers })}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('settings.prefix')}>
                <input className="input" value={form.billPrefix} onChange={(e) => set('billPrefix', e.target.value)} placeholder="SGC-" />
              </Field>
            </div>
            <div className="form-row">
              <Field label={t('customers.mobile')}>
                <input className="input" value={form.mobileNo} onChange={(e) => set('mobileNo', e.target.value)} />
              </Field>
              <Field label="GSTIN">
                <input className="input" value={form.gstin} onChange={(e) => set('gstin', e.target.value)} />
              </Field>
            </div>
            <Field label={t('customers.address')}>
              <input className="input" value={form.addressLine} onChange={(e) => set('addressLine', e.target.value)} />
            </Field>
            {!form.businessId && (
              <>
                <h3 className="form-section">{t('platform.ownerLogin')}</h3>
                <div className="form-row">
                  <Field label={t('team.name')}>
                    <input className="input" value={form.ownerName ?? ''} onChange={(e) => set('ownerName', e.target.value)} />
                  </Field>
                  <Field label={t('login.mobile')}>
                    <input className="input" inputMode="tel" value={form.ownerMobileNo ?? ''} onChange={(e) => set('ownerMobileNo', e.target.value)} />
                  </Field>
                </div>
                <Field label={t('login.password')} hint={t('team.passwordHint')}>
                  <input className="input" type="password" value={form.ownerPassword ?? ''} onChange={(e) => set('ownerPassword', e.target.value)} autoComplete="new-password" />
                </Field>
              </>
            )}
          </div>
        )}
      </Dialog>

      <ReasonDialog
        open={!!pausing}
        title={t('platform.pauseTitle', { name: pausing?.businessName ?? '' })}
        message={t('platform.pauseText')}
        confirmLabel={t('platform.pause')}
        onClose={() => setPausing(null)}
        onConfirm={async (reason) => {
          if (pausing && (await run(() => apiSetBusinessStatus({ businessId: pausing.businessId, status: 'SUSPENDED', reason }), t('platform.paused')))) {
            setPausing(null);
            list.reload();
          }
        }}
      />
    </>
  );
}
