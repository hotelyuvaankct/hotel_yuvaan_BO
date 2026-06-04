import type { PermissionSet } from '@/lib/api-types';
import { getStoredSession } from '@/lib/auth-storage';

export type CrudAction = keyof PermissionSet;

export function hasPermission(
  perms: Record<string, PermissionSet> | undefined,
  moduleSlug: string,
  action: CrudAction,
) {
  const tokenPerms = getStoredSession()?.perms;
  return Boolean((tokenPerms ?? perms)?.[moduleSlug]?.[action]);
}

export function permissionLabel(allowed: boolean) {
  return allowed ? 'Allowed by role permissions' : 'Permission required';
}
