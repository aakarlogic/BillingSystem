import type { OrderListItem } from './order';

export type ChartPoint = { label: string; value: number };

export type DashboardSummary = {
  ownOnly: boolean;
  salesToday: number;
  billsToday: number;
  collectedToday: number;
  pendingAmount: number;
  pendingCount: number;
  openOrders: number;
  busyTables: number;
  totalTables: number;
  last14Days: ChartPoint[];
  topItems: ChartPoint[];
  recentOrders: OrderListItem[];
};

export type ReportRequest = { fromDate: string; toDate: string };

export type SalesReport = {
  billCount: number;
  grossSales: number;
  subTotal: number;
  discount: number;
  tax: number;
  serviceCharge: number;
  received: number;
  refunded: number;
  cashTotal: number;
  upiTotal: number;
  cancelledCount: number;
  cancelledValue: number;
  unpaidTotal: number;
  days: ChartPoint[];
  topByValue: ChartPoint[];
  topByQty: ChartPoint[];
  byStaff: ChartPoint[];
  unpaid: OrderListItem[];
  cancelled: OrderListItem[];
};

export type AuditLog = {
  auditLogId: number;
  businessId: number | null;
  businessName: string;
  userName: string;
  roleCode: string;
  actionCode: string;
  entityName: string;
  details: string;
  reason: string;
  actionDate: string;
};
