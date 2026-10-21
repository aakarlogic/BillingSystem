import type { ReactNode } from 'react';
import Spinner from '@/components/ui/spinner';
import { useUserData } from '@/context/UserDataContext';
import type { MenuAction, PageCode } from '@/types/menuPermission';
import UnauthorizedPage from './UnauthorizedPage';

type MenuActionGuardProps = { page: PageCode | PageCode[]; action?: MenuAction; children: ReactNode };

/**
 * Shows the page only if the role page rights allow it (menu-binding API).
 * Like Health 360's MenuActionGuard, but rights are loaded once at login
 * instead of one API call per page.
 */
const MenuActionGuard = ({ page, action = 'view', children }: MenuActionGuardProps) => {
  const { menu, canPage } = useUserData();
  if (menu === null) return <Spinner />;
  const pages = Array.isArray(page) ? page : [page];
  if (!pages.some((p) => canPage(p, action))) return <UnauthorizedPage />;
  return <>{children}</>;
};

export default MenuActionGuard;
