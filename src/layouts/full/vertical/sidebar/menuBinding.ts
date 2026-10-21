import type { MenuBindingItem, MenuGroup, PageCode } from '@/types/menuPermission';
import { isKnownPage, MENU_GROUPS, SIDEBAR_ITEMS, type SidebarItemDef } from './Sidebaritems';

export type SidebarLink = SidebarItemDef & { pageCode: PageCode; to: string };
export type SidebarSection = { group: MenuGroup; labelKey: string; links: SidebarLink[] };

function toLink(m: MenuBindingItem): SidebarLink {
  return { ...SIDEBAR_ITEMS[m.pageCode], pageCode: m.pageCode, to: m.routePath };
}

/** Groups the menu-binding rows into sidebar sections (HOME first, ACCOUNT pages left out, unknown pages skipped). */
export function buildSidebar(menu: MenuBindingItem[]): { home: SidebarLink | null; sections: SidebarSection[]; account: SidebarLink[] } {
  const visible = menu
    .filter((m) => m.canView && m.showInMenu && isKnownPage(m.pageCode))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const homeRow = visible.find((m) => m.pageCode === 'HOME');
  const sections = MENU_GROUPS.map(({ group, labelKey }) => ({
    group,
    labelKey,
    links: visible.filter((m) => m.menuGroup === group && m.pageCode !== 'HOME').map(toLink),
  })).filter((s) => s.links.length > 0);
  return {
    home: homeRow ? toLink(homeRow) : null,
    sections,
    account: visible.filter((m) => m.menuGroup === 'ACCOUNT').map(toLink),
  };
}

/** The page's rights row for a route path, e.g. to check "can add" on a screen. */
export function getMenuBindingByPath(menu: MenuBindingItem[], path: string): MenuBindingItem | undefined {
  return menu
    .filter((m) => isKnownPage(m.pageCode) && (path === m.routePath || path.startsWith(`${m.routePath}/`)))
    .sort((a, b) => b.routePath.length - a.routePath.length)[0];
}
