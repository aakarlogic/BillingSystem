import { describe, expect, it } from 'vitest';
import type { MenuBindingItem } from '@/types/menuPermission';
import { buildSidebar, getMenuBindingByPath } from './menuBinding';

const row = (pageCode: string, routePath: string, menuGroup: string, sortOrder: number): MenuBindingItem =>
  ({
    pageCode,
    routePath,
    menuGroup,
    iconName: 'box',
    showInMenu: true,
    sortOrder,
    canView: true,
    canAdd: true,
    canEdit: true,
    canDelete: true,
    canExport: true,
  }) as MenuBindingItem;

describe('buildSidebar', () => {
  // The API can send pages this app has no screen for yet (CATEGORIES, DAY_CLOSE …).
  const menu = [
    row('HOME', '/dashboard', 'BILLING', 20),
    row('MENU', '/menu', 'MANAGE', 30),
    row('CATEGORIES', '/menu/categories', 'MANAGE', 31),
    row('DAY_CLOSE', '/day-close', 'MANAGE', 34),
    row('PROFILE', '/profile', 'ACCOUNT', 90),
  ];

  it('leaves out page codes the app does not know', () => {
    const { home, sections, account } = buildSidebar(menu);
    expect(home?.pageCode).toBe('HOME');
    expect(sections.flatMap((s) => s.links.map((l) => l.pageCode))).toEqual(['MENU']);
    expect(account.map((l) => l.pageCode)).toEqual(['PROFILE']);
    for (const l of [...sections.flatMap((s) => s.links), ...account]) expect(l.labelKey).toBeTruthy();
  });

  it('does not match an unknown page by path', () => {
    expect(getMenuBindingByPath(menu, '/menu/categories')?.pageCode).toBe('MENU');
  });
});
