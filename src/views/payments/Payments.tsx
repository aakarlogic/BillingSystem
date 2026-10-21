import { useState } from 'react';
import { Link } from 'react-router';
import Button from '@/components/ui/button';
import { Card, Empty, Stat } from '@/components/ui/card';
import { SearchBox } from '@/components/ui/form';
import Spinner from '@/components/ui/spinner';
import PageHeader from '@/components/shared/PageHeader';
import { Badge } from '@/components/shared/StatusBadge';
import { useLanguage } from '@/context/LanguageContext';
import { useUserData } from '@/context/UserDataContext';
import { useApi } from '@/hooks/useApi';
import { apiGetPayments } from '@/services/PaymentService';
import type { PaymentMode } from '@/types/common';
import { toPaise, toRupees } from '@/utils/billing';
import { dayKey, formatDateTime } from '@/utils/formatDate';
import { downloadCsv } from '@/utils/money';

export default function Payments() {
  const { t } = useLanguage();
  const { canPage, money } = useUserData();
  const { data } = useApi(apiGetPayments);
  const [q, setQ] = useState('');
  const [mode, setMode] = useState<PaymentMode | ''>('');
  const [todayOnly, setTodayOnly] = useState(true);
  if (!data) return <Spinner />;

  const today = dayKey();
  const rows = data.filter(
    (p) =>
      (!todayOnly || dayKey(p.receivedDate) === today) &&
      (!mode || p.paymentMode === mode) &&
      (!q || [p.billNo, p.receivedByName, p.reason].join(' ').toLowerCase().includes(q.toLowerCase())),
  );
  const net = (m: PaymentMode) =>
    toRupees(rows.filter((p) => p.paymentMode === m).reduce((s, p) => s + (p.paymentType === 'REFUND' ? -1 : 1) * toPaise(p.amount), 0));

  return (
    <>
      <PageHeader
        title={t('nav.payments')}
        subtitle={t('payments.sub')}
        actions={
          canPage('PAYMENTS', 'export') && (
            <Button
              variant="ghost"
              icon="download"
              onClick={() =>
                downloadCsv('payments.csv', [
                  ['Date', 'Bill', 'Type', 'Mode', 'Amount', 'Cash given', 'Change', 'By', 'Reason'],
                  ...rows.map((p) => [
                    p.receivedDate, p.billNo, p.paymentType, p.paymentMode, (p.paymentType === 'REFUND' ? -1 : 1) * p.amount,
                    p.cashReceived, p.changeReturned, p.receivedByName, p.reason,
                  ]),
                ])
              }
            >
              {t('common.export')}
            </Button>
          )
        }
      />
      <div className="stats three">
        <Stat icon="wallet" tone="success" label={t('pay.modeCash')} value={money(net('CASH'))} sub={todayOnly ? t('payments.today') : t('payments.allDays')} />
        <Stat icon="card" tone="info" label={t('pay.modeUpi')} value={money(net('UPI'))} />
        <Stat icon="chart" label={t('payments.total')} value={money(net('CASH') + net('UPI'))} />
      </div>
      <Card pad={false}>
        <div className="toolbar">
          <SearchBox value={q} onChange={setQ} placeholder={t('payments.search')} />
          <select className="input" style={{ maxWidth: 170 }} value={mode} onChange={(e) => setMode(e.target.value as PaymentMode | '')}>
            <option value="">{t('payments.allModes')}</option>
            <option value="CASH">{t('pay.modeCash')}</option>
            <option value="UPI">{t('pay.modeUpi')}</option>
          </select>
          <label className="check">
            <input type="checkbox" checked={todayOnly} onChange={(e) => setTodayOnly(e.target.checked)} /> {t('payments.todayOnly')}
          </label>
        </div>
        {rows.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('dash.colDate')}</th>
                  <th>{t('dash.colInvoice')}</th>
                  <th>{t('payments.mode')}</th>
                  <th>{t('bills.staff')}</th>
                  <th className="num">{t('bills.amount')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.paymentId}>
                    <td className="nowrap">{formatDateTime(p.receivedDate)}</td>
                    <td>
                      <Link className="link" to={`/billing/bills/${p.orderId}`}>
                        {p.billNo}
                      </Link>
                    </td>
                    <td>{p.paymentMode === 'CASH' ? t('pay.modeCash') : t('pay.modeUpi')}</td>
                    <td>{p.receivedByName}</td>
                    <td className={`num ${p.paymentType === 'REFUND' ? 'text-danger' : ''}`}>
                      {p.paymentType === 'REFUND' ? '−' : ''}
                      {money(p.amount)}
                    </td>
                    <td>{p.paymentType === 'REFUND' ? <Badge tone="danger">{t('payments.refund')}</Badge> : p.isRefunded ? <Badge tone="danger">{t('statusCode.REFUNDED')}</Badge> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon="card" title={t('payments.none')} />
        )}
      </Card>
    </>
  );
}
