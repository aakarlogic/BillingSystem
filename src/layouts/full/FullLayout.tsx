import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import Icon from '@/components/ui/icon';
import { useLanguage } from '@/context/LanguageContext';
import { useUserData } from '@/context/UserDataContext';
import { useIsMobile } from '@/hooks/use-mobile';
import Header from './vertical/header/Header';
import Sidebar from './vertical/sidebar/Sidebar';
import { BOTTOM_BAR, isKnownPage, SIDEBAR_ITEMS } from './vertical/sidebar/Sidebaritems';

const COLLAPSE_KEY = 'pavti_nav_collapsed';

/** Signed-in app shell: side menu + header + page + phone bottom bar. */
export default function FullLayout() {
  const { t } = useLanguage();
  const { user, menu } = useUserData();
  const location = useLocation();
  const phone = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const menuShown = phone ? drawerOpen : !collapsed;
  const toggleMenu = () => (phone ? setDrawerOpen((o) => !o) : setCollapsed((c) => !c));
  const bottom = BOTTOM_BAR.map((code) => menu?.find((m) => m.pageCode === code && m.canView)).filter(
    (m): m is NonNullable<typeof m> => !!m && isKnownPage(m.pageCode),
  );

  return (
    <div className={`shell ${drawerOpen ? 'nav-open' : ''} ${collapsed ? 'nav-collapsed' : ''}`}>
      <Sidebar onClose={() => setDrawerOpen(false)} />
      <div className="scrim" onClick={() => setDrawerOpen(false)} />
      <div className="main">
        <Header menuShown={menuShown} onToggleMenu={toggleMenu} />
        <main className="content">
          <Outlet />
        </main>
        {user?.businessId && bottom.length > 0 && (
          <nav className="bottom-nav" aria-label="Quick">
            {bottom.map((m) => (
              <NavLink key={m.pageCode} to={m.routePath} end={SIDEBAR_ITEMS[m.pageCode].end}>
                <Icon name={SIDEBAR_ITEMS[m.pageCode].icon} size={20} />
                {t(SIDEBAR_ITEMS[m.pageCode].labelKey)}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
