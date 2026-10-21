import type { PermissionCode, RoleCode } from './auth';

export type PageCode =
  | 'BUSINESSES'
  | 'PLANS'
  | 'ALL_USERS'
  | 'HOME'
  | 'NEW_BILL'
  | 'TABLES'
  | 'BILLS'
  | 'PAYMENTS'
  | 'MENU'
  | 'CUSTOMERS'
  | 'REPORTS'
  | 'TEAM'
  | 'SETTINGS'
  | 'AUDIT_LOG'
  | 'PROFILE'
  | 'GUIDE';

export type MenuGroup = 'PLATFORM' | 'BILLING' | 'MANAGE' | 'ACCOUNT';

/** One row of the menu-binding query (pages + role_page_rights + staff ticks). */
export type MenuBindingItem = {
  pageCode: PageCode;
  routePath: string;
  menuGroup: MenuGroup;
  iconName: string;
  showInMenu: boolean;
  sortOrder: number;
  canView: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
};

export type MenuBindingData = { menuList: MenuBindingItem[] };

/** Page master + rights per role (seed.sql). Used by the mock backend. */
export type PageDefinition = {
  pageCode: PageCode;
  routePath: string;
  menuGroup: MenuGroup;
  iconName: string;
  requiredPermission: PermissionCode | null;
  showInMenu: boolean;
  sortOrder: number;
  rights: Partial<Record<RoleCode, string>>; // e.g. 'VAED' = view, add, edit, delete; 'X' = export
};

export type MenuAction = 'view' | 'add' | 'edit' | 'delete' | 'export';
