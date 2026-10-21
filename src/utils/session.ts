// Reads the signed-in user from sessionStorage.jwtUser (written at login by
// utils/hooks/useAuth). Same idea as Health 360's utils/session.ts.
import type { PermissionCode, RoleCode, SessionUser } from '@/types/auth';

export const ACCESS_TOKEN_KEY = 'accessToken';
export const REFRESH_TOKEN_KEY = 'refreshToken';
export const JWT_USER_KEY = 'jwtUser';

export function getSessionUser(): SessionUser | null {
  try {
    const raw = sessionStorage.getItem(JWT_USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function setSessionUser(user: SessionUser | null): void {
  try {
    if (user) sessionStorage.setItem(JWT_USER_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(JWT_USER_KEY);
  } catch {
    /* storage blocked: session lasts only in memory */
  }
}

export function getCurrentUserId(): number {
  return getSessionUser()?.userId ?? 0;
}

export function getCurrentBusinessId(): number | null {
  return getSessionUser()?.businessId ?? null;
}

export function getCurrentRole(): RoleCode | null {
  return getSessionUser()?.roleCode ?? null;
}

/** Owner and platform admin have every permission; staff only the ticked ones. */
export function hasPermission(code: PermissionCode, user: SessionUser | null = getSessionUser()): boolean {
  if (!user) return false;
  if (user.roleCode !== 'STAFF') return true;
  return user.permissions.includes(code);
}
