import { describe, expect, it } from 'vitest';
import { calculateBill, statusAfterPayment, summarizePayments, validatePaymentAmount } from './billing';

const line = (quantity: number, unitPrice: number, taxRate = 0) => ({ quantity, unitPrice, taxRate });

describe('calculateBill', () => {
  it('adds quantity × price', () => {
    const r = calculateBill({ lines: [line(2, 10), line(3, 2.5)] });
    expect(r.subTotal).toBe(27.5);
    expect(r.totalAmount).toBe(27.5);
  });

  it('ignores zero-quantity lines', () => {
    expect(calculateBill({ lines: [line(0, 10), line(1, 5)] }).totalAmount).toBe(5);
  });

  it('adds tax per line and groups it by rate', () => {
    const r = calculateBill({ lines: [line(1, 100, 18), line(1, 100, 5)] });
    expect(r.taxAmount).toBe(23);
    expect(r.taxLines.map((t) => t.taxRate)).toEqual([5, 18]);
    expect(r.totalAmount).toBe(223);
  });

  it('takes a percent discount before tax', () => {
    const r = calculateBill({ lines: [line(1, 100, 10)], discountType: 'PERCENT', discountValue: 10 });
    expect(r.discountAmount).toBe(10);
    expect(r.taxAmount).toBe(9);
    expect(r.totalAmount).toBe(99);
  });

  it('never discounts more than the bill', () => {
    const r = calculateBill({ lines: [line(1, 5)], discountType: 'AMOUNT', discountValue: 999 });
    expect(r.discountAmount).toBe(5);
    expect(r.totalAmount).toBe(0);
  });

  it('splits a discount across lines without losing a paisa', () => {
    const r = calculateBill({
      lines: [line(1, 3.33), line(1, 3.33), line(1, 3.34)],
      discountType: 'AMOUNT',
      discountValue: 1,
    });
    expect(r.lines.reduce((s, l) => s + Math.round(l.discountAmount * 100), 0)).toBe(100);
    expect(r.totalAmount).toBe(9);
  });

  it('matches the restaurant demo: 4 dosa + 5% GST + 5% service', () => {
    const r = calculateBill({ lines: [line(4, 180, 5)], serviceChargePct: 5 });
    expect(r.totalAmount).toBe(792);
  });
});

describe('payments', () => {
  it('moves through part paid, paid and refunded', () => {
    expect(statusAfterPayment('BILLED', 100, [])).toBe('BILLED');
    expect(statusAfterPayment('BILLED', 100, [{ paymentType: 'PAYMENT', amount: 40 }])).toBe('PART_PAID');
    expect(statusAfterPayment('BILLED', 100, [{ paymentType: 'PAYMENT', amount: 100 }])).toBe('PAID');
    expect(
      statusAfterPayment('PAID', 100, [
        { paymentType: 'PAYMENT', amount: 100 },
        { paymentType: 'REFUND', amount: 100 },
      ]),
    ).toBe('REFUNDED');
  });

  it('keeps open and cancelled orders as they are', () => {
    expect(statusAfterPayment('OPEN', 100, [])).toBe('OPEN');
    expect(statusAfterPayment('CANCELLED', 100, [])).toBe('CANCELLED');
  });

  it('shows the balance left', () => {
    expect(summarizePayments(100, [{ paymentType: 'PAYMENT', amount: 30 }]).balanceAmount).toBe(70);
  });

  it('rejects zero and over-payment', () => {
    expect(validatePaymentAmount(0, 10)).toBeTruthy();
    expect(validatePaymentAmount(10.01, 10)).toBeTruthy();
    expect(validatePaymentAmount(10, 10)).toBeNull();
  });
});
