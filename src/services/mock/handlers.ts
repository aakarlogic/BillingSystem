// Mock backend: one function per API url. Same rules the real backend must
// apply: tenant scoping, role page rights, staff ticks, bill math, audit log.
import type { PermissionCode, SessionUser, SignInData, SignInRequest, ChangePasswordRequest, UpdateProfileRequest } from '@/types/auth';
import { PERMISSION_CODES } from '@/types/auth';
import type {
  BusinessListItem,
  BusinessSaveRequest,
  BusinessStatusRequest,
  PlanSaveRequest,
  PlatformStats,
  SettingsSaveRequest,
} from '@/types/business';
import type { CustomerListItem, CustomerSaveRequest } from '@/types/customer';
import type { CategorySaveRequest, ItemAvailabilityRequest, MenuItemSaveRequest } from '@/types/menuItem';
import type { MenuBindingData, MenuBindingItem, PageCode } from '@/types/menuPermission';
import type { Order, OrderDetail, OrderFilter, OrderListItem, OrderSaveRequest, Payment } from '@/types/order';
import type { PaymentSaveRequest, RefundRequest } from '@/types/payment';
import type { AuditLog, ChartPoint, DashboardSummary, ReportRequest, SalesReport } from '@/types/report';
import type { TableCard } from '@/types/table';
import type { User, UserSaveRequest, UserStatusRequest } from '@/types/user';
import type { IdRequest, ReasonRequest } from '@/types/api';
import { calculateBill, statusAfterPayment, summarizePayments, toPaise, toRupees, validatePaymentAmount } from '@/utils/billing';
import { dayKey, shiftDay } from '@/utils/formatDate';
import { createMockToken, decodeToken } from '@/guards/jwt/jwt';
import { PAGE_DEFINITIONS } from './pages';
import {
  audit as auditCols,
  businessDateOf,
  commit,
  getDb,
  nextId,
  nowIso,
  resetDb,
  type OrderRow,
  type PaymentRow,
  type UserRow,
} from './db';

export class MockHttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
const fail = (message: string, status = 400): never => {
  throw new MockHttpError(status, message);
};

export type Ctx = { user: UserRow | null };
type Handler = (body: never, ctx: Ctx) => unknown;

// ------------------------------------------------------------ helpers

const clean = (s: unknown) => String(s ?? '').trim();
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const isMobile = (s: string) => /^\+?[\d\s]{10,15}$/.test(s);

export function userFromToken(token: string | null): UserRow | null {
  if (!token) return null;
  const payload = decodeToken(token);
  if (!payload?.exp || payload.exp < Date.now() / 1000) return null;
  const u = getDb().users.find((x) => x.userId === Number(payload.sub));
  return u && u.isActive ? u : null;
}

function me(ctx: Ctx): UserRow {
  if (!ctx.user) fail('Please sign in again.', 401);
  return ctx.user as UserRow;
}

function myBusinessId(ctx: Ctx): number {
  const u = me(ctx);
  if (!u.businessId) fail('This needs a business account.', 403);
  return u.businessId as number;
}

function hasPerm(u: UserRow, code: PermissionCode): boolean {
  return u.roleCode !== 'STAFF' || u.permissions.includes(code);
}

/** Role page right check, same as the menu-binding query in database/README.md. */
function canPage(u: UserRow, page: PageCode, letter: 'V' | 'A' | 'E' | 'D' | 'X'): boolean {
  const def = PAGE_DEFINITIONS.find((p) => p.pageCode === page);
  const rights = def?.rights[u.roleCode] ?? '';
  if (!rights.includes(letter)) return false;
  return !(u.roleCode === 'STAFF' && def?.requiredPermission && !u.permissions.includes(def.requiredPermission));
}

function need(ctx: Ctx, page: PageCode, letter: 'V' | 'A' | 'E' | 'D' | 'X' = 'V'): UserRow {
  const u = me(ctx);
  if (!canPage(u, page, letter)) fail('You do not have permission to do this.', 403);
  return u;
}

function needPerm(ctx: Ctx, code: PermissionCode): UserRow {
  const u = me(ctx);
  if (!hasPerm(u, code)) fail('You do not have permission to do this.', 403);
  return u;
}

function writeAudit(u: UserRow | null, actionCode: string, entityName: string, entityId: number | null, details = '', reason = '', businessId?: number | null) {
  getDb().audit.unshift({
    auditLogId: nextId(),
    businessId: businessId !== undefined ? businessId : (u?.businessId ?? null),
    userId: u?.userId ?? null,
    actionCode,
    entityName,
    entityId,
    details,
    reason,
    actionDate: nowIso(),
    ...auditCols(u?.userId ?? null),
  });
}

function touch<T extends { updatedBy: number | null; updatedDate: string | null }>(row: T, u: UserRow): T {
  row.updatedBy = u.userId;
  row.updatedDate = nowIso();
  return row;
}

function business(id: number) {
  return getDb().businesses.find((b) => b.businessId === id) ?? fail('Business not found.', 404);
}

function toSessionUser(u: UserRow): SessionUser {
  const b = u.businessId ? getDb().businesses.find((x) => x.businessId === u.businessId) : null;
  return {
    userId: u.userId,
    businessId: u.businessId,
    businessName: b?.businessName ?? null,
    roleCode: u.roleCode,
    fullName: u.fullName,
    mobileNo: u.mobileNo,
    email: u.email || null,
    permissions: u.roleCode === 'STAFF' ? u.permissions : [...PERMISSION_CODES],
    preferredLanguage: u.preferredLanguage,
    currencyCode: b?.currencyCode ?? 'INR',
  };
}

function toUser(u: UserRow): User {
  const b = u.businessId ? getDb().businesses.find((x) => x.businessId === u.businessId) : null;
  return {
    userId: u.userId,
    businessId: u.businessId,
    businessName: b?.businessName ?? null,
    roleCode: u.roleCode,
    fullName: u.fullName,
    mobileNo: u.mobileNo,
    email: u.email,
    preferredLanguage: u.preferredLanguage,
    permissions: u.roleCode === 'STAFF' ? u.permissions : [...PERMISSION_CODES],
    isActive: u.isActive,
    lastLoginDate: u.lastLoginDate,
  };
}

function seatCheck(businessId: number) {
  const db = getDb();
  const plan = db.plans.find((p) => p.planId === business(businessId).planId);
  const active = db.users.filter((u) => u.businessId === businessId && u.isActive).length;
  if (plan && active >= plan.maxUsers) {
    fail(`The ${plan.planName} plan allows ${plan.maxUsers} people. Upgrade the plan to add more.`);
  }
}

// ---- orders

function orderPayments(orderId: number): PaymentRow[] {
  return getDb().payments.filter((p) => p.orderId === orderId);
}

