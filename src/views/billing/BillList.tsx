import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import Button from '@/components/ui/button';
import { Card, Empty } from '@/components/ui/card';
import { SearchBox, Tabs } from '@/components/ui/form';
import Spinner from '@/components/ui/spinner';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { useLanguage } from '@/context/LanguageContext';
import { useUserData } from '@/context/UserDataContext';
import { useApi } from '@/hooks/useApi';
import { apiGetOrders } from '@/services/OrderService';
import type { OrderListItem } from '@/types/order';
import { formatDateTime } from '@/utils/formatDate';
import { downloadCsv } from '@/utils/money';

type TabKey = 'ALL' | 'OPEN' | 'UNPAID' | 'PAID' | 'CANCELLED';

const MATCH: Record<TabKey, (o: OrderListItem) => boolean> = {
  ALL: () => true,
  OPEN: (o) => o.orderStatus === 'OPEN',
  UNPAID: (o) => o.orderStatus === 'BILLED' || o.orderStatus === 'PART_PAID',
  PAID: (o) => o.orderStatus === 'PAID',
  CANCELLED: (o) => o.orderStatus === 'CANCELLED' || o.orderStatus === 'REFUNDED',
};

export default function BillList() {
  const { t } = useLanguage();
  const { user, canPage, money } = useUserData();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('status') as TabKey) in MATCH ? (params.get('status') as TabKey) : 'ALL';
  const [q, setQ] = useState('');
  const [mine, setMine] = useState(false);
  const { data, error } = useApi(apiGetOrders);

  if (error) return <div className="error-box">{error}</div>;
  if (!data) return <Spinner />;

  const base = data.filter((o) => !mine || o.waiterName === user?.fullName);
  const rows = base
    .filter(MATCH[tab])
    .filter((o) => !q || [o.billNo, o.customerName, o.tableName, o.waiterName].join(' ').toLowerCase().includes(q.toLowerCase()));

  const tabs = (Object.keys(MATCH) as TabKey[]).map((value) => ({ value, label: t(`bills.tab.${value}`), count: base.filter(MATCH[value]).length }));

  const exportCsv = () =>
    downloadCsv('bills.csv', [
      ['Bill no', 'Table / customer', 'Date', 'Status', 'Subtotal', 'Discount', 'GST', 'Service', 'Total', 'Paid', 'Balance', 'Staff'],
      ...rows.map((o) => [
        o.billNo ?? '', o.tableName ?? o.customerName, o.billedDate ?? o.insertedDate, o.orderStatus, o.subTotal, o.discountAmount,
        o.taxAmount, o.serviceChargeAmount, o.totalAmount, o.paidAmount, o.balanceAmount, o.waiterName,
      ]),
    ]);

  return (
    <>
      <PageHeader
        title={t('nav.invoices')}
        subtitle={t('bills.count', { n: data.length })}
        actions={
          <>
            {canPage('BILLS', 'export') && (
              <Button variant="ghost" icon="download" onClick={exportCsv}>
                {t('common.export')}
              </Button>
            )}
            {canPage('NEW_BILL', 'add') && (
              <Link to="/billing/new">
                <Button icon="plus">{t('nav.newInvoice')}</Button>
              </Link>
            )}
          </>
        }
      />
      <Card pad={false}>
        <Tabs tabs={tabs} value={tab} onChange={(v) => setParams(v === 'ALL' ? {} : { status: v }, { replace: true })} />
        <div className="toolbar">
          <SearchBox value={q} onChange={setQ} placeholder={t('bills.search')} />
          <label className="check">
            <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> {t('bills.mine')}
          </label>
        </div>
        {rows.length ? (
          <div className="table-wrap">
            <table className="table clickable">
              <thead>
                <tr>
                  <th>{t('dash.colInvoice')}</th>
                  <th>{t('dash.colCustomer')}</th>
                  <th>{t('dash.colDate')}</th>
                  <th className="num">{t('dash.colTotal')}</th>
                  <th className="num">{t('dash.colBalance')}</th>
                  <th>{t('dash.colStatus')}</th>
                  <th>{t('bills.staff')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.orderId} onClick={() => navigate(`/billing/bills/${o.orderId}`)}>
                    <td>
                      <Link className="link" to={`/billing/bills/${o.orderId}`} onClick={(e) => e.stopPropagation()}>
                        {o.billNo ?? t('statusCode.OPEN')}
                      </Link>
                    </td>
                    <td>{o.tableName ?? o.customerName}</td>
                    <td className="nowrap">{formatDateTime(o.billedDate ?? o.insertedDate)}</td>
                    <td className="num">{money(o.totalAmount)}</td>
                    <td className="num">{o.balanceAmount ? money(o.balanceAmount) : '—'}</td>
                    <td>
                      <StatusBadge status={o.orderStatus} />
                    </td>
                    <td className="muted">{o.waiterName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title={t('bills.none')} text={q ? t('bills.tryOther') : undefined} />
        )}
      </Card>
    </>
  );
}
