// In-browser stand-in for the database while the real backend is not ready.
// Shapes follow database/schema.sql (camelCase). Only services/mock/* may use it.
import type { PermissionCode, RoleCode } from '@/types/auth';
import type { Business, Plan } from '@/types/business';
import type { LanguageCode, PaymentMode } from '@/types/common';
import type { Customer } from '@/types/customer';
import type { MenuCategory, MenuItem } from '@/types/menuItem';
import type { DiscountType, OrderItem, OrderStatus, OrderType, TaxLine } from '@/types/order';
import type { DiningTable } from '@/types/table';
import { calculateBill, statusAfterPayment, summarizePayments } from '@/utils/billing';
import { dayKey } from '@/utils/formatDate';

const STORAGE_KEY = 'pavti_ts_db_v1';
export const DB_CHANGED_EVENT = 'pavti:data-changed';

type Audit = { isActive: boolean; insertedBy: number | null; insertedDate: string; updatedBy: number | null; updatedDate: string | null };

export type UserRow = Audit & {
  userId: number;
  businessId: number | null;
  roleCode: RoleCode;
  fullName: string;
  mobileNo: string;
  email: string;
  password: string; // demo only; the real backend stores a bcrypt hash
  preferredLanguage: LanguageCode;
  permissions: PermissionCode[];
  lastLoginDate: string | null;
};
export type PlanRow = Plan & Audit;
export type BusinessRow = Business & Audit;
export type TableRow = DiningTable & Audit;
export type CategoryRow = MenuCategory & Audit;
export type ItemRow = MenuItem & Audit;
export type CustomerRow = Customer & Audit;
export type OrderRow = Audit & {
  orderId: number;
  businessId: number;
  billNo: string | null;
  orderType: OrderType;
  tableId: number | null;
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
  waiterUserId: number | null;
  billedBy: number | null;
  billedDate: string | null;
  paidDate: string | null;
  cancelledBy: number | null;
  cancelledDate: string | null;
  cancelReason: string;
};
export type PaymentRow = Audit & {
  paymentId: number;
  businessId: number;
  orderId: number;
  paymentType: 'PAYMENT' | 'REFUND';
  paymentMode: PaymentMode;
  amount: number;
  cashReceived: number | null;
  changeReturned: number | null;
  refundOfPaymentId: number | null;
  isRefunded: boolean;
  reason: string;
  businessDate: string;
  requestKey: string;
  receivedBy: number;
  receivedDate: string;
};
export type AuditRow = Audit & {
  auditLogId: number;
  businessId: number | null;
  userId: number | null;
  actionCode: string;
  entityName: string;
  entityId: number | null;
  details: string;
  reason: string;
  actionDate: string;
};

export type MockDb = {
  seq: number;
  plans: PlanRow[];
  businesses: BusinessRow[];
  users: UserRow[];
  tables: TableRow[];
  categories: CategoryRow[];
  items: ItemRow[];
  customers: CustomerRow[];
  orders: OrderRow[];
  payments: PaymentRow[];
  audit: AuditRow[];
};

let state: MockDb | null = null;

export function getDb(): MockDb {
  if (!state) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      state = raw ? (JSON.parse(raw) as MockDb) : null;
    } catch {
      state = null;
    }
    if (!state) {
      state = seed();
      persist();
    }
  }
  return state;
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked: keep working in memory */
  }
}

/** Save and tell open pages that data changed. */
export function commit(): void {
  persist();
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(DB_CHANGED_EVENT));
}

export function resetDb(): void {
  state = seed();
  commit();
}

export function nextId(db: MockDb = getDb()): number {
  db.seq += 1;
  return db.seq;
}

export const nowIso = (): string => new Date().toISOString();

/** Business day: a bill at 1:30 AM still belongs to the previous day (day closes at 4 AM). */
export function businessDateOf(iso: string): string {
  return dayKey(new Date(new Date(iso).getTime() - 4 * 3600 * 1000));
}

export function audit(by: number | null): Audit {
  return { isActive: true, insertedBy: by, insertedDate: nowIso(), updatedBy: null, updatedDate: null };
}

// ------------------------------------------------------------------ seed

const PHOTO = (id: string) => `https://images.unsplash.com/${id}`;

