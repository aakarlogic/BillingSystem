// Page master + role page rights, same data as database/seed.sql.
// rights letters: V = view, A = add, E = edit, D = delete, X = export.
import type { PageDefinition } from '@/types/menuPermission';

export const PAGE_DEFINITIONS: PageDefinition[] = [
  { pageCode: 'BUSINESSES', routePath: '/platform/businesses', menuGroup: 'PLATFORM', iconName: 'building', requiredPermission: null, showInMenu: true, sortOrder: 10, rights: { SUPER_ADMIN: 'VAEDX' } },
  { pageCode: 'PLANS', routePath: '/platform/plans', menuGroup: 'PLATFORM', iconName: 'layers', requiredPermission: null, showInMenu: true, sortOrder: 11, rights: { SUPER_ADMIN: 'VAED' } },
  { pageCode: 'ALL_USERS', routePath: '/platform/users', menuGroup: 'PLATFORM', iconName: 'users', requiredPermission: null, showInMenu: true, sortOrder: 12, rights: { SUPER_ADMIN: 'VAEDX' } },
  { pageCode: 'HOME', routePath: '/dashboard', menuGroup: 'BILLING', iconName: 'dashboard', requiredPermission: null, showInMenu: true, sortOrder: 20, rights: { SUPER_ADMIN: 'V', OWNER: 'V', STAFF: 'V' } },
  { pageCode: 'NEW_BILL', routePath: '/billing/new', menuGroup: 'BILLING', iconName: 'plus', requiredPermission: 'ORDERS_TAKE', showInMenu: true, sortOrder: 21, rights: { OWNER: 'VA', STAFF: 'VA' } },
  { pageCode: 'TABLES', routePath: '/tables', menuGroup: 'BILLING', iconName: 'table', requiredPermission: null, showInMenu: true, sortOrder: 22, rights: { OWNER: 'VAED', STAFF: 'V' } },
  { pageCode: 'BILLS', routePath: '/billing/bills', menuGroup: 'BILLING', iconName: 'invoice', requiredPermission: null, showInMenu: true, sortOrder: 23, rights: { OWNER: 'VAEDX', STAFF: 'VAE' } },
  { pageCode: 'PAYMENTS', routePath: '/payments', menuGroup: 'BILLING', iconName: 'card', requiredPermission: 'PAYMENTS_TAKE', showInMenu: true, sortOrder: 24, rights: { OWNER: 'VAEX', STAFF: 'VA' } },
  { pageCode: 'MENU', routePath: '/menu', menuGroup: 'MANAGE', iconName: 'box', requiredPermission: null, showInMenu: true, sortOrder: 30, rights: { OWNER: 'VAEDX', STAFF: 'V' } },
  { pageCode: 'CUSTOMERS', routePath: '/customers', menuGroup: 'MANAGE', iconName: 'contact', requiredPermission: null, showInMenu: true, sortOrder: 32, rights: { OWNER: 'VAEDX', STAFF: 'VAE' } },
  { pageCode: 'REPORTS', routePath: '/reports', menuGroup: 'MANAGE', iconName: 'chart', requiredPermission: 'SALES_VIEW', showInMenu: true, sortOrder: 33, rights: { OWNER: 'VX', STAFF: 'V' } },
  { pageCode: 'TEAM', routePath: '/user-management/team', menuGroup: 'MANAGE', iconName: 'users', requiredPermission: null, showInMenu: true, sortOrder: 35, rights: { OWNER: 'VAED' } },
  { pageCode: 'SETTINGS', routePath: '/settings', menuGroup: 'MANAGE', iconName: 'settings', requiredPermission: null, showInMenu: true, sortOrder: 36, rights: { OWNER: 'VE' } },
  { pageCode: 'AUDIT_LOG', routePath: '/audit', menuGroup: 'MANAGE', iconName: 'log', requiredPermission: null, showInMenu: true, sortOrder: 37, rights: { SUPER_ADMIN: 'VX', OWNER: 'VX' } },
  { pageCode: 'PROFILE', routePath: '/profile', menuGroup: 'ACCOUNT', iconName: 'user', requiredPermission: null, showInMenu: true, sortOrder: 90, rights: { SUPER_ADMIN: 'VE', OWNER: 'VE', STAFF: 'VE' } },
  { pageCode: 'GUIDE', routePath: '/guide', menuGroup: 'ACCOUNT', iconName: 'help', requiredPermission: null, showInMenu: true, sortOrder: 91, rights: { SUPER_ADMIN: 'V', OWNER: 'V', STAFF: 'V' } },
];
