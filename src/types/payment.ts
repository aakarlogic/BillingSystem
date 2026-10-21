import type { PaymentMode } from './common';

export type { Payment } from './order';

export type PaymentSaveRequest = {
  orderId: number;
  paymentMode: PaymentMode;
  amount: number;
  cashReceived: number | null;
  /** unique per tap, so a double tap never saves twice (payments.request_key) */
  requestKey: string;
};

export type RefundRequest = { paymentId: number; reason: string };