function rng(seedNum: number) {
  let a = seedNum;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seed(): MockDb {
  const now = Date.now();
  const DAY = 86400000;
  const iso = (ms: number) => new Date(ms).toISOString();
  let seq = 1000;
  const id = () => ++seq;
  const a = (by: number | null = null, when = now - 60 * DAY): Audit => ({
    isActive: true,
    insertedBy: by,
    insertedDate: iso(when),
    updatedBy: null,
    updatedDate: null,
  });

  const plans: PlanRow[] = [
    { planId: 1, planCode: 'FREE', planName: 'Free', description: 'Owner only, for trying Pavti', monthlyPrice: 0, maxUsers: 1, maxTables: 5, ...a() },
    { planId: 2, planCode: 'STARTER', planName: 'Starter', description: 'Owner + 3 staff', monthlyPrice: 499, maxUsers: 4, maxTables: 15, ...a() },
    { planId: 3, planCode: 'GROWTH', planName: 'Growth', description: 'Owner + 10 staff', monthlyPrice: 999, maxUsers: 11, maxTables: null, ...a() },
  ];

  const biz = (b: Partial<BusinessRow> & Pick<BusinessRow, 'businessId' | 'businessCode' | 'businessName' | 'billPrefix' | 'planId'>): BusinessRow => ({
    businessType: 'RESTAURANT',
    ownerName: '',
    mobileNo: '',
    email: '',
    addressLine: '',
    gstin: '',
    currencyCode: 'INR',
    defaultLanguage: 'mr',
    nextBillNo: 1,
    defaultTaxRate: 5,
    serviceChargePct: 5,
    serviceChargeLabel: 'Service charge',
    billFooterNote: 'Thank you! Visit again.',
    status: 'ACTIVE',
    statusReason: '',
    ...a(null, now - 45 * DAY),
    ...b,
  });
  const businesses: BusinessRow[] = [
    biz({
      businessId: 1, businessCode: 'SPICE01', businessName: 'Spice Garden Cafe', ownerName: 'Imran Khan',
      mobileNo: '+91 97000 33333', email: 'owner@spice.test', addressLine: 'Lane 6, Koregaon Park, Pune 411001',
      gstin: '27AAGFS4321R1Z8', billPrefix: 'SGC-', planId: 3,
    }),
    biz({
      businessId: 2, businessCode: 'SAI01', businessName: 'Sai Snacks Centre', businessType: 'CAFE', ownerName: 'Ganesh Patil',
      mobileNo: '+91 98220 44444', addressLine: 'Shivaji Nagar, Nashik 422002', billPrefix: 'SSC-', planId: 2, serviceChargePct: 0,
    }),
    biz({
      businessId: 3, businessCode: 'URBAN01', businessName: 'Urban Bakes', businessType: 'SHOP', ownerName: 'Kavya Nair',
      addressLine: 'Viman Nagar, Pune 411014', billPrefix: 'UB-', planId: 1, serviceChargePct: 0,
      status: 'SUSPENDED', statusReason: 'Plan payment pending',
    }),
  ];

  const allPerms: PermissionCode[] = ['ORDERS_TAKE', 'PAYMENTS_TAKE', 'DISCOUNTS_GIVE', 'BILLS_CANCEL', 'SALES_VIEW'];
  const user = (u: Partial<UserRow> & Pick<UserRow, 'userId' | 'roleCode' | 'fullName' | 'mobileNo' | 'password'>): UserRow => ({
    businessId: null,
    email: '',
    preferredLanguage: 'mr',
    permissions: u.roleCode === 'STAFF' ? ['ORDERS_TAKE'] : allPerms,
    lastLoginDate: null,
    ...a(),
    ...u,
  });
  const users: UserRow[] = [
    user({ userId: 1, roleCode: 'SUPER_ADMIN', fullName: 'Sara Deshmukh', mobileNo: '9000000000', email: 'admin@pavti.app', password: 'admin123' }),
    user({ userId: 2, businessId: 1, roleCode: 'OWNER', fullName: 'Imran Khan', mobileNo: '9800000001', email: 'owner@spice.test', password: 'owner123' }),
    user({ userId: 3, businessId: 1, roleCode: 'STAFF', fullName: 'Sunil Pawar', mobileNo: '9800000002', password: 'waiter123', permissions: ['ORDERS_TAKE'] }),
    user({
      userId: 4, businessId: 1, roleCode: 'STAFF', fullName: 'Meera Iyer', mobileNo: '9800000003', password: 'cashier123',
      permissions: ['ORDERS_TAKE', 'PAYMENTS_TAKE', 'DISCOUNTS_GIVE', 'SALES_VIEW'],
    }),
    user({ userId: 5, businessId: 2, roleCode: 'OWNER', fullName: 'Ganesh Patil', mobileNo: '9822000001', password: 'owner123' }),
    user({ userId: 6, businessId: 3, roleCode: 'OWNER', fullName: 'Kavya Nair', mobileNo: '9600000001', password: 'owner123' }),
  ];

  const tables: TableRow[] = [];
  for (let n = 1; n <= 8; n++) {
    tables.push({
      tableId: 100 + n, businessId: 1, tableName: `Table ${n}`, areaName: n > 6 ? 'Garden' : 'Indoor', seats: n % 3 === 0 ? 6 : 4,
      tableStatus: 'AVAILABLE', currentOrderId: null, ...a(2),
    });
  }
  for (let n = 1; n <= 4; n++) {
    tables.push({ tableId: 200 + n, businessId: 2, tableName: `Table ${n}`, areaName: '', seats: 4, tableStatus: 'AVAILABLE', currentOrderId: null, ...a(5) });
  }

  const cat = (categoryId: number, businessId: number, categoryName: string, sortOrder: number): CategoryRow => ({
    categoryId, businessId, categoryName, sortOrder, ...a(),
  });
  const categories: CategoryRow[] = [
    cat(11, 1, 'Starters', 1), cat(12, 1, 'South Indian', 2), cat(13, 1, 'Main course', 3),
    cat(14, 1, 'Breads & rice', 4), cat(15, 1, 'Drinks', 5), cat(16, 1, 'Desserts', 6),
    cat(21, 2, 'Snacks', 1), cat(22, 2, 'Drinks', 2),
  ];

  const item = (itemId: number, businessId: number, categoryId: number, itemName: string, itemCode: string, price: number, unitName: string, photo: string): ItemRow => ({
    itemId, businessId, categoryId, itemName, itemCode, price, unitName, taxRate: 5, isVeg: true, isAvailable: true,
    imageUrl: photo ? PHOTO(photo) : '', ...a(),
  });
  const items: ItemRow[] = [
    item(301, 1, 11, 'Paneer Tikka', 'ST-01', 399, 'plate', 'photo-1567188040759-fb8a883dc6d8'),
    item(302, 1, 11, 'Veg Manchurian', 'ST-02', 249, 'plate', 'photo-1682622110433-65513a55d7da'),
    item(303, 1, 11, 'Crispy Corn', 'ST-03', 219, 'plate', 'photo-1656628678780-fa0c78b52f33'),
    item(304, 1, 12, 'Masala Dosa', 'SI-01', 180, 'plate', 'photo-1668236543090-82eba5ee5976'),
    item(305, 1, 12, 'Idli Sambar', 'SI-02', 120, 'plate', 'photo-1632104667384-06f58cb7ad44'),
    item(306, 1, 12, 'Medu Vada', 'SI-03', 110, 'plate', 'photo-1730191843435-073792ba22bc'),
    item(307, 1, 13, 'Paneer Butter Masala', 'MC-01', 329, 'plate', 'photo-1631452180519-c014fe946bc7'),
    item(308, 1, 13, 'Dal Tadka', 'MC-02', 229, 'plate', 'photo-1755090154817-58d9d36ec988'),
    item(309, 1, 13, 'Veg Kolhapuri', 'MC-03', 279, 'plate', 'photo-1690401767645-595de0e0e5f8'),
    item(310, 1, 14, 'Butter Naan', 'BR-01', 60, 'pc', 'photo-1697155406014-04dc649b0953'),
    item(311, 1, 14, 'Jeera Rice', 'BR-02', 179, 'plate', 'photo-1789991184293-224a84e41900'),
    item(312, 1, 15, 'Filter Coffee', 'DR-01', 63, 'cup', 'photo-1757918391899-1341f7b285fb'),
    item(313, 1, 15, 'Masala Chai', 'DR-02', 40, 'cup', 'photo-1761483281417-778013dc0177'),
    item(314, 1, 15, 'Fresh Lime Soda', 'DR-03', 99, 'glass', 'photo-1581636625402-29b2a704ef13'),
    item(315, 1, 16, 'Gulab Jamun', 'DS-01', 99, 'plate', 'photo-1758910536889-43ce7b3199fd'),
    item(316, 1, 16, 'Kulfi', 'DS-02', 119, 'pc', 'photo-1701261919026-d6ce6cb9be0f'),
    item(401, 2, 21, 'Misal Pav', 'SN-01', 90, 'plate', ''),
    item(402, 2, 21, 'Vada Pav', 'SN-02', 25, 'pc', ''),
    item(403, 2, 21, 'Poha', 'SN-03', 40, 'plate', ''),
    item(404, 2, 22, 'Cutting Chai', 'DR-01', 15, 'cup', ''),
  ];

  const customers: CustomerRow[] = [
    { customerId: 501, businessId: 1, customerName: 'Takeaway', mobileNo: '', email: '', addressLine: '', gstin: '', ...a() },
    { customerId: 502, businessId: 1, customerName: 'Rahul Verma', mobileNo: '+91 90000 00001', email: '', addressLine: 'Baner, Pune', gstin: '', ...a() },
    { customerId: 503, businessId: 1, customerName: 'Sunrise Traders', mobileNo: '+91 90000 00002', email: 'buy@sunrise.test', addressLine: 'Hadapsar, Pune', gstin: '27AAACS9999A1Z1', ...a() },
    { customerId: 601, businessId: 2, customerName: 'Counter', mobileNo: '', email: '', addressLine: '', gstin: '', ...a() },
  ];

  const db: MockDb = { seq: 0, plans, businesses, users, tables, categories, items, customers, orders: [], payments: [], audit: [] };

  // ---- past bills (last 20 days), all settled except a few
  const makeOrder = (
    businessId: number,
    by: UserRow,
    at: number,
    lines: { item: ItemRow; qty: number }[],
    opts: { tableId?: number | null; customerId?: number | null; discount?: number; status?: 'OPEN' | 'BILLED' } = {},
  ): OrderRow => {
    const b = businesses.find((x) => x.businessId === businessId)!;
    const discountType: DiscountType = opts.discount ? 'PERCENT' : 'NONE';
    const calc = calculateBill({
      lines: lines.map((l) => ({ quantity: l.qty, unitPrice: l.item.price, taxRate: l.item.taxRate })),
      discountType,
      discountValue: opts.discount ?? 0,
      serviceChargePct: b.serviceChargePct,
    });
    const table = tables.find((t) => t.tableId === opts.tableId);
    const cust = customers.find((c) => c.customerId === opts.customerId);
    const billed = opts.status !== 'OPEN';
    const order: OrderRow = {
      orderId: id(), businessId, billNo: billed ? `${b.billPrefix}${String(b.nextBillNo++).padStart(5, '0')}` : null,
      orderType: table ? 'DINE_IN' : 'TAKEAWAY', tableId: table?.tableId ?? null, customerId: cust?.customerId ?? null,
      customerName: table?.tableName ?? cust?.customerName ?? 'Takeaway', orderStatus: billed ? 'BILLED' : 'OPEN',
      businessDate: businessDateOf(iso(at)), subTotal: calc.subTotal, discountType, discountValue: opts.discount ?? 0,
      discountAmount: calc.discountAmount, taxAmount: calc.taxAmount, taxLines: calc.taxLines, serviceChargePct: b.serviceChargePct,
      serviceChargeAmount: calc.serviceChargeAmount, totalAmount: calc.totalAmount, paidAmount: 0, balanceAmount: calc.totalAmount,
      notes: '', waiterUserId: by.userId, billedBy: billed ? by.userId : null, billedDate: billed ? iso(at + 20 * 60000) : null,
      paidDate: null, cancelledBy: null, cancelledDate: null, cancelReason: '',
      items: lines.map((l, i) => ({
        orderItemId: id(), itemId: l.item.itemId, itemName: l.item.itemName, unitName: l.item.unitName, quantity: l.qty,
        unitPrice: l.item.price, taxRate: l.item.taxRate, ...calc.lines[i],
      })),
      ...a(by.userId, at),
    };
    db.orders.push(order);
    return order;
  };
  const pay = (order: OrderRow, mode: PaymentMode, amount: number, at: number) => {
    const p: PaymentRow = {
      paymentId: id(), businessId: order.businessId, orderId: order.orderId, paymentType: 'PAYMENT', paymentMode: mode, amount,
      cashReceived: null, changeReturned: null, refundOfPaymentId: null, isRefunded: false, reason: '',
      businessDate: businessDateOf(iso(at)), requestKey: `seed-${order.orderId}`, receivedBy: order.billedBy ?? order.waiterUserId ?? 0,
      receivedDate: iso(at), ...a(order.billedBy, at),
    };
    db.payments.push(p);
    const s = summarizePayments(order.totalAmount, db.payments.filter((x) => x.orderId === order.orderId));
    order.paidAmount = s.paidAmount;
    order.balanceAmount = s.balanceAmount;
    order.orderStatus = statusAfterPayment(order.orderStatus, order.totalAmount, db.payments.filter((x) => x.orderId === order.orderId));
    if (order.orderStatus === 'PAID') order.paidDate = iso(at);
  };

  const r = rng(23);
  const spiceItems = items.filter((x) => x.businessId === 1);
  const spiceStaff = users.filter((x) => x.businessId === 1);
  const times: number[] = [];
  for (let i = 0; i < 70; i++) times.push(now - Math.floor(r() * 20 * DAY) - 3 * 3600000);
  times.sort((x, y) => x - y);
  times.forEach((at, i) => {
    const picked = new Map<number, number>();
    const n = 1 + Math.floor(r() * 4);
    for (let k = 0; k < n; k++) {
      const it = spiceItems[Math.floor(r() * spiceItems.length)];
      picked.set(it.itemId, (picked.get(it.itemId) ?? 0) + 1 + Math.floor(r() * 2));
    }
    const lines = [...picked].map(([itemId, qty]) => ({ item: spiceItems.find((x) => x.itemId === itemId)!, qty }));
    const dineIn = r() < 0.75;
    const order = makeOrder(1, spiceStaff[Math.floor(r() * spiceStaff.length)], at, lines, {
      tableId: dineIn ? 101 + Math.floor(r() * 8) : null,
      customerId: dineIn ? null : 501,
      discount: r() < 0.12 ? 10 : 0,
    });
    const roll = r();
    if (roll < 0.05 && i < times.length - 5) {
      order.orderStatus = 'CANCELLED';
      order.cancelReason = 'Customer left before food was served';
      order.cancelledBy = 2;
      order.cancelledDate = order.billedDate;
      order.balanceAmount = 0;
    } else {
      pay(order, r() < 0.6 ? 'UPI' : 'CASH', order.totalAmount, at + 45 * 60000);
    }
  });

  // Sai Snacks: a few counter bills
  const saiItems = items.filter((x) => x.businessId === 2);
  const ganesh = users.find((x) => x.userId === 5)!;
  for (let i = 0; i < 18; i++) {
    const at = now - Math.floor(r() * 15 * DAY);
    const o = makeOrder(2, ganesh, at, [{ item: saiItems[Math.floor(r() * saiItems.length)], qty: 1 + Math.floor(r() * 3) }], { customerId: 601 });
    pay(o, r() < 0.5 ? 'UPI' : 'CASH', o.totalAmount, at + 5 * 60000);
  }

  // ---- what is happening right now at Spice Garden
  const waiter = users.find((x) => x.userId === 3)!;
  const byId = (itemId: number) => spiceItems.find((x) => x.itemId === itemId)!;
  const open = (tableId: number, lines: [number, number][], minsAgo: number, status: 'OPEN' | 'BILLED' = 'OPEN') => {
    const o = makeOrder(1, waiter, now - minsAgo * 60000, lines.map(([itemId, qty]) => ({ item: byId(itemId), qty })), { tableId, status });
    const t = tables.find((x) => x.tableId === tableId)!;
    t.tableStatus = status === 'OPEN' ? 'OCCUPIED' : 'BILL_PENDING';
    t.currentOrderId = o.orderId;
    if (status === 'BILLED') o.billedDate = iso(now - 3 * 60000);
  };
  open(102, [[304, 2], [312, 2]], 12);
  open(105, [[301, 1], [307, 1], [310, 4], [314, 2]], 25);
  open(107, [[309, 1], [311, 1], [315, 2]], 40, 'BILLED');

  db.audit.push({
    auditLogId: id(), businessId: 1, userId: 2, actionCode: 'BUSINESS_REGISTER', entityName: 'businesses', entityId: 1,
    details: 'Spice Garden Cafe', reason: '', actionDate: iso(now - 45 * DAY), ...a(2, now - 45 * DAY),
  });
  db.seq = seq;
  return db;
}
