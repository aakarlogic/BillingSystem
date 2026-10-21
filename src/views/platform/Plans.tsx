import { useState } from 'react';
import Button from '@/components/ui/button';
import Dialog from '@/components/ui/dialog';
import { Field } from '@/components/ui/form';
import Spinner from '@/components/ui/spinner';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import PageHeader from '@/components/shared/PageHeader';
import { useLanguage } from '@/context/LanguageContext';
import { useAction } from '@/hooks/useAction';
import { useApi } from '@/hooks/useApi';
import { apiDeletePlan, apiGetBusinesses, apiGetPlans, apiSavePlan } from '@/services/BusinessService';
import type { Plan, PlanSaveRequest } from '@/types/business';
import { formatMoney } from '@/utils/money';

export default function Plans() {
  const { t } = useLanguage();
  const { run, busy } = useAction();
  const plans = useApi(apiGetPlans);
  const businesses = useApi(apiGetBusinesses);
  const [form, setForm] = useState<PlanSaveRequest | null>(null);
  const [removing, setRemoving] = useState<Plan | null>(null);
  if (!plans.data || !businesses.data) return <Spinner />;
  const set = <K extends keyof PlanSaveRequest>(k: K, v: PlanSaveRequest[K]) => form && setForm({ ...form, [k]: v });

  return (
    <>
      <PageHeader
        title={t('nav.plans')}
        subtitle={t('platform.plansSub')}
        actions={
          <Button icon="plus" onClick={() => setForm({ planCode: '', planName: '', description: '', monthlyPrice: 0, maxUsers: 4, maxTables: null })}>
            {t('platform.newPlan')}
          </Button>
        }
      />
      <div className="plan-grid">
        {plans.data.map((p) => {
          const using = businesses.data?.filter((b) => b.planId === p.planId).length ?? 0;
          return (
            <div key={p.planId} className="plan-card">
              <div className="plan-name">{p.planName}</div>
              <div className="plan-price">
                {formatMoney(p.monthlyPrice, 'INR').replace(/\.00$/, '')}
                <span>/{t('settings.month')}</span>
              </div>
              <p className="muted">{p.description}</p>
              <ul>
                <li>{t('settings.upTo', { n: p.maxUsers })}</li>
                <li>{p.maxTables ? t('platform.tables', { n: p.maxTables }) : t('platform.unlimitedTables')}</li>
              </ul>
              <div className="plan-foot">
                <span className="muted small">{t('platform.usedBy', { n: using })}</span>
                <div className="row-actions">
                  <Button size="sm" variant="ghost" icon="edit" onClick={() => setForm({ ...p })}>
                    {t('common.edit')}
                  </Button>
                  <Button size="sm" variant="ghost-danger" icon="trash" aria-label={t('common.delete')} onClick={() => setRemoving(p)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog
        open={!!form}
        title={form?.planId ? t('platform.editPlan') : t('platform.newPlan')}
        onClose={() => setForm(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setForm(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                if (form && (await run(() => apiSavePlan(form), t('platform.planSaved')))) {
                  setForm(null);
                  plans.reload();
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
            <Field label={t('platform.planName')}>
              <input className="input" value={form.planName} onChange={(e) => set('planName', e.target.value)} autoFocus />
            </Field>
            <div className="form-row three">
              <Field label={`${t('platform.price')} (₹)`}>
                <input className="input" type="number" min="0" value={form.monthlyPrice} onChange={(e) => set('monthlyPrice', Number(e.target.value))} />
              </Field>
              <Field label={t('platform.people')}>
                <input className="input" type="number" min="1" value={form.maxUsers} onChange={(e) => set('maxUsers', Number(e.target.value))} />
              </Field>
              <Field label={t('nav.tables')} hint={t('platform.emptyUnlimited')}>
                <input className="input" type="number" min="1" value={form.maxTables ?? ''} onChange={(e) => set('maxTables', e.target.value ? Number(e.target.value) : null)} />
              </Field>
            </div>
            <Field label={t('platform.description')}>
              <input className="input" value={form.description} onChange={(e) => set('description', e.target.value)} />
            </Field>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!removing}
        danger
        title={t('platform.deletePlan')}
        message={removing?.planName ?? ''}
        confirmLabel={t('common.delete')}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (removing && (await run(() => apiDeletePlan({ id: removing.planId }), t('platform.planDeleted')))) plans.reload();
          setRemoving(null);
        }}
      />
    </>
  );
}
