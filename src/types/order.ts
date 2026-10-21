import type { PaymentMode } from './common';

export type OrderStatus = 'OPEN' | 'BILLED' | 'PART_PAID' | 'PAID' | 'CANCELLED' | 'REFUNDED';
export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'COUNTER';
export type DiscountType = 'NONE' | 'PERCENT' | 'AMOUNT';

export type OrderItem = {
  orderItemId: number;
  itemId: number | null;
  itemName: string;
  unitName: string;
  quantity: number;
  unitPrice: number;
  lineAmount: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
};

export type TaxLine = { taxRate: number; taxable: number; tax: number };

export type Order = {
  orderId: number;
  businessId: number;
  billNo: string | null;
  orderType: OrderType;
  tableId: number | null;
  tableName: string | null;
  customerId: number | null;
  customerName: string;
  orderStatus: OrderStatus;
  businessDate: string;
  subTotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  taxAmount: number;
  taxLines: TaxLine[];
  serviceChargePct: number;
  serviceChargeAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  notes: string;
  items: OrderItem[];
  waiterName: string;
  billedDate: string | null;
  paidDate: string | null;
  cancelReason: string;
  insertedDate: string;
};

export type OrderListItem = Omit<Order, 'items' | 'taxLines'> & { itemCount: number };

/** One line as the order screen sends it. Price is ignored for staff (menu price is used). */
export type OrderLineRequest = { itemId: number | null; itemName: string; quantity: number; unitPrice: number; taxRate: number };

export type OrderSaveRequest = {
  orderId?: number;
  orderType: OrderType;
  tableId: number | null;
  customerId: number | null;
  lines: OrderLineRequest[];
  discountType: DiscountType;
  discountValue: number;
  discountReason: string;
  serviceChargePct: number;
  notes: string;
  /** true = also make the bill (give it a number) */
  makeBill: boolean;
};

export type OrderFilter = { status?: OrderStatus | 'ALL'; search?: string; mineOnly?: boolean };

export type Payment = {
  paymentId: number;
  orderId: number;
  billNo: string | null;
  paymentType: 'PAYMENT' | 'REFUND';
  paymentMode: PaymentMode;
  amount: number;
  cashReceived: number | null;
  changeReturned: number | null;
  reason: string;
  isRefunded: boolean;
  receivedByName: string;
  receivedDate: string;
};

export type OrderDetail = { order: Order; payments: Payment[] };
