import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getAccessToken, getRefreshToken, isValidToken, setSession } from '@/guards/jwt/jwt';
import { apiGetMe, apiSignIn, apiSignOut } from '@/services/AuthService';
import { apiGetMenuBinding } from '@/services/MenuPermissionService';
import type { PermissionCode, SessionUser, SignInData, SignInRequest } from '@/types/auth';
import type { MenuAction, MenuBindingItem, PageCode } from '@/types/menuPermission';
import { formatMoney } from '@/utils/money';
import { getSessionUser, hasPermission, setSessionUser } from '@/utils/session';

type UserDataValue = {
  user: SessionUser | null;
  menu: MenuBindingItem[] | null;
  signIn: (req: SignInRequest) => Promise<SessionUser>;
  /** Keep the tokens and person from a Login / Register answer and load the menu. */
  startSession: (data: SignInData) => Promise<SessionUser>;
  signOut: () => Promise<void>;
  setUser: (u: SessionUser) => void;
  /** Role page right for the current person (from the menu-binding API). */
  canPage: (page: PageCode, action?: MenuAction) => boolean;
  can: (permission: PermissionCode) => boolean;
  money: (rupees: number) => string;
};

const UserDataContext = createContext<UserDataValue | null>(null);

const ACTION_FIELD: Record<MenuAction, keyof MenuBindingItem> = {
  view: 'canView',
  add: 'canAdd',
  edit: 'canEdit',
  delete: 'canDelete',
  export: 'canExport',
};

export function UserDataProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<SessionUser | null>(() =>
    isValidToken(getAccessToken()) || getRefreshToken() ? getSessionUser() : null,
  );
  const [menu, setMenu] = useState<MenuBindingItem[] | null>(null);

  const setUser = useCallback((u: SessionUser) => {
    setSessionUser(u);
    setUserState(u);
  }, []);

  const loadMenu = useCallback(async () => {
    const data = await apiGetMenuBinding();
    setMenu(data.menuList);
  }, []);

  // Page refresh: refresh the person and their menu from the server.
  useEffect(() => {
    if (!user) return;
    apiGetMe().then(setUser).catch(() => undefined);
    loadMenu().catch(() => setMenu([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startSession = useCallback(
    async (data: SignInData) => {
      setSession(data.accessToken, data.refreshToken ?? null);
      setUser(data.user);
      await loadMenu();
      return data.user;
    },
    [loadMenu, setUser],
  );

  const signIn = useCallback(async (req: SignInRequest) => startSession(await apiSignIn(req)), [startSession]);

  const signOut = useCallback(async () => {
    await apiSignOut().catch(() => undefined);
    setSession(null);
    setSessionUser(null);
    setUserState(null);
    setMenu(null);
  }, []);

  const value = useMemo<UserDataValue>(
    () => ({
      user,
      menu,
      signIn,
      startSession,
      signOut,
      setUser,
      canPage: (page, action = 'view') => !!menu?.find((m) => m.pageCode === page)?.[ACTION_FIELD[action]],
      can: (permission) => hasPermission(permission, user),
      money: (rupees) => formatMoney(rupees, user?.currencyCode ?? 'INR'),
    }),
    [user, menu, signIn, startSession, signOut, setUser],
  );

  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
}

export function useUserData(): UserDataValue {
  const ctx = useContext(UserDataContext);
  if (!ctx) throw new Error('useUserData must be used inside UserDataProvider');
  return ctx;
}
