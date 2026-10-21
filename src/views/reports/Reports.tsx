import { useState } from 'react';
import { Link } from 'react-router';
import Button from '@/components/ui/button';
import { Card, Stat } from '@/components/ui/card';
import { BarChart, HBars } from '@/components/ui/chart';
import { Tabs } from '@/components/ui/form';
import Spinner from '@/components/ui/spinner';
import PageHeader from '@/components/shared/PageHeader';
import { useLanguage } from '@/context/LanguageContext';
import { useUserData } from '@/context/UserDataContext';
import { useApi } from '@/hooks/useApi';
import { apiGetSalesReport } from '@/services/ReportService';
import { dayKey, formatDate, shiftDay } from '@/utils/formatDate';
import { downloadCsv, formatQty } from '@/utils/money';

type Preset = 'today' | 'yesterday' | 'week' | 'month' | 'd30' | '';

function range(p: Exclude<Preset, ''>): [string, string] {
  const today = dayKey();
  if (p === 'today') return [today, today];
  if (p === 'yesterday') return [shiftDay(today, -1), shiftDay(today, -1)];
  if (p === 'week') return [shiftDay(today, -6), today];
  if (p === 'month') return [`${today.slice(0, 8)}01`, today];
  return [shiftDay(today, -29), today];
}

