import type { MenuGroup, PageCode } from '@/types/menuPermission';

/** How each page appears in the side menu. Which pages show comes from the menu-binding API. */
export type SidebarItemDef = { labelKey: string; icon: string; end?: boolean };

export const SIDEBAR_ITEMS: Record<PageCode, SidebarItemDef> = {
  BUSINESSES: { labelKey: 'nav.businesses', icon: 'building' },
  PLANS: { labelKey: 'nav.plans', icon: 'layers' },
  ALL_USERS: { labelKey: 'nav.allUsers', icon: 'users' },
  HOME: { labelKey: 'nav.home', icon: 'dashboard' },
  NEW_BILL: { labelKey: 'nav.newInvoice', icon: 'plus' },
  TABLES: { labelKey: 'nav.tables', icon: 'table' },
  BILLS: { labelKey: 'nav.invoices', icon: 'invoice', end: true },
  PAYMENTS: { labelKey: 'nav.payments', icon: 'card' },
  MENU: { labelKey: 'nav.items', icon: 'box' },
  CUSTOMERS: { labelKey: 'nav.customers', icon: 'contact' },
  REPORTS: { labelKey: 'nav.reports', icon: 'chart' },
  TEAM: { labelKey: 'nav.team', icon: 'users' },
  SETTINGS: { labelKey: 'nav.settings', icon: 'settings' },
  AUDIT_LOG: { labelKey: 'nav.audit', icon: 'log' },
  PROFILE: { labelKey: 'nav.profile', icon: 'user' },
  GUIDE: { labelKey: 'nav.guide', icon: 'help' },
};

/** The server may send page codes this app has no screen for yet (e.g. CATEGORIES): leave those out. */
export function isKnownPage(code: string): code is PageCode {
  return Object.prototype.hasOwnProperty.call(SIDEBAR_ITEMS, code);
}

/** Section titles, in menu order. ACCOUNT pages go to the sidebar footer instead. */
export const MENU_GROUPS: { group: MenuGroup; labelKey: string }[] = [
  { group: 'PLATFORM', labelKey: 'nav.platform' },
  { group: 'BILLING', labelKey: 'nav.billing' },
  { group: 'MANAGE', labelKey: 'nav.manage' },
];

/** Phone bottom bar (shown only for business users). */
export const BOTTOM_BAR: PageCode[] = ['HOME', 'NEW_BILL', 'TABLES', 'BILLS'];
