import type { BusinessType } from './business';
import type { LanguageCode } from './common';

export type RoleCode = 'SUPER_ADMIN' | 'OWNER' | 'STAFF';

/** Tick-box permissions an owner gives a staff member (permissions table). */
export type PermissionCode = 'ORDERS_TAKE' | 'PAYMENTS_TAKE' | 'DISCOUNTS_GIVE' | 'BILLS_CANCEL' | 'SALES_VIEW';

export const PERMISSION_CODES: PermissionCode[] = [
  'ORDERS_TAKE',
  'PAYMENTS_TAKE',
  'DISCOUNTS_GIVE',
  'BILLS_CANCEL',
  'SALES_VIEW',
];

/** What the browser keeps about the signed-in person (sessionStorage.jwtUser). */
export type SessionUser = {
  userId: number;
  businessId: number | null;
  businessName: string | null;
  roleCode: RoleCode;
  fullName: string;
  mobileNo: string;
  email: string | null;
  permissions: PermissionCode[];
  preferredLanguage: LanguageCode;
  currencyCode: string;
};

export type SignInRequest = { loginId: string; password: string };

export type SignInData = {
  accessToken: string;
  /** Long-lived token for /Auth/Refresh (the mock backend sends none). */
  refreshToken?: string | null;
  user: SessionUser;
  mustChangePassword: boolean;
};

export type OtpPurpose = 'REGISTER' | 'RESET_PASSWORD';
export type SendOtpRequest = { mobileNo: string; purpose: OtpPurpose };
/** devOtp is filled only while the server runs without SMS (development). */
export type SendOtpData = { sent: boolean; validMinutes: number; devOtp: string | null };

/** Owner signs up a new business (after /Auth/SendOtp with purpose REGISTER). */
export type RegisterRequest = {
  businessName: string;
  businessType: BusinessType;
  ownerName: string;
  mobileNo: string;
  email: string | null;
  password: string;
  otp: string;
};
export type ResetPasswordRequest = { mobileNo: string; otp: string; newPassword: string };
export type RefreshRequest = { refreshToken: string };

export type ChangePasswordRequest = { currentPassword: string; newPassword: string };
export type UpdateProfileRequest = { fullName: string; mobileNo: string; preferredLanguage: LanguageCode };