function userName(id: number | null): string {
  return getDb().users.find((u) => u.userId === id)?.fullName ?? '';
}

function tableName(id: number | null): string | null {
  return id ? (getDb().tables.find((t) => t.tableId === id)?.tableName ?? null) : null;
}

function toOrder(o: OrderRow): Order {
  return {
    orderId: o.orderId, businessId: o.businessId, billNo: o.billNo, orderType: o.orderType, tableId: o.tableId,
    tableName: tableName(o.tableId), customerId: o.customerId, customerName: o.customerName, orderStatus: o.orderStatus,
    businessDate: o.businessDate, subTotal: o.subTotal, discountType: o.discountType, discountValue: o.discountValue,
    discountAmount: o.discountAmount, taxAmount: o.taxAmount, taxLines: o.taxLines, serviceChargePct: o.serviceChargePct,
    serviceChargeAmount: o.serviceChargeAmount, totalAmount: o.totalAmount, paidAmount: o.paidAmount,
    balanceAmount: o.balanceAmount, notes: o.notes, items: o.items, waiterName: userName(o.waiterUserId),
    billedDate: o.billedDate, paidDate: o.paidDate, cancelReason: o.cancelReason, insertedDate: o.insertedDate,
  };
}

function toListItem(o: OrderRow): OrderListItem {
  const { items, taxLines, ...rest } = toOrder(o);
  void taxLines;
  return { ...rest, itemCount: items.reduce((s, i) => s + i.quantity, 0) };
}

function toPayment(p: PaymentRow): Payment {
  const o = getDb().orders.find((x) => x.orderId === p.orderId);
  return {
    paymentId: p.paymentId, orderId: p.orderId, billNo: o?.billNo ?? null, paymentType: p.paymentType, paymentMode: p.paymentMode,
    amount: p.amount, cashReceived: p.cashReceived, changeReturned: p.changeReturned, reason: p.reason, isRefunded: p.isRefunded,
    receivedByName: userName(p.receivedBy), receivedDate: p.receivedDate,
  };
}

function myOrder(ctx: Ctx, orderId: number): OrderRow {
  const bid = myBusinessId(ctx);
  const o = getDb().orders.find((x) => x.orderId === orderId && x.isActive);
  if (!o || o.businessId !== bid) fail('Bill not found.', 404);
  return o as OrderRow;
}

function refreshMoney(o: OrderRow) {
  if (o.orderStatus === 'OPEN' || o.orderStatus === 'CANCELLED') return;
  const pays = orderPayments(o.orderId);
  const s = summarizePayments(o.totalAmount, pays);
  o.paidAmount = s.paidAmount;
  o.balanceAmount = s.balanceAmount;
  o.orderStatus = statusAfterPayment(o.orderStatus, o.totalAmount, pays);
  if (o.orderStatus === 'PAID' && !o.paidDate) o.paidDate = nowIso();
  if (o.orderStatus !== 'PAID') o.paidDate = null;
  syncTable(o);
}

/** Table status follows its order: open → occupied, billed → bill pending, paid/cancelled → free. */
function syncTable(o: OrderRow) {
  if (!o.tableId) return;
  const t = getDb().tables.find((x) => x.tableId === o.tableId);
  if (!t) return;
  if (o.orderStatus === 'OPEN') {
    t.tableStatus = 'OCCUPIED';
    t.currentOrderId = o.orderId;
  } else if (o.orderStatus === 'BILLED' || o.orderStatus === 'PART_PAID') {
    t.tableStatus = 'BILL_PENDING';
    t.currentOrderId = o.orderId;
  } else if (t.currentOrderId === o.orderId) {
    t.tableStatus = 'AVAILABLE';
    t.currentOrderId = null;
  }
}

function giveBillNo(o: OrderRow, u: UserRow) {
  const b = business(o.businessId);
  o.billNo = `${b.billPrefix}${String(b.nextBillNo).padStart(5, '0')}`;
  b.nextBillNo += 1;
  o.orderStatus = 'BILLED';
  o.billedBy = u.userId;
  o.billedDate = nowIso();
  o.balanceAmount = o.totalAmount;
  if (o.totalAmount === 0) o.orderStatus = 'PAID';
  writeAudit(u, 'BILL_MADE', 'orders', o.orderId, o.billNo);
}

// ---- reports

function sum<T>(rows: T[], f: (r: T) => number): number {
  return toRupees(rows.reduce((s, r) => s + toPaise(f(r)), 0));
}

