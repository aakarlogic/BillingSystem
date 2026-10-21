import { lazy, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router';
import Loadable from '@/layouts/full/shared/loadable/Loadable';
import ProtectedRoute from '@/components/route/ProtectedRoute';
import PublicRoute from '@/components/route/PublicRoute';
import MenuActionGuard from '@/components/route/MenuActionGuard';
import type { MenuAction, PageCode } from '@/types/menuPermission';

/* *** Layouts *** */
const FullLayout = Loadable(lazy(() => import('@/layouts/full/FullLayout')));
const BlankLayout = Loadable(lazy(() => import('@/layouts/blank/BlankLayout')));
const FrontendLayout = Loadable(lazy(() => import('@/layouts/blank/FrontendLayout')));

/* *** Public pages *** */
const Landing = Loadable(lazy(() => import('@/views/landing/Landing')));
const RestaurantGuide = Loadable(lazy(() => import('@/views/guide/RestaurantGuide')));
const Login = Loadable(lazy(() => import('@/views/authentication/Login')));
const Register = Loadable(lazy(() => import('@/views/authentication/Register')));
const ForgotPassword = Loadable(lazy(() => import('@/views/authentication/ForgotPassword')));
const NotFound = Loadable(lazy(() => import('@/views/authentication/NotFound')));

/* *** App pages *** */
const Dashboard = Loadable(lazy(() => import('@/views/dashboard/Dashboard')));
const Tables = Loadable(lazy(() => import('@/views/tables/Tables')));
const OrderEditor = Loadable(lazy(() => import('@/views/billing/OrderEditor')));
const BillList = Loadable(lazy(() => import('@/views/billing/BillList')));
const BillView = Loadable(lazy(() => import('@/views/billing/BillView')));
const Payments = Loadable(lazy(() => import('@/views/payments/Payments')));
const MenuItems = Loadable(lazy(() => import('@/views/menu/MenuItems')));
const Customers = Loadable(lazy(() => import('@/views/customers/Customers')));
const Reports = Loadable(lazy(() => import('@/views/reports/Reports')));
const Team = Loadable(lazy(() => import('@/views/user-management/Team')));
const Settings = Loadable(lazy(() => import('@/views/settings/Settings')));
const AuditLog = Loadable(lazy(() => import('@/views/audit/AuditLog')));
const Profile = Loadable(lazy(() => import('@/views/user-profile/Profile')));
const Businesses = Loadable(lazy(() => import('@/views/platform/Businesses')));
const Plans = Loadable(lazy(() => import('@/views/platform/Plans')));
const AllUsers = Loadable(lazy(() => import('@/views/platform/AllUsers')));

/** Route that needs a page right (role_page_rights + staff ticks). */
const guarded = (page: PageCode | PageCode[], element: ReactNode, action: MenuAction = 'view') => (
  <MenuActionGuard page={page} action={action}>
    {element}
  </MenuActionGuard>
);

const Router = [
  {
    path: '/',
    element: <FrontendLayout />,
    children: [
      { path: '/guide', element: <RestaurantGuide /> },
      {
        element: <PublicRoute />,
        children: [{ path: '/', element: <Landing /> }],
      },
    ],
  },
  {
    path: '/auth',
    element: <BlankLayout />,
    children: [
      {
        element: <PublicRoute />,
        children: [
          { path: '/auth/login', element: <Login /> },
          { path: '/auth/register', element: <Register /> },
          { path: '/auth/forgot-password', element: <ForgotPassword /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <FullLayout />,
        children: [
          { path: '/dashboard', element: guarded('HOME', <Dashboard />) },
          // billing
          { path: '/tables', element: guarded('TABLES', <Tables />) },
          { path: '/billing/new', element: guarded('NEW_BILL', <OrderEditor />, 'add') },
          { path: '/billing/bills', element: guarded('BILLS', <BillList />) },
          { path: '/billing/bills/:id', element: guarded('BILLS', <BillView />) },
          { path: '/billing/bills/:id/edit', element: guarded('NEW_BILL', <OrderEditor />, 'add') },
          { path: '/payments', element: guarded('PAYMENTS', <Payments />) },
          // manage
          { path: '/menu', element: guarded('MENU', <MenuItems />) },
          { path: '/customers', element: guarded('CUSTOMERS', <Customers />) },
          { path: '/reports', element: guarded('REPORTS', <Reports />) },
          { path: '/user-management/team', element: guarded('TEAM', <Team />) },
          { path: '/settings', element: guarded('SETTINGS', <Settings />) },
          { path: '/audit', element: guarded('AUDIT_LOG', <AuditLog />) },
          { path: '/profile', element: guarded('PROFILE', <Profile />) },
          // platform admin
          { path: '/platform/businesses', element: guarded('BUSINESSES', <Businesses />) },
          { path: '/platform/plans', element: guarded('PLANS', <Plans />) },
          { path: '/platform/users', element: guarded('ALL_USERS', <AllUsers />) },
          { path: '/app/*', element: <NotFound /> },
        ],
      },
    ],
  },
  { path: '/404', element: <NotFound /> },
  { path: '*', element: <Navigate to="/404" replace /> },
];

const router = createBrowserRouter(Router);

export default router;
