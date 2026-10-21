import { beforeEach, describe, expect, it } from 'vitest';
import type { MenuBindingData } from '@/types/menuPermission';
import type { OrderDetail } from '@/types/order';
import type { TableCard } from '@/types/table';
import { getDb, resetDb, type UserRow } from './db';
import { handlers, MockHttpError } from './handlers';

// node has no localStorage; give the mock db a tiny in-memory one
const store = new Map<string, string>();
Object.assign(globalThis, {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
  },
});

const as = (userId: number) => ({ user: getDb().users.find((u) => u.userId === userId) as UserRow });
const call = <T,>(url: string, body: unknown, userId: number) =>
  (handlers[url] as (b: unknown, c: unknown) => T)(body, as(userId));
const OWNER = 2;
const WAITER = 3;
const CASHIER = 4;
const ADMIN = 1;
const OTHER_OWNER = 5;

beforeEach(() => resetDb());

describe('menu binding (role page rights + staff ticks)', () => {
  const pages = (userId: number) => call<MenuBindingData>('/Menu/GetMenuBinding', {}, userId).menuList.map((m) => m.pageCode);

  it('gives the waiter only order pages', () => {
    const p = pages(WAITER);
    expect(p).toContain('NEW_BILL');
    expect(p).not.toContain('PAYMENTS');
    expect(p).not.toContain('REPORTS');
    expect(p).not.toContain('TEAM');
  });

  it('gives the cashier payments and reports because they are ticked', () => {
    expect(pages(CASHIER)).toEqual(expect.arrayContaining(['PAYMENTS', 'REPORTS']));
  });

  it('gives the platform admin only platform pages', () => {
    const p = pages(ADMIN);
    expect(p).toContain('BUSINESSES');
    expect(p).not.toContain('NEW_BILL');
  });
});

describe('server-side checks', () => {
  it('blocks a waiter from marking a bill paid', () => {
    const t7 = call<TableCard[]>('/Table/GetFloor', {}, WAITER).find((t) => t.tableName === 'Table 7')!;
    expect(() =>
      call('/Payment/Save', { orderId: t7.currentOrderId, paymentMode: 'CASH', amount: 1, cashReceived: null, requestKey: 'k' }, WAITER),
    ).toThrow(MockHttpError);
  });

  it('never shows one business the bills of another', () => {
    const spiceOrder = getDb().orders.find((o) => o.businessId === 1)!;
    expect(() => call('/Order/GetById', { id: spiceOrder.orderId }, OTHER_OWNER)).toThrow(/not found/);
  });

  it('makes staff bill the menu price even if the screen sends another', () => {
    const order = call<{ items: { unitPrice: number }[] }>(
      '/Order/Save',
      {
        orderType: 'TAKEAWAY', tableId: null, customerId: null, discountType: 'NONE', discountValue: 0, discountReason: '',
        serviceChargePct: 0, notes: '', makeBill: false, lines: [{ itemId: 304, itemName: 'Masala Dosa', quantity: 1, unitPrice: 1, taxRate: 0 }],
      },
      WAITER,
    );
    expect(order.items[0].unitPrice).toBe(180);
  });
});

describe('table flow', () => {
  it('goes available → occupied → bill pending → available', () => {
    const floor = () => call<TableCard[]>('/Table/GetFloor', {}, OWNER);
    const t1 = () => floor().find((t) => t.tableName === 'Table 1')!;
    expect(t1().tableStatus).toBe('AVAILABLE');

    const order = call<{ orderId: number; totalAmount: number }>(
      '/Order/Save',
      {
        orderType: 'DINE_IN', tableId: t1().tableId, customerId: null, discountType: 'NONE', discountValue: 0, discountReason: '',
        serviceChargePct: 5, notes: '', makeBill: false, lines: [{ itemId: 304, itemName: 'Masala Dosa', quantity: 4, unitPrice: 180, taxRate: 5 }],
      },
      WAITER,
    );
    expect(order.totalAmount).toBe(792);
    expect(t1().tableStatus).toBe('OCCUPIED');

    call('/Order/MakeBill', { id: order.orderId }, CASHIER);
    expect(t1().tableStatus).toBe('BILL_PENDING');

    call('/Payment/Save', { orderId: order.orderId, paymentMode: 'CASH', amount: 792, cashReceived: 1000, requestKey: 'k1' }, CASHIER);
    const detail = call<OrderDetail>('/Order/GetById', { id: order.orderId }, OWNER);
    expect(detail.order.orderStatus).toBe('PAID');
    expect(detail.payments[0].changeReturned).toBe(208);
    expect(t1().tableStatus).toBe('AVAILABLE');
  });

  it('does not save the same payment twice', () => {
    const t7 = call<TableCard[]>('/Table/GetFloor', {}, OWNER).find((t) => t.tableName === 'Table 7')!;
    const body = { orderId: t7.currentOrderId, paymentMode: 'UPI', amount: 10, cashReceived: null, requestKey: 'same' };
    call('/Payment/Save', body, OWNER);
    expect(() => call('/Payment/Save', body, OWNER)).toThrow(/already saved/);
  });
});