function topItems(orders: OrderRow[], by: 'value' | 'qty', n = 8): ChartPoint[] {
  const m = new Map<string, { value: number; qty: number }>();
  orders.forEach((o) =>
    o.items.forEach((i) => {
      const e = m.get(i.itemName) ?? { value: 0, qty: 0 };
      e.value += toPaise(i.lineAmount - i.discountAmount);
      e.qty += i.quantity;
      m.set(i.itemName, e);
    }),
  );
  return [...m]
    .map(([label, e]) => ({ label, value: by === 'value' ? toRupees(e.value) : e.qty }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

const billedStatuses = ['BILLED', 'PART_PAID', 'PAID', 'REFUNDED'];

// ------------------------------------------------------------ handlers

export const handlers: Record<string, Handler> = {
  // ---------------- auth
  '/Auth/Login': (body: SignInRequest): SignInData => {
    const db = getDb();
    const id = clean(body.loginId).toLowerCase().replace(/\s/g, '');
    const u = db.users.find((x) => x.mobileNo.replace(/\s/g, '') === id || (x.email && x.email.toLowerCase() === id));
    if (!u || u.password !== body.password) fail('Wrong mobile number or password.', 401);
    const user = u as UserRow;
    if (!user.isActive) fail('Your login is turned off. Ask your owner.', 403);
    if (user.businessId && business(user.businessId).status !== 'ACTIVE') fail('This business is paused. Contact support.', 403);
    user.lastLoginDate = nowIso();
    writeAudit(user, 'LOGIN', 'users', user.userId, user.mobileNo);
    commit();
    return { accessToken: createMockToken(user.userId), user: toSessionUser(user), mustChangePassword: false };
  },
  '/Auth/Logout': (_b: never, ctx) => {
    if (ctx.user) {
      writeAudit(ctx.user, 'LOGOUT', 'users', ctx.user.userId);
      commit();
    }
    return true;
  },
  '/Auth/Me': (_b: never, ctx): SessionUser => toSessionUser(me(ctx)),
  '/Auth/ChangePassword': (body: ChangePasswordRequest, ctx) => {
    const u = me(ctx);
    if (u.password !== body.currentPassword) fail('Current password is wrong.');
    if (clean(body.newPassword).length < 6) fail('New password must be at least 6 characters.');
    u.password = body.newPassword;
    writeAudit(u, 'PASSWORD_CHANGE', 'users', u.userId);
    commit();
    return true;
  },
  '/Auth/UpdateProfile': (body: UpdateProfileRequest, ctx): SessionUser => {
    const u = me(ctx);
    if (!clean(body.fullName)) fail('Name is required.');
    u.fullName = clean(body.fullName);
    u.preferredLanguage = body.preferredLanguage;
    touch(u, u);
    commit();
    return toSessionUser(u);
  },
  '/Auth/ResetDemo': () => {
    resetDb();
    return true;
  },

  // ---------------- menu binding (side menu + page rights)
  '/Menu/GetMenuBinding': (_b: never, ctx): MenuBindingData => {
    const u = me(ctx);
    const menuList: MenuBindingItem[] = PAGE_DEFINITIONS.filter((p) => canPage(u, p.pageCode, 'V'))
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => ({
        pageCode: p.pageCode,
        routePath: p.routePath,
        menuGroup: p.menuGroup,
        iconName: p.iconName,
        showInMenu: p.showInMenu,
        sortOrder: p.sortOrder,
        canView: true,
        canAdd: canPage(u, p.pageCode, 'A'),
        canEdit: canPage(u, p.pageCode, 'E'),
        canDelete: canPage(u, p.pageCode, 'D'),
        canExport: canPage(u, p.pageCode, 'X'),
      }));
    return { menuList };
  },

  // ---------------- platform: businesses & plans
  '/Business/GetAll': (_b: never, ctx): BusinessListItem[] => {
    need(ctx, 'BUSINESSES');
    const db = getDb();
    return db.businesses.map((b) => {
      const plan = db.plans.find((p) => p.planId === b.planId);
      const pays = db.payments.filter((p) => p.businessId === b.businessId);
      return {
        ...b,
        planName: plan?.planName ?? '',
        maxUsers: plan?.maxUsers ?? 0,
        userCount: db.users.filter((u) => u.businessId === b.businessId && u.isActive).length,
        billCount: db.orders.filter((o) => o.businessId === b.businessId && o.billNo).length,
        collected: sum(pays, (p) => (p.paymentType === 'REFUND' ? -p.amount : p.amount)),
      };
    });
  },
  '/Business/Save': (body: BusinessSaveRequest, ctx) => {
    const u = need(ctx, 'BUSINESSES', body.businessId ? 'E' : 'A');
    const db = getDb();
    const name = clean(body.businessName);
    if (!name) fail('Business name is required.');
    if (!db.plans.some((p) => p.planId === Number(body.planId))) fail('Choose a plan.');
    const fields = {
      businessName: name, businessType: body.businessType, mobileNo: clean(body.mobileNo), email: clean(body.email),
      addressLine: clean(body.addressLine), gstin: clean(body.gstin).toUpperCase(), planId: Number(body.planId),
      billPrefix: clean(body.billPrefix) || `${name.slice(0, 3).toUpperCase()}-`,
    };
    if (body.businessId) {
      Object.assign(touch(business(body.businessId), u), fields);
      writeAudit(u, 'BUSINESS_UPDATE', 'businesses', body.businessId, name, '', body.businessId);
      commit();
      return body.businessId;
    }
    const ownerMobile = clean(body.ownerMobileNo).replace(/\s/g, '');
    if (!clean(body.ownerName)) fail("Owner's name is required.");
    if (!isMobile(ownerMobile)) fail("Owner's mobile number is not valid.");
    if (db.users.some((x) => x.mobileNo.replace(/\s/g, '') === ownerMobile)) fail('This mobile number is already used.');
    if (clean(body.ownerPassword).length < 6) fail('Password must be at least 6 characters.');
    const businessId = nextId();
    db.businesses.push({
      businessId, businessCode: `B${businessId}`, ownerName: clean(body.ownerName), currencyCode: 'INR', defaultLanguage: 'mr',
      nextBillNo: 1, defaultTaxRate: 5, serviceChargePct: 0, serviceChargeLabel: 'Service charge', billFooterNote: 'Thank you! Visit again.',
      status: 'ACTIVE', statusReason: '', ...fields, ...auditCols(u.userId),
    });
    db.users.push({
      userId: nextId(), businessId, roleCode: 'OWNER', fullName: clean(body.ownerName), mobileNo: ownerMobile, email: '',
      password: clean(body.ownerPassword), preferredLanguage: 'mr', permissions: [...PERMISSION_CODES], lastLoginDate: null,
      ...auditCols(u.userId),
    });
    db.customers.push({
      customerId: nextId(), businessId, customerName: 'Takeaway', mobileNo: '', email: '', addressLine: '', gstin: '', ...auditCols(u.userId),
    });
    writeAudit(u, 'BUSINESS_CREATE', 'businesses', businessId, name, '', businessId);
    commit();
    return businessId;
  },
  '/Business/SetStatus': (body: BusinessStatusRequest, ctx) => {
    const u = need(ctx, 'BUSINESSES', 'E');
    const b = business(body.businessId);
    if (body.status === 'SUSPENDED' && !clean(body.reason)) fail('Write a reason to pause a business.');
    b.status = body.status;
    b.statusReason = clean(body.reason);
    touch(b, u);
    writeAudit(u, body.status === 'ACTIVE' ? 'BUSINESS_ACTIVATE' : 'BUSINESS_SUSPEND', 'businesses', b.businessId, b.businessName, clean(body.reason), b.businessId);
    commit();
    return true;
  },
  '/Business/GetStats': (_b: never, ctx): PlatformStats => {
    need(ctx, 'BUSINESSES');
    const db = getDb();
    const active = db.businesses.filter((b) => b.status === 'ACTIVE');
    const net = (bid?: number) =>
      sum(db.payments.filter((p) => bid === undefined || p.businessId === bid), (p) => (p.paymentType === 'REFUND' ? -p.amount : p.amount));
    return {
      businesses: db.businesses.length,
      activeBusinesses: active.length,
      suspendedBusinesses: db.businesses.length - active.length,
      users: db.users.filter((u) => u.roleCode !== 'SUPER_ADMIN' && u.isActive).length,
      bills: db.orders.filter((o) => o.billNo).length,
      monthlyRevenue: active.reduce((s, b) => s + (db.plans.find((p) => p.planId === b.planId)?.monthlyPrice ?? 0), 0),
      collected: net(),
      byBusiness: db.businesses.map((b) => ({ label: b.businessName, value: net(b.businessId) })).sort((a, b) => b.value - a.value),
      byPlan: db.plans.map((p) => ({ label: p.planName, value: db.businesses.filter((b) => b.planId === p.planId).length })),
    };
  },
  '/Business/GetSettings': (_b: never, ctx) => business(myBusinessId(ctx)),
  '/Business/SaveSettings': (body: SettingsSaveRequest, ctx) => {
    const u = need(ctx, 'SETTINGS', 'E');
    const b = business(myBusinessId(ctx));
    if (!clean(body.businessName)) fail('Business name is required.');
    const tax = Number(body.defaultTaxRate);
    const sc = Number(body.serviceChargePct);
    if (!(tax >= 0 && tax <= 28)) fail('Tax must be between 0 and 28%.');
    if (!(sc >= 0 && sc <= 20)) fail('Service charge must be between 0 and 20%.');
    Object.assign(b, {
      businessName: clean(body.businessName), mobileNo: clean(body.mobileNo), email: clean(body.email),
      addressLine: clean(body.addressLine), gstin: clean(body.gstin).toUpperCase(), billPrefix: clean(body.billPrefix) || b.billPrefix,
      defaultTaxRate: tax, serviceChargePct: sc, serviceChargeLabel: clean(body.serviceChargeLabel) || 'Service charge',
      billFooterNote: clean(body.billFooterNote), defaultLanguage: body.defaultLanguage,
    });
    touch(b, u);
    writeAudit(u, 'SETTINGS_UPDATE', 'businesses', b.businessId, b.businessName);
    commit();
    return b;
  },
  '/Plan/GetAll': () => getDb().plans.filter((p) => p.isActive),
  '/Plan/Save': (body: PlanSaveRequest, ctx) => {
    const u = need(ctx, 'PLANS', body.planId ? 'E' : 'A');
    const db = getDb();
    if (!clean(body.planName)) fail('Plan name is required.');
    if (!(Number(body.maxUsers) >= 1)) fail('Allow at least 1 person.');
    if (!(Number(body.monthlyPrice) >= 0)) fail('Price cannot be negative.');
    const fields = {
      planCode: clean(body.planCode || body.planName).toUpperCase().replace(/\s+/g, '_'), planName: clean(body.planName),
      description: clean(body.description), monthlyPrice: Number(body.monthlyPrice), maxUsers: Number(body.maxUsers),
      maxTables: body.maxTables ? Number(body.maxTables) : null,
    };
    if (body.planId) {
      const p = db.plans.find((x) => x.planId === body.planId) ?? fail('Plan not found.', 404);
      Object.assign(touch(p, u), fields);
    } else {
      db.plans.push({ planId: nextId(), ...fields, ...auditCols(u.userId) });
    }
    writeAudit(u, 'PLAN_SAVE', 'plans', body.planId ?? null, fields.planName, '', null);
    commit();
    return true;
  },
  '/Plan/Delete': (body: IdRequest, ctx) => {
    const u = need(ctx, 'PLANS', 'D');
    const db = getDb();
    if (db.businesses.some((b) => b.planId === body.id)) fail('A business uses this plan. Move it to another plan first.');
    const p = db.plans.find((x) => x.planId === body.id) ?? fail('Plan not found.', 404);
    p.isActive = false;
    touch(p, u);
    writeAudit(u, 'PLAN_DELETE', 'plans', body.id, p.planName, '', null);
    commit();
    return true;
  },

  // ---------------- users
  '/User/GetAll': (_b: never, ctx): User[] => {
    const u = me(ctx);
    const db = getDb();
    if (canPage(u, 'ALL_USERS', 'V')) return db.users.map(toUser);
    need(ctx, 'TEAM');
    return db.users.filter((x) => x.businessId === u.businessId).map(toUser);
  },
  '/User/Save': (body: UserSaveRequest, ctx) => {
    const u = me(ctx);
    const isPlatform = canPage(u, 'ALL_USERS', body.userId ? 'E' : 'A');
    if (!isPlatform) need(ctx, 'TEAM', body.userId ? 'E' : 'A');
    const db = getDb();
    const name = clean(body.fullName);
    const mobile = clean(body.mobileNo).replace(/\s/g, '');
    const email = clean(body.email).toLowerCase();
    if (!name) fail('Name is required.');
    if (!isMobile(mobile)) fail('Mobile number is not valid.');
    if (email && !isEmail(email)) fail('Email is not valid.');
    const roles = isPlatform ? ['SUPER_ADMIN', 'OWNER', 'STAFF'] : ['OWNER', 'STAFF'];
    if (!roles.includes(body.roleCode)) fail('Choose a role.');
    const businessId = isPlatform ? (body.roleCode === 'SUPER_ADMIN' ? null : Number(body.businessId)) : u.businessId;
    if (body.roleCode !== 'SUPER_ADMIN' && !db.businesses.some((b) => b.businessId === businessId)) fail('Choose a business.');
    if (db.users.some((x) => x.mobileNo.replace(/\s/g, '') === mobile && x.userId !== body.userId)) fail('This mobile number is already used.');
    const permissions: PermissionCode[] =
      body.roleCode === 'STAFF' ? PERMISSION_CODES.filter((p) => body.permissions.includes(p)) : [...PERMISSION_CODES];
    if (body.roleCode === 'STAFF' && !permissions.includes('ORDERS_TAKE') && !permissions.includes('PAYMENTS_TAKE')) {
      fail('Staff need at least "Take orders" or "Take payments".');
    }
    if (body.userId) {
      const row = db.users.find((x) => x.userId === body.userId);
      if (!row || (!isPlatform && row.businessId !== u.businessId)) fail('Person not found.', 404);
      const r = row as UserRow;
      if (r.userId === u.userId && r.roleCode !== body.roleCode) fail('You cannot change your own role.');
      Object.assign(r, { fullName: name, mobileNo: mobile, email, roleCode: body.roleCode, businessId, permissions });
      if (body.password) {
        if (clean(body.password).length < 6) fail('Password must be at least 6 characters.');
        r.password = clean(body.password);
      }
      touch(r, u);
      writeAudit(u, 'USER_UPDATE', 'users', r.userId, `${name} (${body.roleCode})`, '', businessId);
    } else {
      if (clean(body.password).length < 6) fail('Password must be at least 6 characters.');
      if (businessId) seatCheck(businessId);
      const userId = nextId();
      db.users.push({
        userId, businessId, roleCode: body.roleCode, fullName: name, mobileNo: mobile, email, password: clean(body.password),
        preferredLanguage: 'mr', permissions, lastLoginDate: null, ...auditCols(u.userId),
      });
      writeAudit(u, 'USER_CREATE', 'users', userId, `${name} (${body.roleCode})`, '', businessId);
    }
    commit();
    return true;
  },
  '/User/SetStatus': (body: UserStatusRequest, ctx) => {
    const u = me(ctx);
    const isPlatform = canPage(u, 'ALL_USERS', 'E');
    if (!isPlatform) need(ctx, 'TEAM', 'E');
    const r = getDb().users.find((x) => x.userId === body.userId);
    if (!r || (!isPlatform && r.businessId !== u.businessId)) fail('Person not found.', 404);
    const row = r as UserRow;
    if (row.userId === u.userId) fail('You cannot turn off your own login.');
    if (body.isActive && row.businessId) seatCheck(row.businessId);
    row.isActive = body.isActive;
    touch(row, u);
    writeAudit(u, body.isActive ? 'USER_ACTIVATE' : 'USER_DEACTIVATE', 'users', row.userId, row.fullName, '', row.businessId);
    commit();
    return true;
  },

  // ---------------- menu
  '/MenuItem/GetCategories': (_b: never, ctx) => {
    const bid = myBusinessId(ctx);
    return getDb().categories.filter((c) => c.businessId === bid && c.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  },
  '/MenuItem/SaveCategory': (body: CategorySaveRequest, ctx) => {
    const u = need(ctx, 'MENU', body.categoryId ? 'E' : 'A');
    const bid = myBusinessId(ctx);
    const db = getDb();
    const name = clean(body.categoryName);
    if (!name) fail('Group name is required.');
    const mine = db.categories.filter((c) => c.businessId === bid && c.isActive);
    if (mine.some((c) => c.categoryName.toLowerCase() === name.toLowerCase() && c.categoryId !== body.categoryId)) fail('This group already exists.');
    if (body.categoryId) {
      const c = mine.find((x) => x.categoryId === body.categoryId) ?? fail('Group not found.', 404);
      c.categoryName = name;
      touch(c, u);
    } else {
      db.categories.push({ categoryId: nextId(), businessId: bid, categoryName: name, sortOrder: mine.length + 1, ...auditCols(u.userId) });
    }
    commit();
    return true;
  },
  '/MenuItem/DeleteCategory': (body: IdRequest, ctx) => {
    const u = need(ctx, 'MENU', 'D');
    const bid = myBusinessId(ctx);
    const db = getDb();
    const c = db.categories.find((x) => x.categoryId === body.id && x.businessId === bid && x.isActive) ?? fail('Group not found.', 404);
    if (db.items.some((i) => i.categoryId === body.id && i.isActive)) fail('Move or remove the dishes in this group first.');
    c.isActive = false;
    touch(c, u);
    commit();
    return true;
  },
  '/MenuItem/GetAll': (_b: never, ctx) => {
    const bid = myBusinessId(ctx);
    return getDb().items.filter((i) => i.businessId === bid && i.isActive).sort((a, b) => a.itemName.localeCompare(b.itemName));
  },
  '/MenuItem/Save': (body: MenuItemSaveRequest, ctx) => {
    const u = need(ctx, 'MENU', body.itemId ? 'E' : 'A');
    const bid = myBusinessId(ctx);
    const db = getDb();
    const name = clean(body.itemName);
    if (!name) fail('Dish name is required.');
    const price = toRupees(toPaise(body.price));
    if (!(price >= 0)) fail('Price cannot be negative.');
    const taxRate = Number(body.taxRate);
    if (!(taxRate >= 0 && taxRate <= 28)) fail('Tax must be between 0 and 28%.');
    const imageUrl = clean(body.imageUrl);
    if (imageUrl && !/^https:\/\//.test(imageUrl)) fail('Photo link must start with https://');
    if (body.categoryId && !db.categories.some((c) => c.categoryId === Number(body.categoryId) && c.businessId === bid && c.isActive)) {
      fail('Choose a valid group.');
    }
    const fields = {
      categoryId: body.categoryId ? Number(body.categoryId) : null, itemCode: clean(body.itemCode), itemName: name, imageUrl,
      unitName: clean(body.unitName) || 'plate', price, taxRate, isVeg: !!body.isVeg, isAvailable: body.isAvailable !== false,
    };
    if (body.itemId) {
      const it = db.items.find((x) => x.itemId === body.itemId && x.businessId === bid && x.isActive) ?? fail('Dish not found.', 404);
      const old = it.price;
      Object.assign(touch(it, u), fields);
      writeAudit(u, old !== price ? 'PRICE_CHANGE' : 'ITEM_UPDATE', 'menu_items', it.itemId, old !== price ? `${name}: ₹${old} → ₹${price}` : name);
    } else {
      const itemId = nextId();
      db.items.push({ itemId, businessId: bid, ...fields, ...auditCols(u.userId) });
      writeAudit(u, 'ITEM_CREATE', 'menu_items', itemId, name);
    }
    commit();
    return true;
  },
  '/MenuItem/SetAvailability': (body: ItemAvailabilityRequest, ctx) => {
    const u = need(ctx, 'MENU', 'E');
    const bid = myBusinessId(ctx);
    const it = getDb().items.find((x) => x.itemId === body.itemId && x.businessId === bid && x.isActive) ?? fail('Dish not found.', 404);
    it.isAvailable = body.isAvailable;
    touch(it, u);
    writeAudit(u, body.isAvailable ? 'ITEM_AVAILABLE' : 'ITEM_SOLD_OUT', 'menu_items', it.itemId, it.itemName);
    commit();
    return true;
  },

  // ---------------- tables
  '/Table/GetFloor': (_b: never, ctx): TableCard[] => {
    need(ctx, 'TABLES');
    const bid = myBusinessId(ctx);
    const db = getDb();
    const num = (s: string) => Number((s.match(/\d+/) ?? ['0'])[0]);
    return db.tables
      .filter((t) => t.businessId === bid && t.isActive)
      .sort((a, b) => num(a.tableName) - num(b.tableName) || a.tableName.localeCompare(b.tableName))
      .map((t) => {
        const o = t.currentOrderId ? db.orders.find((x) => x.orderId === t.currentOrderId) : undefined;
        return {
          tableId: t.tableId, businessId: t.businessId, tableName: t.tableName, areaName: t.areaName, seats: t.seats,
          tableStatus: t.tableStatus, currentOrderId: t.currentOrderId, orderTotal: o?.totalAmount ?? 0,
          orderBalance: o?.balanceAmount ?? 0, itemCount: o ? o.items.reduce((s, i) => s + i.quantity, 0) : 0,
          since: o ? (o.orderStatus === 'OPEN' ? o.insertedDate : o.billedDate) : null,
        };
      });
  },
  '/Table/Add': (_b: never, ctx) => {
    const u = need(ctx, 'TABLES', 'A');
    const bid = myBusinessId(ctx);
    const db = getDb();
    const mine = db.tables.filter((t) => t.businessId === bid && t.isActive);
    const plan = db.plans.find((p) => p.planId === business(bid).planId);
    if (plan?.maxTables && mine.length >= plan.maxTables) fail(`The ${plan.planName} plan allows ${plan.maxTables} tables.`);
    const n = Math.max(0, ...mine.map((t) => Number((t.tableName.match(/\d+/) ?? ['0'])[0]))) + 1;
    const tableId = nextId();
    db.tables.push({ tableId, businessId: bid, tableName: `Table ${n}`, areaName: '', seats: 4, tableStatus: 'AVAILABLE', currentOrderId: null, ...auditCols(u.userId) });
    writeAudit(u, 'TABLE_CREATE', 'dining_tables', tableId, `Table ${n}`);
    commit();
    return tableId;
  },
  '/Table/Remove': (body: IdRequest, ctx) => {
    const u = need(ctx, 'TABLES', 'D');
    const bid = myBusinessId(ctx);
    const t = getDb().tables.find((x) => x.tableId === body.id && x.businessId === bid && x.isActive) ?? fail('Table not found.', 404);
    if (t.tableStatus !== 'AVAILABLE') fail('Finish the order on this table first.');
    t.isActive = false;
    touch(t, u);
    writeAudit(u, 'TABLE_REMOVE', 'dining_tables', t.tableId, t.tableName);
    commit();
    return true;
  },

  // ---------------- customers
  '/Customer/GetAll': (_b: never, ctx): CustomerListItem[] => {
    need(ctx, 'CUSTOMERS');
    const bid = myBusinessId(ctx);
    const db = getDb();
    return db.customers
      .filter((c) => c.businessId === bid && c.isActive)
      .map((c) => {
        const orders = db.orders.filter((o) => o.customerId === c.customerId && billedStatuses.includes(o.orderStatus));
        return { ...c, billCount: orders.length, billed: sum(orders, (o) => o.totalAmount), balance: sum(orders, (o) => o.balanceAmount) };
      })
      .sort((a, b) => a.customerName.localeCompare(b.customerName));
  },
  '/Customer/Save': (body: CustomerSaveRequest, ctx) => {
    const u = needPerm(ctx, 'ORDERS_TAKE');
    need(ctx, 'CUSTOMERS', body.customerId ? 'E' : 'A');
    const bid = myBusinessId(ctx);
    const db = getDb();
    const name = clean(body.customerName);
    if (!name) fail('Customer name is required.');
    if (clean(body.email) && !isEmail(clean(body.email))) fail('Email is not valid.');
    const fields = { customerName: name, mobileNo: clean(body.mobileNo), email: clean(body.email), addressLine: clean(body.addressLine), gstin: clean(body.gstin).toUpperCase() };
    let customerId = body.customerId;
    if (customerId) {
      const c = db.customers.find((x) => x.customerId === customerId && x.businessId === bid && x.isActive) ?? fail('Customer not found.', 404);
      Object.assign(touch(c, u), fields);
    } else {
      customerId = nextId();
      db.customers.push({ customerId, businessId: bid, ...fields, ...auditCols(u.userId) });
    }
    commit();
    return customerId;
  },
  '/Customer/Delete': (body: IdRequest, ctx) => {
    const u = need(ctx, 'CUSTOMERS', 'D');
    const bid = myBusinessId(ctx);
    const db = getDb();
    const c = db.customers.find((x) => x.customerId === body.id && x.businessId === bid && x.isActive) ?? fail('Customer not found.', 404);
    if (db.orders.some((o) => o.customerId === body.id)) fail('This customer has bills and cannot be removed.');
    c.isActive = false;
    touch(c, u);
    commit();
    return true;
  },

  // ---------------- orders / bills
  '/Order/GetAll': (body: OrderFilter, ctx): OrderListItem[] => {
    const u = need(ctx, 'BILLS');
    const bid = myBusinessId(ctx);
    const q = clean(body?.search).toLowerCase();
    return getDb()
      .orders.filter((o) => o.businessId === bid && o.isActive)
      .filter((o) => !body?.mineOnly || o.waiterUserId === u.userId || o.billedBy === u.userId)
      .filter((o) => !body?.status || body.status === 'ALL' || o.orderStatus === body.status)
      .filter((o) => !q || [o.billNo, o.customerName, tableName(o.tableId), userName(o.waiterUserId)].join(' ').toLowerCase().includes(q))
      .sort((a, b) => (a.insertedDate < b.insertedDate ? 1 : -1))
      .map(toListItem);
  },
  '/Order/GetById': (body: IdRequest, ctx): OrderDetail => {
    need(ctx, 'BILLS');
    const o = myOrder(ctx, body.id);
    return { order: toOrder(o), payments: orderPayments(o.orderId).map(toPayment) };
  },
  '/Order/Save': (body: OrderSaveRequest, ctx): Order => {
    const u = needPerm(ctx, 'ORDERS_TAKE');
    const bid = myBusinessId(ctx);
    const db = getDb();
    const b = business(bid);
    let o: OrderRow | null = null;
    if (body.orderId) {
      o = myOrder(ctx, body.orderId);
      if (o.orderStatus !== 'OPEN') fail('This bill is already made and cannot be changed.');
    } else if (body.tableId) {
      const t = db.tables.find((x) => x.tableId === body.tableId && x.businessId === bid && x.isActive) ?? fail('Table not found.', 404);
      if (t.tableStatus !== 'AVAILABLE') fail(`${t.tableName} already has an order. Open it from Tables.`);
    }
    const discountType = body.discountType ?? 'NONE';
    const discountValue = discountType === 'NONE' ? 0 : Math.max(0, Number(body.discountValue) || 0);
    if (discountValue > 0 && !hasPerm(u, 'DISCOUNTS_GIVE')) fail('You are not allowed to give discounts.');
    const items = db.items.filter((i) => i.businessId === bid && i.isActive);
    const lines = (body.lines ?? []).map((l) => {
      const qty = Number(l.quantity);
      if (!(qty > 0)) fail(`Quantity for "${l.itemName}" must be more than zero.`);
      if (l.itemId) {
        const it = items.find((x) => x.itemId === l.itemId) ?? fail('A dish on this order is no longer on the menu.');
        // staff always bill the menu price (or the price already on this open order)
        const kept = o?.items.find((x) => x.itemId === it.itemId);
        const unitPrice = u.roleCode === 'STAFF' ? (kept?.unitPrice ?? it.price) : toRupees(toPaise(l.unitPrice));
        return { itemId: it.itemId, itemName: it.itemName, unitName: it.unitName, quantity: qty, unitPrice, taxRate: it.taxRate };
      }
      if (u.roleCode === 'STAFF') fail('Only the owner can add custom lines.');
      if (!clean(l.itemName)) fail('Every line needs a name.');
      return { itemId: null, itemName: clean(l.itemName), unitName: 'pc', quantity: qty, unitPrice: toRupees(toPaise(l.unitPrice)), taxRate: Number(l.taxRate) || 0 };
    });
    if (!lines.length) fail('Add at least one dish.');
    const serviceChargePct = u.roleCode === 'STAFF' ? b.serviceChargePct : Math.max(0, Number(body.serviceChargePct) || 0);
    const calc = calculateBill({ lines, discountType, discountValue, serviceChargePct });
    const table = body.tableId ? db.tables.find((t) => t.tableId === body.tableId) : undefined;
    const customer = body.customerId ? db.customers.find((c) => c.customerId === body.customerId && c.businessId === bid) : undefined;
    const fields = {
      orderType: table ? ('DINE_IN' as const) : body.orderType === 'COUNTER' ? ('COUNTER' as const) : ('TAKEAWAY' as const),
      tableId: table?.tableId ?? null, customerId: customer?.customerId ?? null,
      customerName: table?.tableName ?? customer?.customerName ?? 'Takeaway', subTotal: calc.subTotal, discountType, discountValue,
      discountAmount: calc.discountAmount, taxAmount: calc.taxAmount, taxLines: calc.taxLines, serviceChargePct,
      serviceChargeAmount: calc.serviceChargeAmount, totalAmount: calc.totalAmount, notes: clean(body.notes),
      items: lines.map((l, i) => ({ orderItemId: nextId(), ...l, ...calc.lines[i] })),
    };
    if (o) {
      Object.assign(touch(o, u), fields);
      writeAudit(u, 'ORDER_UPDATE', 'orders', o.orderId, o.customerName);
    } else {
      const created = nowIso();
      o = {
        orderId: nextId(), businessId: bid, billNo: null, orderStatus: 'OPEN', businessDate: businessDateOf(created), paidAmount: 0,
        balanceAmount: 0, waiterUserId: u.userId, billedBy: null, billedDate: null, paidDate: null, cancelledBy: null,
        cancelledDate: null, cancelReason: '', ...fields, ...auditCols(u.userId),
      };
      db.orders.push(o);
      writeAudit(u, 'ORDER_CREATE', 'orders', o.orderId, o.customerName);
    }
    if (discountValue > 0) writeAudit(u, 'DISCOUNT_GIVEN', 'orders', o.orderId, `${discountType === 'PERCENT' ? `${discountValue}%` : `₹${discountValue}`}`, clean(body.discountReason));
    if (body.makeBill) giveBillNo(o, u);
    syncTable(o);
    commit();
    return toOrder(o);
  },
  '/Order/MakeBill': (body: IdRequest, ctx): Order => {
    const u = needPerm(ctx, 'ORDERS_TAKE');
    const o = myOrder(ctx, body.id);
    if (o.orderStatus !== 'OPEN') fail('This bill is already made.');
    giveBillNo(o, u);
    syncTable(o);
    commit();
    return toOrder(o);
  },
  '/Order/Cancel': (body: ReasonRequest, ctx) => {
    const u = needPerm(ctx, 'BILLS_CANCEL');
    const o = myOrder(ctx, body.id);
    if (!clean(body.reason)) fail('Write a reason to cancel.');
    if (o.orderStatus === 'CANCELLED') fail('Already cancelled.');
    if (summarizePayments(o.totalAmount, orderPayments(o.orderId)).paidAmount > 0) fail('Refund the money first, then cancel.');
    o.orderStatus = 'CANCELLED';
    o.cancelledBy = u.userId;
    o.cancelledDate = nowIso();
    o.cancelReason = clean(body.reason);
    o.balanceAmount = 0;
    touch(o, u);
    if (o.tableId) {
      const t = getDb().tables.find((x) => x.tableId === o.tableId);
      if (t && t.currentOrderId === o.orderId) {
        t.tableStatus = 'AVAILABLE';
        t.currentOrderId = null;
      }
    }
    writeAudit(u, 'BILL_CANCEL', 'orders', o.orderId, o.billNo ?? o.customerName, o.cancelReason);
    commit();
    return true;
  },

  // ---------------- payments
  '/Payment/GetAll': (_b: never, ctx): Payment[] => {
    need(ctx, 'PAYMENTS');
    const bid = myBusinessId(ctx);
    return getDb()
      .payments.filter((p) => p.businessId === bid && p.isActive)
      .sort((a, b) => (a.receivedDate < b.receivedDate ? 1 : -1))
      .map(toPayment);
  },
  '/Payment/Save': (body: PaymentSaveRequest, ctx) => {
    const u = needPerm(ctx, 'PAYMENTS_TAKE');
    const o = myOrder(ctx, body.orderId);
    const db = getDb();
    if (!['BILLED', 'PART_PAID', 'REFUNDED'].includes(o.orderStatus)) fail('Make the bill first, then mark it paid.');
    if (db.payments.some((p) => p.businessId === o.businessId && p.requestKey === body.requestKey)) fail('This payment is already saved.');
    if (body.paymentMode !== 'CASH' && body.paymentMode !== 'UPI') fail('Choose cash or UPI.');
    const amount = toRupees(toPaise(body.amount));
    const err = validatePaymentAmount(amount, summarizePayments(o.totalAmount, orderPayments(o.orderId)).balanceAmount);
    if (err) fail(err);
    const cash = body.paymentMode === 'CASH' && body.cashReceived ? toRupees(toPaise(body.cashReceived)) : null;
    if (cash !== null && cash < amount) fail('Cash given is less than the amount.');
    const now = nowIso();
    const paymentId = nextId();
    db.payments.push({
      paymentId, businessId: o.businessId, orderId: o.orderId, paymentType: 'PAYMENT', paymentMode: body.paymentMode, amount,
      cashReceived: cash, changeReturned: cash !== null ? toRupees(toPaise(cash) - toPaise(amount)) : null, refundOfPaymentId: null,
      isRefunded: false, reason: '', businessDate: businessDateOf(now), requestKey: body.requestKey, receivedBy: u.userId,
      receivedDate: now, ...auditCols(u.userId),
    });
    refreshMoney(o);
    writeAudit(u, 'PAYMENT_RECEIVED', 'payments', paymentId, `${o.billNo}: ${body.paymentMode} ₹${amount}`);
    commit();
    return toOrder(o);
  },
  '/Payment/Refund': (body: RefundRequest, ctx) => {
    const u = me(ctx);
    if (u.roleCode !== 'OWNER') fail('Only the owner can refund.', 403);
    const bid = myBusinessId(ctx);
    const db = getDb();
    if (!clean(body.reason)) fail('Write a reason for the refund.');
    const p = db.payments.find((x) => x.paymentId === body.paymentId && x.businessId === bid && x.isActive) ?? fail('Payment not found.', 404);
    if (p.paymentType !== 'PAYMENT' || p.isRefunded) fail('This payment cannot be refunded.');
    const o = myOrder(ctx, p.orderId);
    p.isRefunded = true;
    touch(p, u);
    const now = nowIso();
    db.payments.push({
      paymentId: nextId(), businessId: bid, orderId: o.orderId, paymentType: 'REFUND', paymentMode: p.paymentMode, amount: p.amount,
      cashReceived: null, changeReturned: null, refundOfPaymentId: p.paymentId, isRefunded: false, reason: clean(body.reason),
      businessDate: businessDateOf(now), requestKey: `refund-${p.paymentId}`, receivedBy: u.userId, receivedDate: now, ...auditCols(u.userId),
    });
    refreshMoney(o);
    writeAudit(u, 'PAYMENT_REFUND', 'payments', p.paymentId, `${o.billNo}: ₹${p.amount}`, clean(body.reason));
    commit();
    return true;
  },

  // ---------------- reports
  '/Report/GetDashboard': (_b: never, ctx): DashboardSummary => {
    const u = need(ctx, 'HOME');
    const bid = myBusinessId(ctx);
    const db = getDb();
    const ownOnly = !hasPerm(u, 'SALES_VIEW');
    const today = dayKey();
    const mine = (o: OrderRow) => !ownOnly || o.waiterUserId === u.userId || o.billedBy === u.userId;
    const orders = db.orders.filter((o) => o.businessId === bid && o.isActive && mine(o));
    const billed = orders.filter((o) => billedStatuses.includes(o.orderStatus));
    const todayBills = billed.filter((o) => o.businessDate === today);
    const pending = billed.filter((o) => o.balanceAmount > 0);
    const pays = db.payments.filter((p) => p.businessId === bid && p.businessDate === today && (!ownOnly || p.receivedBy === u.userId));
    const tables = db.tables.filter((t) => t.businessId === bid && t.isActive);
    const days: ChartPoint[] = [];
    for (let k = 13; k >= 0; k--) {
      const d = shiftDay(today, -k);
      days.push({ label: d.slice(5), value: sum(billed.filter((o) => o.businessDate === d), (o) => o.totalAmount) });
    }
    return {
      ownOnly,
      salesToday: sum(todayBills, (o) => o.totalAmount),
      billsToday: todayBills.length,
      collectedToday: sum(pays, (p) => (p.paymentType === 'REFUND' ? -p.amount : p.amount)),
      pendingAmount: sum(pending, (o) => o.balanceAmount),
      pendingCount: pending.length,
      openOrders: orders.filter((o) => o.orderStatus === 'OPEN').length,
      busyTables: tables.filter((t) => t.tableStatus !== 'AVAILABLE').length,
      totalTables: tables.length,
      last14Days: days,
      topItems: topItems(billed, 'value', 5),
      recentOrders: [...orders].sort((a, b) => (a.insertedDate < b.insertedDate ? 1 : -1)).slice(0, 6).map(toListItem),
    };
  },
  '/Report/GetSales': (body: ReportRequest, ctx): SalesReport => {
    need(ctx, 'REPORTS');
    const bid = myBusinessId(ctx);
    const db = getDb();
    const inRange = (d: string) => d >= body.fromDate && d <= body.toDate;
    const all = db.orders.filter((o) => o.businessId === bid && o.isActive);
    const valid = all.filter((o) => billedStatuses.includes(o.orderStatus) && inRange(o.businessDate));
    const cancelled = all.filter((o) => o.orderStatus === 'CANCELLED' && inRange(o.businessDate));
    const pays = db.payments.filter((p) => p.businessId === bid && inRange(p.businessDate));
    const net = (mode: 'CASH' | 'UPI') => sum(pays.filter((p) => p.paymentMode === mode), (p) => (p.paymentType === 'REFUND' ? -p.amount : p.amount));
    const days: ChartPoint[] = [];
    for (let d = body.fromDate; d <= body.toDate && days.length < 92; d = shiftDay(d, 1)) {
      days.push({ label: d.slice(5), value: sum(valid.filter((o) => o.businessDate === d), (o) => o.totalAmount) });
    }
    const staff = new Map<string, number>();
    valid.forEach((o) => {
      const n = userName(o.waiterUserId) || '—';
      staff.set(n, (staff.get(n) ?? 0) + toPaise(o.totalAmount));
    });
    const unpaid = all.filter((o) => ['BILLED', 'PART_PAID'].includes(o.orderStatus) && o.balanceAmount > 0);
    return {
      billCount: valid.length,
      grossSales: sum(valid, (o) => o.totalAmount),
      subTotal: sum(valid, (o) => o.subTotal),
      discount: sum(valid, (o) => o.discountAmount),
      tax: sum(valid, (o) => o.taxAmount),
      serviceCharge: sum(valid, (o) => o.serviceChargeAmount),
      received: sum(pays.filter((p) => p.paymentType === 'PAYMENT'), (p) => p.amount),
      refunded: sum(pays.filter((p) => p.paymentType === 'REFUND'), (p) => p.amount),
      cashTotal: net('CASH'),
      upiTotal: net('UPI'),
      cancelledCount: cancelled.length,
      cancelledValue: sum(cancelled, (o) => o.totalAmount),
      unpaidTotal: sum(unpaid, (o) => o.balanceAmount),
      days,
      topByValue: topItems(valid, 'value', 10),
      topByQty: topItems(valid, 'qty', 10),
      byStaff: [...staff].map(([label, v]) => ({ label, value: toRupees(v) })).sort((a, b) => b.value - a.value),
      unpaid: unpaid.map(toListItem),
      cancelled: cancelled.map(toListItem),
    };
  },

  // ---------------- audit
  '/Audit/GetAll': (_b: never, ctx): AuditLog[] => {
    const u = need(ctx, 'AUDIT_LOG');
    const db = getDb();
    const rows = u.roleCode === 'SUPER_ADMIN' ? db.audit : db.audit.filter((a) => a.businessId === u.businessId);
    return rows.slice(0, 500).map((a) => {
      const who = db.users.find((x) => x.userId === a.userId);
      return {
        auditLogId: a.auditLogId, businessId: a.businessId,
        businessName: a.businessId ? (db.businesses.find((b) => b.businessId === a.businessId)?.businessName ?? '') : 'Platform',
        userName: who?.fullName ?? 'System', roleCode: who?.roleCode ?? '', actionCode: a.actionCode, entityName: a.entityName,
        details: a.details, reason: a.reason, actionDate: a.actionDate,
      };
    });
  },
};
