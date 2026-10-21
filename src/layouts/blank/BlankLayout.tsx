import { Outlet } from 'react-router';

/** Full-screen pages with no side menu (login, errors). */
export default function BlankLayout() {
  return <Outlet />;
}