export default function Reports() {
  const { t } = useLanguage();
  const { canPage, money } = useUserData();
  const [preset, setPreset] = useState<Preset>('today');
  const [[from, to], setRange] = useState<[string, string]>(range('today'));
  const [itemSort, setItemSort] = useState<'value' | 'qty'>('value');
  const { data: r } = useApi(() => apiGetSalesReport({ fromDate: from, toDate: to }), [from, to]);

  const pick = (p: Exclude<Preset, ''>) => {
    setPreset(p);
    setRange(range(p));
  };

  const exportCsv = () =>
    r &&
    downloadCsv(`report-${from}-to-${to}.csv`, [
      ['Report', `${from} to ${to}`],
      [],
      ['Bills', r.billCount],
      ['Gross sales', r.grossSales],
      ['Discounts', r.discount],
      ['GST', r.tax],
      ['Service charge', r.serviceCharge],
      ['Cash', r.cashTotal],
      ['UPI', r.upiTotal],
      ['Refunded', r.refunded],
      ['Cancelled bills', r.cancelledCount],
      ['Unpaid (all days)', r.unpaidTotal],
      [],
      ['Dish', 'Quantity', 'Sales'],
      ...r.topByValue.map((i) => [i.label, r.topByQty.find((q) => q.label === i.label)?.value ?? '', i.value]),
    ]);

  return (
    <>
      <PageHeader
        title={t('nav.reports')}
        subtitle={`${formatDate(from)} – ${formatDate(to)}`}
        actions={
          canPage('REPORTS', 'export') && (
            <Button variant="ghost" icon="download" onClick={exportCsv}>
              {t('common.export')}
            </Button>
          )
        }
      />
      <Card>
        <div className="range-bar">
          <div className="chips">
            {(['today', 'yesterday', 'week', 'month', 'd30'] as const).map((k) => (
              <button key={k} type="button" className={`chip ${preset === k ? 'active' : ''}`} onClick={() => pick(k)}>
                {t(`reports.preset.${k}`)}
              </button>
            ))}
          </div>
          <div className="range-inputs">
            <input className="input" type="date" value={from} max={to} onChange={(e) => (setPreset(''), setRange([e.target.value, to]))} aria-label={t('reports.from')} />
            <span className="muted">–</span>
            <input className="input" type="date" value={to} min={from} onChange={(e) => (setPreset(''), setRange([from, e.target.value]))} aria-label={t('reports.to')} />
          </div>
        </div>
      </Card>

      {!r ? (
        <Spinner />
      ) : (
        <>
          <div className="stats">
            <Stat icon="chart" label={t('reports.sales')} value={money(r.grossSales)} sub={t('dash.bills', { n: r.billCount })} />
            <Stat icon="wallet" tone="success" label={t('pay.modeCash')} value={money(r.cashTotal)} sub={t('reports.matchDrawer')} />
            <Stat icon="card" tone="info" label={t('pay.modeUpi')} value={money(r.upiTotal)} />
            <Stat icon="clock" tone="warning" label={t('reports.unpaid')} value={money(r.unpaidTotal)} sub={t('reports.unpaidSub', { n: r.unpaid.length })} />
          </div>

          <Card title={t('reports.daily')}>
            <BarChart data={r.days} format={money} />
          </Card>

          <div className="grid-2">
            <Card title={t('reports.breakdown')}>
              <div className="totals">
                <div>
                  <span>{t('order.subtotal')}</span>
                  <span>{money(r.subTotal)}</span>
                </div>
                <div className="neg">
                  <span>{t('order.discount')}</span>
                  <span>−{money(r.discount)}</span>
                </div>
                <div>
                  <span>GST</span>
                  <span>{money(r.tax)}</span>
                </div>
                <div>
                  <span>{t('reports.service')}</span>
                  <span>{money(r.serviceCharge)}</span>
                </div>
                <div className="grand">
                  <span>{t('reports.sales')}</span>
                  <span>{money(r.grossSales)}</span>
                </div>
                <div className="neg">
                  <span>{t('reports.refunds')}</span>
                  <span>−{money(r.refunded)}</span>
                </div>
              </div>
            </Card>
            <Card
              title={t('reports.bestSellers')}
              actions={
                <Tabs
                  tabs={[
                    { value: 'value', label: t('reports.byValue') },
                    { value: 'qty', label: t('reports.byQty') },
                  ]}
                  value={itemSort}
                  onChange={setItemSort}
                />
              }
            >
              {r.topByValue.length ? (
                <HBars data={itemSort === 'value' ? r.topByValue : r.topByQty} format={itemSort === 'value' ? money : formatQty} />
              ) : (
                <p className="muted">{t('dash.noSales')}</p>
              )}
            </Card>
          </div>

          <div className="grid-2">
            <Card title={t('reports.byStaff')}>
              {r.byStaff.length ? <HBars data={r.byStaff} format={money} /> : <p className="muted">{t('dash.noSales')}</p>}
            </Card>
            <Card title={t('reports.unpaid')} pad={false}>
              <table className="table">
                <thead>
                  <tr>
                    <th>{t('dash.colInvoice')}</th>
                    <th>{t('dash.colCustomer')}</th>
                    <th className="num">{t('dash.colBalance')}</th>
                  </tr>
                </thead>
                <tbody>
                  {r.unpaid.slice(0, 10).map((o) => (
                    <tr key={o.orderId}>
                      <td>
                        <Link className="link" to={`/billing/bills/${o.orderId}`}>
                          {o.billNo}
                        </Link>
                      </td>
                      <td>{o.tableName ?? o.customerName}</td>
                      <td className="num">{money(o.balanceAmount)}</td>
                    </tr>
                  ))}
                  {!r.unpaid.length && (
                    <tr>
                      <td colSpan={3} className="muted center">
                        {t('reports.nothingDue')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </div>

          <Card title={t('reports.cancelled', { n: r.cancelledCount })} pad={false}>
            <table className="table">
              <thead>
                <tr>
                  <th>{t('dash.colInvoice')}</th>
                  <th>{t('common.reason')}</th>
                  <th className="num">{t('dash.colTotal')}</th>
                </tr>
              </thead>
              <tbody>
                {r.cancelled.map((o) => (
                  <tr key={o.orderId}>
                    <td>
                      <Link className="link" to={`/billing/bills/${o.orderId}`}>
                        {o.billNo ?? o.customerName}
                      </Link>
                    </td>
                    <td>{o.cancelReason}</td>
                    <td className="num">{money(o.totalAmount)}</td>
                  </tr>
                ))}
                {!r.cancelled.length && (
                  <tr>
                    <td colSpan={3} className="muted center">
                      {t('reports.noCancelled')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </>
  );
}
