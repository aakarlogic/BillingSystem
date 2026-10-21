import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';

/** Public website pages (home, guide). Scrolls to top on page change. */
export default function FrontendLayout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return <Outlet />;
}
