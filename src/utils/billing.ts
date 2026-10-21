// Bill math. Amounts come in and go out as rupees (like the database), but
// every step is done in whole paise so totals never drift by a paisa.
import type { DiscountType, OrderStatus, TaxLine } from '@/types/order';

export const toPaise = (rupees: number | string): number => Math.round(Number(rupees || 0) * 100);
export const toRupees = (paise: number): number => Math.round(paise) / 100;

export type BillLineInput = { quantity: number; unitPrice: number; taxRate: number };

export type BillLineResult = {
  lineAmount: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
};

export type BillResult = {
  lines: BillLineResult[];
  subTotal: number;
  discountAmount: number;
  taxAmount: number;
  taxLines: TaxLine[];
  serviceChargeAmount: number;
  totalAmount: number;
};

export function calculateBill(input: {
  lines: BillLineInput[];
  discountType?: DiscountType;
  discountValue?: number;
  serviceChargePct?: number;
}): BillResult {
  const lines = input.lines.map((l) => {
    const qty = Number(l.quantity) || 0;
    const amount = qty > 0 ? Math.round(qty * toPaise(l.unitPrice)) : 0;
    return { qty, amount, taxRate: Number(l.taxRate) || 0, discount: 0, tax: 0 };
  });
  const sub = lines.reduce((s, l) => s + l.amount, 0);

  let discount = 0;
  if (input.discountType === 'PERCENT') {
    const pct = Math.min(100, Math.max(0, Number(input.discountValue) || 0));
    discount = Math.round((sub * pct) / 100);
  } else if (input.discountType === 'AMOUNT') {
    discount = Math.min(sub, Math.max(0, toPaise(input.discountValue ?? 0)));
  }

  // Share the bill discount across lines by value; the last priced line takes
  // the rounding remainder so the shares always add up exactly.
  const priced = lines.filter((l) => l.amount > 0);
  let left = discount;
  priced.forEach((l, i) => {
    const share = i === priced.length - 1 ? left : Math.round((discount * l.amount) / sub);
    l.discount = Math.min(share, l.amount);
    left -= l.discount;
  });
  lines.forEach((l) => {
    l.tax = Math.round(((l.amount - l.discount) * l.taxRate) / 100);
  });

  const taxMap = new Map<number, { taxable: number; tax: number }>();
  lines.forEach((l) => {
    if (!l.taxRate || !l.amount) return;
    const t = taxMap.get(l.taxRate) ?? { taxable: 0, tax: 0 };
    t.taxable += l.amount - l.discount;
    t.tax += l.tax;
    taxMap.set(l.taxRate, t);
  });

  const tax = lines.reduce((s, l) => s + l.tax, 0);
  const net = sub - discount;
  const service = Math.round((net * (Number(input.serviceChargePct) || 0)) / 100);

  return {
    lines: lines.map((l) => ({
      lineAmount: toRupees(l.amount),
      discountAmount: toRupees(l.discount),
      taxAmount: toRupees(l.tax),
      lineTotal: toRupees(l.amount - l.discount + l.tax),
    })),
    subTotal: toRupees(sub),
    discountAmount: toRupees(discount),
    taxAmount: toRupees(tax),
    taxLines: [...taxMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([taxRate, t]) => ({ taxRate, taxable: toRupees(t.taxable), tax: toRupees(t.tax) })),
    serviceChargeAmount: toRupees(service),
    totalAmount: toRupees(net + tax + service),
  };
}

export type PaymentLike = { paymentType: 'PAYMENT' | 'REFUND'; amount: number };

export function summarizePayments(total: number, payments: PaymentLike[]) {
  const paid = payments.filter((p) => p.paymentType === 'PAYMENT').reduce((s, p) => s + toPaise(p.amount), 0);
  const refunded = payments.filter((p) => p.paymentType === 'REFUND').reduce((s, p) => s + toPaise(p.amount), 0);
  const net = paid - refunded;
  return {
    paidAmount: toRupees(net),
    refundedAmount: toRupees(refunded),
    balanceAmount: toRupees(Math.max(0, toPaise(total) - net)),
  };
}

/** Status after money changes. OPEN and CANCELLED are never changed here. */
export function statusAfterPayment(current: OrderStatus, total: number, payments: PaymentLike[]): OrderStatus {
  if (current === 'OPEN' || current === 'CANCELLED') return current;
  const { paidAmount, refundedAmount } = summarizePayments(total, payments);
  if (toPaise(paidAmount) >= toPaise(total)) return 'PAID';
  if (paidAmount > 0) return 'PART_PAID';
  if (refundedAmount > 0) return 'REFUNDED';
  return 'BILLED';
}

export function validatePaymentAmount(amount: number, balance: number): string | null {
  if (!(toPaise(amount) > 0)) return 'Enter an amount greater than zero.';
  if (toPaise(amount) > toPaise(balance)) return 'Amount is more than the balance due.';
  return null;
}
