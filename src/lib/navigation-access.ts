import { navigationItems, type NavigationItem } from '@/data/navigation';
import type { PermissionSet } from '@/lib/api-types';

function hasReadAccess(perms: Record<string, PermissionSet> | undefined, moduleSlug: string) {
  return Boolean(perms?.[moduleSlug]?.read);
}

export function canAccessNavigationItem(
  item: NavigationItem,
  perms: Record<string, PermissionSet> | undefined,
) {
  if (!item.moduleSlug) return true;
  if (hasReadAccess(perms, item.moduleSlug)) return true;
  return (item.alternateModuleSlugs ?? []).some((slug) => hasReadAccess(perms, slug));
}

export function getFirstAccessiblePath(perms: Record<string, PermissionSet> | undefined) {
  return navigationItems.find((item) => canAccessNavigationItem(item, perms))?.href ?? '/login';
}

export function canAccessPath(path: string, perms: Record<string, PermissionSet> | undefined) {
  const item = navigationItems.find(
    (candidate) => path === candidate.href || path.startsWith(`${candidate.href}/`),
  );
  return item ? canAccessNavigationItem(item, perms) : true;
}
