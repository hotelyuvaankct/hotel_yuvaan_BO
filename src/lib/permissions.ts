import type { PermissionSet } from '@/lib/api-types';

export type CrudAction = keyof PermissionSet;

export function hasPermission(
  perms: Record<string, PermissionSet> | undefined,
  moduleSlug: string,
  action: CrudAction,
) {
  return Boolean(perms?.[moduleSlug]?.[action]);
}

export function permissionLabel(allowed: boolean) {
  return allowed ? 'Allowed by role permissions' : 'Permission required';
}
