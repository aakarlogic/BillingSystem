// Token helpers. Works with a real JWT from the backend and with the mock token.
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/utils/session';

type TokenPayload = { sub?: string | number; exp?: number };

function base64UrlDecode(part: string): string {
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
  return decodeURIComponent(
    atob(b64)
      .split('')
      .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join(''),
  );
}

function base64UrlEncode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const [, payload] = token.split('.');
    return payload ? (JSON.parse(base64UrlDecode(payload)) as TokenPayload) : null;
  } catch {
    return null;
  }
}

export function isValidToken(token: string | null): boolean {
  if (!token) return false;
  const payload = decodeToken(token);
  return !!payload?.exp && payload.exp > Date.now() / 1000;
}

export function getAccessToken(): string | null {
  try {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  try {
    return sessionStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** Saves the tokens; null signs out (clears both). Leave refreshToken out to keep the saved one. */
export function setSession(accessToken: string | null, refreshToken?: string | null): void {
  try {
    if (accessToken) sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    else sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    if (!accessToken || refreshToken === null) sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    else if (refreshToken) sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch {
    /* ignore */
  }
}

/** Unsigned token in JWT shape. Only the mock backend uses this. */
export function createMockToken(userId: number, hours = 12): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = base64UrlEncode(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + hours * 3600 }));
  return `${header}.${payload}.mock`;
}
