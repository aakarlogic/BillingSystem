import type { PermissionCode, RoleCode } from './auth';
import type { LanguageCode } from './common';

export type User = {
  userId: number;
  businessId: number | null;
  businessName: string | null;
  roleCode: RoleCode;
  fullName: string;
  mobileNo: string;
  email: string;
  preferredLanguage: LanguageCode;
  permissions: PermissionCode[];
  isActive: boolean;
  lastLoginDate: string | null;
};

export type UserSaveRequest = {
  userId?: number;
  businessId?: number | null;
  roleCode: RoleCode;
  fullName: string;
  mobileNo: string;
  email: string;
  password?: string;
  permissions: PermissionCode[];
};

export type UserStatusRequest = { userId: number; isActive: boolean };
