import { useState } from 'react';
import Button from '@/components/ui/button';
import { Card, Empty } from '@/components/ui/card';
import Dialog from '@/components/ui/dialog';
import { Field, SearchBox } from '@/components/ui/form';
import Spinner from '@/components/ui/spinner';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import PageHeader from '@/components/shared/PageHeader';
import { useLanguage } from '@/context/LanguageContext';
import { useUserData } from '@/context/UserDataContext';
import { useAction } from '@/hooks/useAction';
import { useApi } from '@/hooks/useApi';
import { apiDeleteCustomer, apiGetCustomers, apiSaveCustomer } from '@/services/CustomerService';
import type { CustomerListItem, CustomerSaveRequest } from '@/types/customer';
import { initials } from '@/utils/money';

const blank: CustomerSaveRequest = { customerName: '', mobileNo: '', email: '', addressLine: '', gstin: '' };

export default function Customers() {
  const { t } = useLanguage();
  const { canPage, money } = useUserData();
  const { run, busy } = useAction();
  const { data, reload } = useApi(apiGetCustomers);
  const [q, setQ] = useState('');
  const [form, setForm] = useState<CustomerSaveRequest | null>(null);
  const [removing, setRemoving] = useState<CustomerListItem | null>(null);
  if (!data) return <Spinner />;

  const rows = data.filter((c) => !q || [c.customerName, c.mobileNo, c.email].join(' ').toLowerCase().includes(q.toLowerCase()));
  const set = (k: keyof CustomerSaveRequest) => (e: React.ChangeEvent<HTMLInputElement>) => form && setForm({ ...form, [k]: e.target.value });

  return (
    <>
      <PageHeader
        title={t('customers.title')}
        subtitle={t('customers.count', { n: data.length })}
        actions={canPage('CUSTOMERS', 'add') && <Button icon="plus" onClick={() => setForm(blank)}>{t('customers.add')}</Button>}
      />
      <Card pad={false}>
        <div className="toolbar">
          <SearchBox value={q} onChange={setQ} placeholder={t('customers.search')} />
        </div>
        {rows.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('customers.name')}</th>
                  <th>{t('customers.mobile')}</th>
                  <th>GSTIN</th>
                  <th className="num">{t('nav.invoices')}</th>
                  <th className="num">{t('customers.billed')}</th>
                  <th className="num">{t('dash.colBalance')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.customerId}>
                    <td>
                      <div className="user-cell">
                        <div className="avatar sm alt">{initials(c.customerName)}</div>
                        <div>
                          <strong>{c.customerName}</strong>
                          {c.addressLine && <div className="muted small">{c.addressLine}</div>}
                        </div>
                      </div>
                    </td>
                    <td>{c.mobileNo || '—'}</td>
                    <td>{c.gstin || <span className="muted">—</span>}</td>
                    <td className="num">{c.billCount}</td>
                    <td className="num">{money(c.billed)}</td>
                    <td className={`num ${c.balance ? 'text-warning' : ''}`}>{money(c.balance)}</td>
                    <td className="row-actions">
                      {canPage('CUSTOMERS', 'edit') && (
                        <Button size="sm" variant="ghost" icon="edit" onClick={() => setForm({ ...c })}>
                          {t('common.edit')}
                        </Button>
                      )}
                      {canPage('CUSTOMERS', 'delete') && c.billCount === 0 && (
                        <Button size="sm" variant="ghost-danger" icon="trash" aria-label={t('common.delete')} onClick={() => setRemoving(c)} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="contact" title={t('customers.none')} />
        )}
      </Card>

      <Dialog
        open={!!form}
        title={form?.customerId ? t('customers.edit') : t('customers.add')}
        onClose={() => setForm(null)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setForm(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                if (form && (await run(() => apiSaveCustomer(form), t('customers.saved')))) {
                  setForm(null);
                  reload();
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
            <Field label={t('customers.name')}>
              <input className="input" value={form.customerName} onChange={set('customerName')} autoFocus />
            </Field>
            <div className="form-row">
              <Field label={t('customers.mobile')}>
                <input className="input" inputMode="tel" value={form.mobileNo} onChange={set('mobileNo')} />
              </Field>
              <Field label={t('customers.email')}>
                <input className="input" type="email" value={form.email} onChange={set('email')} />
              </Field>
            </div>
            <Field label={t('customers.address')}>
              <input className="input" value={form.addressLine} onChange={set('addressLine')} />
            </Field>
            <Field label="GSTIN">
              <input className="input" value={form.gstin} onChange={set('gstin')} />
            </Field>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!removing}
        danger
        title={t('customers.removeTitle')}
        message={removing?.customerName ?? ''}
        confirmLabel={t('common.delete')}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (removing && (await run(() => apiDeleteCustomer({ id: removing.customerId }), t('customers.removed')))) reload();
          setRemoving(null);
        }}
      />
    </>
  );
}
