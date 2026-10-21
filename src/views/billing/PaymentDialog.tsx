import { useEffect, useMemo, useState } from 'react';
import Dialog from '@/components/ui/dialog';
import { Field } from '@/components/ui/form';
import { useLanguage } from '@/context/LanguageContext';
import { useUserData } from '@/context/UserDataContext';
import { useAction } from '@/hooks/useAction';
import { apiSavePayment } from '@/services/PaymentService';
import type { PaymentMode } from '@/types/common';
import type { Order } from '@/types/order';
import { toPaise, toRupees } from '@/utils/billing';
import { newRequestKey } from '@/utils/money';

type PaymentDialogProps = { open: boolean; order: Order; onClose: () => void; onPaid: () => void };

/**
 * The customer pays outside the app (cash or UPI scanner). Staff only taps how
 * they paid. Optional: cash given → change to return.
 */
export default function PaymentDialog({ open, order, onClose, onPaid }: PaymentDialogProps) {
  const { t } = useLanguage();
  const { money } = useUserData();
  const { run, busy } = useAction();
  const [given, setGiven] = useState('');
  const [partial, setPartial] = useState(false);
  const [amount, setAmount] = useState('');
  const [requestKey, setRequestKey] = useState(newRequestKey);

  useEffect(() => {
    if (open) {
      setGiven('');
      setPartial(false);
      setAmount(String(order.balanceAmount));
      setRequestKey(newRequestKey()); // a fresh key per opening blocks double taps
    }
  }, [open, order.balanceAmount]);

  const due = partial ? Number(amount) || 0 : order.balanceAmount;
  const change = given ? toRupees(toPaise(given) - toPaise(due)) : null;
  // round notes a customer is likely to hand over
  const notes = useMemo(() => {
    const p = toPaise(due);
    return [...new Set([p, ...[100, 200, 500, 2000].map((n) => Math.ceil(p / (n * 100)) * n * 100)])]
      .filter((v) => v >= p && v > 0)
      .sort((a, b) => a - b)
      .slice(0, 4)
      .map(toRupees);
  }, [due]);

  const paid = async (paymentMode: PaymentMode) => {
    const ok = await run(
      () =>
        apiSavePayment({
          orderId: order.orderId,
          paymentMode,
          amount: due,
          cashReceived: paymentMode === 'CASH' && given ? Number(given) : null,
          requestKey,
        }),
      t('pay.done'),
    );
    if (ok) onPaid();
  };

  return (
    <Dialog open={open} title={`${t('pay.title')} · ${order.billNo ?? ''}`} onClose={onClose}>
      <div className="form">
        <div className="pay-amount">
          <span>{t('pay.toCollect')}</span>
          <strong>{money(due)}</strong>
        </div>

        <div className="paid-grid">
          <button type="button" className="paid-btn" disabled={busy} onClick={() => paid('CASH')}>
            <span className="emoji" aria-hidden="true">💵</span>
            {t('pay.cash')}
          </button>
          <button type="button" className="paid-btn" disabled={busy} onClick={() => paid('UPI')}>
            <span className="emoji" aria-hidden="true">📱</span>
            {t('pay.upi')}
            <small>{t('pay.upiHint')}</small>
          </button>
        </div>

        <div>
          <div className="field-label" style={{ marginBottom: 6 }}>
            {t('pay.cashGiven')}
          </div>
          <div className="cash-quick">
            {notes.map((n) => (
              <button key={n} type="button" onClick={() => setGiven(String(n))}>
                {money(n).replace(/\.00$/, '')}
              </button>
            ))}
          </div>
          <input
            className="input"
            style={{ marginTop: 8 }}
            type="number"
            min="0"
            inputMode="decimal"
            placeholder={t('pay.otherAmount')}
            value={given}
            onChange={(e) => setGiven(e.target.value)}
          />
        </div>
        {change !== null && change >= 0 && (
          <div className="change-box">
            <span>{t('pay.returnChange')}</span>
            <span>{money(change)}</span>
          </div>
        )}

        {partial ? (
          <Field label={t('pay.partAmount')}>
            <input className="input" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
        ) : (
          <button type="button" className="link-btn more" onClick={() => setPartial(true)}>
            {t('pay.partLink')}
          </button>
        )}
      </div>
    </Dialog>
  );
}
