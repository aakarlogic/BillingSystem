import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import Button from '@/components/ui/button';
import { Empty } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import Spinner from '@/components/ui/spinner';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import PageHeader from '@/components/shared/PageHeader';
import { useLanguage } from '@/context/LanguageContext';
import { useUserData } from '@/context/UserDataContext';
import { useAction } from '@/hooks/useAction';
import { useApi } from '@/hooks/useApi';
import { apiAddTable, apiGetTableFloor, apiRemoveTable } from '@/services/TableService';
import type { TableCard, TableStatus } from '@/types/table';
import { minutesSince } from '@/utils/formatDate';

const CSS_STATUS: Record<TableStatus, string> = { AVAILABLE: 'available', OCCUPIED: 'occupied', BILL_PENDING: 'pending' };

export default function Tables() {
  const { t } = useLanguage();
  const { canPage, can, money } = useUserData();
  const navigate = useNavigate();
  const { run } = useAction();
  const { data: tables, reload } = useApi(apiGetTableFloor);
  const [removing, setRemoving] = useState<TableCard | null>(null);
  const [, tick] = useState(0);

  // keep the "12 min" labels fresh
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  if (!tables) return <Spinner />;
  const canAddTable = canPage('TABLES', 'add');
  const canOrder = canPage('NEW_BILL', 'add');
  const counts = { AVAILABLE: 0, OCCUPIED: 0, BILL_PENDING: 0 };
  tables.forEach((x) => (counts[x.tableStatus] += 1));

  const open = (x: TableCard) => {
    if (x.tableStatus === 'AVAILABLE') {
      if (canOrder) navigate(`/billing/new?table=${x.tableId}`);
    } else if (x.tableStatus === 'OCCUPIED') {
      navigate(canOrder ? `/billing/bills/${x.currentOrderId}/edit` : `/billing/bills/${x.currentOrderId}`);
    } else {
      navigate(`/billing/bills/${x.currentOrderId}${can('PAYMENTS_TAKE') ? '?pay=1' : ''}`);
    }
  };

  const actionLabel = (s: TableStatus) =>
    s === 'AVAILABLE' ? t('tables.start') : s === 'OCCUPIED' ? t('tables.addItems') : can('PAYMENTS_TAKE') ? t('tables.takePayment') : t('tables.viewBill');

  const addTable = async () => {
    if (await run(apiAddTable, t('tables.added'))) reload();
  };

  return (
    <>
      <PageHeader
        title={t('tables.title')}
        subtitle={t('tables.sub')}
        actions={
          <>
            {canAddTable && (
              <Button variant="ghost" icon="plus" onClick={addTable}>
                {t('tables.add')}
              </Button>
            )}
            {canOrder && (
              <Button icon="invoice" onClick={() => navigate('/billing/new')}>
                {t('tables.takeaway')}
              </Button>
            )}
          </>
        }
      />

      {tables.length ? (
        <>
          <div className="floor-legend">
            {(['AVAILABLE', 'OCCUPIED', 'BILL_PENDING'] as TableStatus[]).map((s) => (
              <span key={s} className={`lg ${CSS_STATUS[s]}`}>
                <i /> {t(`statusCode.${s}`)} <b>{counts[s]}</b>
              </span>
            ))}
          </div>
          <div className="floor">
            {tables.map((x) => (
              <div key={x.tableId} className={`tcard ${CSS_STATUS[x.tableStatus]}`}>
                <button type="button" className="tcard-main" onClick={() => open(x)}>
                  <div className="tcard-top">
                    <span className="tcard-name">{x.tableName}</span>
                    <span className="tcard-status">{t(`statusCode.${x.tableStatus}`)}</span>
                  </div>
                  {x.currentOrderId ? (
                    <div className="tcard-body">
                      <div className="tcard-amount">{money(x.tableStatus === 'BILL_PENDING' ? x.orderBalance : x.orderTotal)}</div>
                      <div className="tcard-meta">
                        {t('tables.items', { n: x.itemCount })} · {t('tables.minutes', { n: minutesSince(x.since) })}
                      </div>
                    </div>
                  ) : (
                    <div className="tcard-body empty">
                      <Icon name="plus" size={26} />
                    </div>
                  )}
                  <div className="tcard-action">{actionLabel(x.tableStatus)} →</div>
                </button>
                {canPage('TABLES', 'delete') && x.tableStatus === 'AVAILABLE' && (
                  <button type="button" className="tcard-remove" onClick={() => setRemoving(x)} aria-label={t('tables.remove')} title={t('tables.remove')}>
                    <Icon name="x" size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <Empty
          icon="table"
          title={t('tables.noneTitle')}
          text={t('tables.noneText')}
          action={canAddTable && <Button icon="plus" onClick={addTable}>{t('tables.add')}</Button>}
        />
      )}

      <ConfirmDialog
        open={!!removing}
        danger
        title={t('tables.removeTitle', { name: removing?.tableName ?? '' })}
        message={t('tables.removeText')}
        confirmLabel={t('tables.remove')}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (removing && (await run(() => apiRemoveTable({ id: removing.tableId }), t('tables.removed')))) reload();
          setRemoving(null);
        }}
      />
    </>
  );
}
