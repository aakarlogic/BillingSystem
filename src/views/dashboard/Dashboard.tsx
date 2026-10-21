import { Link, useNavigate } from 'react-router';
import Button from '@/components/ui/button';
import { Card, Empty, Stat } from '@/components/ui/card';
import { BarChart, HBars } from '@/components/ui/chart';
import Icon from '@/components/ui/icon';
import Spinner from '@/components/ui/spinner';
import PageHeader from '@/components/shared/PageHeader';
import StatusBadge from '@/components/shared/StatusBadge';
import { useLanguage } from '@/context/LanguageContext';
import { useUserData } from '@/context/UserDataContext';
import { useApi } from '@/hooks/useApi';
import { apiGetBusinesses, apiGetPlatformStats } from '@/services/BusinessService';
import { apiGetDashboard } from '@/services/ReportService';
import type { DashboardSummary } from '@/types/report';
import { formatDate } from '@/utils/formatDate';
import { formatMoney } from '@/utils/money';

export default function Dashboard() {
  const { user } = useUserData();
  return user?.roleCode === 'SUPER_ADMIN' ? <PlatformDashboard /> : <BusinessDashboard />;
}

function PlatformDashboard() {
  const { t } = useLanguage();
  const { user } = useUserData();
  const stats = useApi(apiGetPlatformStats);
  const list = useApi(apiGetBusinesses);
  const inr = (v: number) => formatMoney(v, 'INR');
  if (!stats.data || !list.data) return <Spinner />;
  const s = stats.data;

  return (
    <>
      <PageHeader
        title={t('dash.welcome', { name: user?.fullName.split(' ')[0] ?? '' })}
        subtitle={t('dash.platformSub')}
        actions={
          <Link to="/platform/businesses">
            <Button icon="plus">{t('dash.addBusiness')}</Button>
          </Link>
        }
      />
      <div className="stats">
        <Stat icon="building" label={t('dash.businesses')} value={s.businesses} sub={t('dash.activeSuspended', { a: s.activeBusinesses, s: s.suspendedBusinesses })} />
        <Stat icon="users" tone="info" label={t('dash.usersCount')} value={s.users} />
        <Stat icon="wallet" tone="success" label={t('dash.mrr')} value={inr(s.monthlyRevenue)} sub={t('dash.fromPlans')} />
        <Stat icon="card" tone="warning" label={t('dash.processed')} value={inr(s.collected)} sub={t('dash.issuedCount', { n: s.bills })} />
      </div>
      <div className="grid-2">
        <Card title={t('dash.collectionsBy')}>
          <HBars data={s.byBusiness} format={inr} />
        </Card>
        <Card title={t('dash.byPlan')}>
          <HBars data={s.byPlan} format={String} />
        </Card>
      </div>
      <Card title={t('dash.businesses')} pad={false} actions={<Link to="/platform/businesses" className="link">{t('dash.manage')}</Link>}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t('dash.businesses')}</th>
                <th>{t('nav.plans')}</th>
                <th>{t('nav.team')}</th>
                <th className="num">{t('nav.invoices')}</th>
                <th className="num">{t('dash.processed')}</th>
                <th>{t('dash.colStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((b) => (
                <tr key={b.businessId}>
                  <td>
                    <strong>{b.businessName}</strong>
                    <div className="muted small">{b.ownerName}</div>
                  </td>
                  <td>{b.planName}</td>
                  <td>
                    {b.userCount} / {b.maxUsers}
                  </td>
                  <td className="num">{b.billCount}</td>
                  <td className="num">{inr(b.collected)}</td>
                  <td>
                    <StatusBadge status={b.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function QuickActions({ d }: { d: DashboardSummary }) {
  const { t } = useLanguage();
  const { canPage, money } = useUserData();
  const navigate = useNavigate();
  const items = [
    canPage('NEW_BILL', 'add') && { key: 'new', primary: true, icon: 'plus', title: t('quick.newBill'), sub: t('quick.newBillSub'), go: '/billing/new' },
    canPage('TABLES') && {
      key: 'tables',
      icon: 'table',
      title: t('quick.tables'),
      sub: d.totalTables ? t('quick.tablesSub', { busy: d.busyTables, total: d.totalTables }) : t('quick.noTables'),
      go: '/tables',
    },
    canPage('BILLS') && { key: 'open', icon: 'edit', title: t('quick.openOrders'), sub: t('quick.openOrdersSub', { n: d.openOrders }), go: '/billing/bills?status=OPEN' },
    canPage('PAYMENTS') && { key: 'cash', icon: 'wallet', title: t('quick.todayCash'), sub: money(d.collectedToday), go: '/payments' },
  ].filter((x): x is { key: string; primary?: boolean; icon: string; title: string; sub: string; go: string } => !!x);

  return (
    <div className="quick">
      {items.map((q) => (
        <button key={q.key} type="button" className={`quick-btn ${q.primary ? 'primary' : ''}`} onClick={() => navigate(q.go)}>
          <span className="qi">
            <Icon name={q.icon} size={22} />
          </span>
          <span>
            <strong>{q.title}</strong>
            <br />
            <small>{q.sub}</small>
          </span>
        </button>
      ))}
    </div>
  );
}

function BusinessDashboard() {
  const { t } = useLanguage();
  const { user, money } = useUserData();
  const { data: d, error } = useApi(apiGetDashboard);
  if (error) return <div className="error-box">{error}</div>;
  if (!d) return <Spinner />;

  return (
    <>
      <PageHeader title={t('dash.hello', { name: user?.fullName.split(' ')[0] ?? '' })} subtitle={d.ownOnly ? t('dash.ownSub') : t('dash.bizSub')} />
      <QuickActions d={d} />
      <div className="stats">
        <Stat icon="invoice" label={d.ownOnly ? t('dash.mySalesToday') : t('dash.salesToday')} value={money(d.salesToday)} sub={t('dash.bills', { n: d.billsToday })} />
        <Stat icon="wallet" tone="success" label={t('dash.collectedToday')} value={money(d.collectedToday)} />
        <Stat icon="clock" tone="warning" label={t('dash.pending')} value={money(d.pendingAmount)} sub={t('dash.unpaid', { n: d.pendingCount })} />
        <Stat icon="edit" tone="info" label={t('dash.drafts')} value={d.openOrders} sub={t('dash.notIssued')} />
      </div>
      <div className="help-card">
        <div className="help-icon">
          <Icon name="help" size={22} />
        </div>
        <div>
          <h3>{t('dash.guideTitle')}</h3>
          <p>{t('dash.guideText')}</p>
        </div>
        <Link to="/guide">
          <Button variant="secondary">{t('dash.guideBtn')}</Button>
        </Link>
      </div>
      <div className="grid-2-1">
        <Card title={t('dash.last14')}>
          <BarChart data={d.last14Days} format={money} />
        </Card>
        <Card title={t('dash.topItems')}>
          {d.topItems.length ? <HBars data={d.topItems} format={money} /> : <p className="muted">{t('dash.noSales')}</p>}
        </Card>
      </div>
      <Card title={t('dash.recent')} pad={false} actions={<Link to="/billing/bills" className="link">{t('dash.viewAll')}</Link>}>
        {d.recentOrders.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('dash.colInvoice')}</th>
                  <th>{t('dash.colCustomer')}</th>
                  <th>{t('dash.colDate')}</th>
                  <th className="num">{t('dash.colTotal')}</th>
                  <th className="num">{t('dash.colBalance')}</th>
                  <th>{t('dash.colStatus')}</th>
                </tr>
              </thead>
              <tbody>
                {d.recentOrders.map((o) => (
                  <tr key={o.orderId}>
                    <td>
                      <Link className="link" to={`/billing/bills/${o.orderId}`}>
                        {o.billNo ?? t('statusCode.OPEN')}
                      </Link>
                    </td>
                    <td>{o.tableName ?? o.customerName}</td>
                    <td>{formatDate(o.billedDate ?? o.insertedDate)}</td>
                    <td className="num">{money(o.totalAmount)}</td>
                    <td className="num">{money(o.balanceAmount)}</td>
                    <td>
                      <StatusBadge status={o.orderStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title={t('dash.noInvoices')} text={t('dash.noInvoicesText')} />
        )}
      </Card>
    </>
  );
}
