import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import Button from '@/components/ui/button';
import { Card, Empty } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import Spinner from '@/components/ui/spinner';
import { ReasonDialog } from '@/components/shared/ConfirmDialog';
import StatusBadge, { Badge } from '@/components/shared/StatusBadge';
import { useLanguage } from '@/context/LanguageContext';
import { useUserData } from '@/context/UserDataContext';
import { useAction } from '@/hooks/useAction';
import { useApi } from '@/hooks/useApi';
import { apiGetSettings } from '@/services/BusinessService';
import { apiCancelOrder, apiGetOrder, apiMakeBill } from '@/services/OrderService';
import { apiRefundPayment } from '@/services/PaymentService';
import type { Payment } from '@/types/order';
import { formatDate, formatDateTime } from '@/utils/formatDate';
import { formatQty } from '@/utils/money';
import PaymentDialog from './PaymentDialog';

export default function BillView() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { t } = useLanguage();
  const { user, can, canPage, money } = useUserData();
  const { run } = useAction();
  const detail = useApi(() => apiGetOrder({ id: Number(id) }), [id]);
  const settings = useApi(apiGetSettings);
  const [payOpen, setPayOpen] = useState(params.get('pay') === '1');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [refund, setRefund] = useState<Payment | null>(null);

  useEffect(() => {
    if (params.get('pay')) setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (detail.error) {
    return (
      <Empty
        icon="invoice"
        title={t('bills.notFound')}
        text={detail.error}
        action={
          <Link to="/billing/bills">
            <Button>{t('nav.invoices')}</Button>
          </Link>
        }
      />
    );
  }
  if (!detail.data || !settings.data) return <Spinner />;

  const { order: o, payments } = detail.data;
  const biz = settings.data;
  const isOpen = o.orderStatus === 'OPEN';
  const payable = ['BILLED', 'PART_PAID', 'REFUNDED'].includes(o.orderStatus) && o.balanceAmount > 0;
  const shownBillTo = o.tableName ?? o.customerName;

  return (
    <>
      <div className="page-header no-print">
        <div>
          <Link to="/billing/bills" className="back-link">
            <Icon name="back" size={15} /> {t('nav.invoices')}
          </Link>
          <h1>
            {o.billNo ?? shownBillTo} <StatusBadge status={o.orderStatus} />
          </h1>
          <p className="muted">
            {shownBillTo} · {o.waiterName} · {formatDateTime(o.insertedDate)}
          </p>
        </div>
        <div className="page-actions">
          {isOpen && canPage('NEW_BILL', 'add') && (
            <>
              <Link to={`/billing/bills/${o.orderId}/edit`}>
                <Button variant="ghost" icon="edit">
                  {t('bills.addItems')}
                </Button>
              </Link>
              <Button onClick={() => run(() => apiMakeBill({ id: o.orderId }), t('bills.made')).then(detail.reload)}>{t('order.bill')}</Button>
            </>
          )}
          {!isOpen && (
            <Button variant="ghost" icon="printer" onClick={() => window.print()}>
              {t('bills.print')}
            </Button>
          )}
          {o.orderStatus !== 'CANCELLED' && o.paidAmount === 0 && can('BILLS_CANCEL') && (
            <Button variant="ghost-danger" onClick={() => setCancelOpen(true)}>
              {t('bills.cancel')}
            </Button>
          )}
          {payable && can('PAYMENTS_TAKE') && (
            <Button icon="wallet" onClick={() => setPayOpen(true)}>
              {t('pay.markPaid')}
            </Button>
          )}
        </div>
      </div>

      {o.orderStatus === 'CANCELLED' && (
        <div className="alert alert-danger no-print">
          {t('bills.cancelledBecause')}: {o.cancelReason}
        </div>
      )}

      <div className="invoice-layout">
        <div className="paper print-area">
          <div className="paper-head">
            <div>
              <div className="paper-brand">{biz.businessName}</div>
              <div className="muted small pre">{biz.addressLine}</div>
              <div className="muted small">{[biz.mobileNo, biz.email].filter(Boolean).join(' · ')}</div>
              {biz.gstin && <div className="muted small">GSTIN: {biz.gstin}</div>}
            </div>
            <div className="paper-meta">
              <div className="paper-title">{isOpen ? t('bills.orderSlip') : t('bills.taxInvoice')}</div>
              <div>
                <span>{t('bills.billNo')}</span>
                <strong>{o.billNo ?? '—'}</strong>
              </div>
              <div>
                <span>{t('dash.colDate')}</span>
                <strong>{formatDate(o.billedDate ?? o.insertedDate)}</strong>
              </div>
              <div>
                <span>{o.tableName ? t('bills.table') : t('bills.customer')}</span>
                <strong>{shownBillTo}</strong>
              </div>
            </div>
          </div>

          <table className="paper-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{t('bills.item')}</th>
                <th className="num">{t('order.qty')}</th>
                <th className="num">{t('order.price')}</th>
                <th className="num">GST</th>
                <th className="num">{t('bills.amount')}</th>
              </tr>
            </thead>
            <tbody>
              {o.items.map((l, i) => (
                <tr key={l.orderItemId}>
                  <td>{i + 1}</td>
                  <td>{l.itemName}</td>
                  <td className="num">
                    {formatQty(l.quantity)} {l.unitName}
                  </td>
                  <td className="num">{money(l.unitPrice)}</td>
                  <td className="num">{l.taxRate}%</td>
                  <td className="num">{money(l.lineAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="paper-foot">
            <div className="paper-notes">
              {o.notes && (
                <>
                  <div className="label">{t('order.notes')}</div>
                  <p className="pre">{o.notes}</p>
                </>
              )}
              {biz.billFooterNote && <p className="muted">{biz.billFooterNote}</p>}
            </div>
            <div className="totals">
              <div>
                <span>{t('order.subtotal')}</span>
                <span>{money(o.subTotal)}</span>
              </div>
              {o.discountAmount > 0 && (
                <div className="neg">
                  <span>
                    {t('order.discount')}
                    {o.discountType === 'PERCENT' ? ` (${o.discountValue}%)` : ''}
                  </span>
                  <span>−{money(o.discountAmount)}</span>
                </div>
              )}
              {o.taxLines.map((x) => (
                <div key={x.taxRate}>
                  <span>
                    GST {x.taxRate}% · {money(x.taxable)}
                  </span>
                  <span>{money(x.tax)}</span>
                </div>
              ))}
              {o.serviceChargeAmount > 0 && (
                <div>
                  <span>
                    {biz.serviceChargeLabel} ({o.serviceChargePct}%)
                  </span>
                  <span>{money(o.serviceChargeAmount)}</span>
                </div>
              )}
              <div className="grand">
                <span>{t('order.total')}</span>
                <span>{money(o.totalAmount)}</span>
              </div>
              {!isOpen && o.orderStatus !== 'CANCELLED' && (
                <>
                  <div>
                    <span>{t('bills.paid')}</span>
                    <span>{money(o.paidAmount)}</span>
                  </div>
                  <div className="due">
                    <span>{t('bills.balance')}</span>
                    <span>{money(o.balanceAmount)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="no-print">
          <Card title={t('nav.payments')} pad={false}>
            {payments.length ? (
              <ul className="pay-list">
                {payments.map((p) => (
                  <li key={p.paymentId} className={p.paymentType === 'REFUND' ? 'refund' : ''}>
                    <div>
                      <strong>
                        {p.paymentType === 'REFUND' ? '−' : ''}
                        {money(p.amount)}
                      </strong>{' '}
                      <span className="muted">{p.paymentMode === 'CASH' ? t('pay.modeCash') : t('pay.modeUpi')}</span>{' '}
                      {p.isRefunded && <Badge tone="danger">{t('statusCode.REFUNDED')}</Badge>}
                      <div className="muted small">
                        {formatDateTime(p.receivedDate)} · {p.receivedByName}
                        {p.changeReturned ? ` · ${t('pay.changeGiven', { amount: money(p.changeReturned) })}` : ''}
                        {p.reason && ` · ${p.reason}`}
                      </div>
                    </div>
                    {p.paymentType === 'PAYMENT' && !p.isRefunded && user?.roleCode === 'OWNER' && (
                      <Button size="sm" variant="ghost-danger" icon="refund" onClick={() => setRefund(p)}>
                        {t('bills.refund')}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted pad">{t('bills.noPayments')}</p>
            )}
            {!isOpen && o.orderStatus !== 'CANCELLED' && (
              <div className="pay-summary">
                <div>
                  <span>{t('order.total')}</span>
                  <strong>{money(o.totalAmount)}</strong>
                </div>
                <div>
                  <span>{t('bills.paid')}</span>
                  <strong>{money(o.paidAmount)}</strong>
                </div>
                <div>
                  <span>{t('bills.balance')}</span>
                  <strong className={o.balanceAmount ? 'text-warning' : 'text-success'}>{money(o.balanceAmount)}</strong>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      <PaymentDialog
        open={payOpen}
        order={o}
        onClose={() => setPayOpen(false)}
        onPaid={() => {
          setPayOpen(false);
          detail.reload();
        }}
      />
      <ReasonDialog
        open={cancelOpen}
        title={t('bills.cancelTitle', { name: o.billNo ?? shownBillTo })}
        message={t('bills.cancelText')}
        confirmLabel={t('bills.cancel')}
        onClose={() => setCancelOpen(false)}
        onConfirm={async (reason) => {
          if (await run(() => apiCancelOrder({ id: o.orderId, reason }), t('bills.cancelled'))) {
            setCancelOpen(false);
            detail.reload();
          }
        }}
      />
      <ReasonDialog
        open={!!refund}
        title={t('bills.refundTitle', { amount: refund ? money(refund.amount) : '' })}
        message={t('bills.refundText')}
        confirmLabel={t('bills.refund')}
        onClose={() => setRefund(null)}
        onConfirm={async (reason) => {
          if (refund && (await run(() => apiRefundPayment({ paymentId: refund.paymentId, reason }), t('bills.refunded')))) {
            setRefund(null);
            detail.reload();
          }
        }}
      />
    </>
  );
}
