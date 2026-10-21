import type { LanguageCode } from './common';

export type BusinessStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';
export type BusinessType = 'RESTAURANT' | 'CAFE' | 'SHOP' | 'SERVICE';

export type Plan = {
  planId: number;
  planCode: string;
  planName: string;
  description: string;
  monthlyPrice: number;
  maxUsers: number;
  maxTables: number | null;
};

export type Business = {
  businessId: number;
  businessCode: string;
  businessName: string;
  businessType: BusinessType;
  ownerName: string;
  mobileNo: string;
  email: string;
  addressLine: string;
  gstin: string;
  currencyCode: string;
  defaultLanguage: LanguageCode;
  billPrefix: string;
  nextBillNo: number;
  defaultTaxRate: number;
  serviceChargePct: number;
  serviceChargeLabel: string;
  billFooterNote: string;
  planId: number;
  status: BusinessStatus;
  statusReason: string;
  insertedDate: string;
};

export type BusinessListItem = Business & {
  planName: string;
  maxUsers: number;
  userCount: number;
  billCount: number;
  collected: number;
};

export type BusinessSaveRequest = {
  businessId?: number;
  businessName: string;
  businessType: BusinessType;
  mobileNo: string;
  email: string;
  addressLine: string;
  gstin: string;
  planId: number;
  billPrefix: string;
  /** only when creating */
  ownerName?: string;
  ownerMobileNo?: string;
  ownerPassword?: string;
};

export type BusinessStatusRequest = { businessId: number; status: BusinessStatus; reason: string };

export type SettingsSaveRequest = Pick<
  Business,
  | 'businessName'
  | 'mobileNo'
  | 'email'
  | 'addressLine'
  | 'gstin'
  | 'billPrefix'
  | 'defaultTaxRate'
  | 'serviceChargePct'
  | 'serviceChargeLabel'
  | 'billFooterNote'
  | 'defaultLanguage'
>;

export type PlanSaveRequest = Omit<Plan, 'planId'> & { planId?: number };

export type PlatformStats = {
  businesses: number;
  activeBusinesses: number;
  suspendedBusinesses: number;
  users: number;
  bills: number;
  monthlyRevenue: number;
  collected: number;
  byBusiness: { label: string; value: number }[];
  byPlan: { label: string; value: number }[];
};
