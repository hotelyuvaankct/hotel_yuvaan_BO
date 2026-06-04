import { FormEvent, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import type { Module, Permission, Role } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { hasPermission, permissionLabel } from '@/lib/permissions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const inputClass = 'h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring';

type PermissionDraft = {
  isAddAccess: boolean;
  isUpdateAccess: boolean;
  isDeleteAccess: boolean;
  isListAccess: boolean;
  isOnApp: boolean;
};

export function RolesPage() {
  const { session } = useAuth();
  const canCreate = hasPermission(session?.perms, 'roles', 'create');
  const canRead = hasPermission(session?.perms, 'roles', 'read');
  const canUpdate = hasPermission(session?.perms, 'roles', 'update');
  const canDelete = hasPermission(session?.perms, 'roles', 'delete');
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', displayName: '', description: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const selectedRole = roles.find((role) => role.id === selectedRoleId);
  const permissionByModuleId = useMemo(() => new Map(permissions.map((permission) => [permission.moduleId, permission])), [permissions]);

  async function load() {
    setError('');
    try {
      const [roleList, moduleList] = await Promise.all([api.listRoles(), api.listModules()]);
      setRoles(roleList ?? []);
      setModules(moduleList ?? []);
      setSelectedRoleId((current) => current ?? roleList?.[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load roles.');
    }
  }

  async function loadPermissions(roleId: number) {
    setPermissions(await api.listPermissions(roleId));
  }

  useEffect(() => {
    if (canRead) void load();
  }, [canRead]);

  useEffect(() => {
    if (selectedRoleId) void loadPermissions(selectedRoleId);
  }, [selectedRoleId]);

  async function createRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      const role = await api.createRole({
        name: form.name.trim().toUpperCase().replace(/\s+/g, '_'),
        displayName: form.displayName,
        description: form.description || undefined,
      });
      setRoles((current) => [role, ...current]);
      setSelectedRoleId(role.id);
      setForm({ name: '', displayName: '', description: '' });
      setMessage('Role created. Select modules below to assign CRUD permissions.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create role.');
    }
  }

  async function toggleRoleStatus(role: Role) {
    const updated = await api.updateRole(role.id, { status: role.status === 1 ? 2 : 1 });
    setRoles((current) => current.map((item) => (item.id === role.id ? updated : item)));
  }

  async function deleteRole(role: Role) {
    await api.deleteRole(role.id);
    setRoles((current) => current.filter((item) => item.id !== role.id));
    if (selectedRoleId === role.id) setSelectedRoleId(null);
  }

  async function savePermission(module: Module, draft: PermissionDraft) {
    if (!selectedRoleId) return;
    const saved = await api.savePermission(selectedRoleId, { moduleId: module.id, ...draft }, permissionByModuleId.get(module.id));
    setPermissions((current) => [...current.filter((permission) => permission.moduleId !== module.id), saved]);
    setMessage('Permission saved.');
  }

  if (!canRead) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>Your current role does not include read access for roles.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {message ? <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">{message}</div> : null}
      {error ? <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Create role</CardTitle>
            <CardDescription>{permissionLabel(canCreate)}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={createRole}>
              <input className={inputClass} placeholder="Role name, e.g. FRONT_DESK" required value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} />
              <input className={inputClass} placeholder="Display name" required value={form.displayName} onChange={(event) => setForm((value) => ({ ...value, displayName: event.target.value }))} />
              <input className={inputClass} placeholder="Description" value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} />
              <Button type="submit" variant="gold" disabled={!canCreate}>
                <ShieldCheck className="h-4 w-4" />
                Create role
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Roles</CardTitle>
              <CardDescription>Select a role to view details and edit CRUD permissions.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="h-4 w-4" />Refresh</Button>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {roles.length === 0 ? <p className="text-sm text-muted-foreground">No data available.</p> : null}
            {roles.map((role) => (
              <div key={role.id} className="rounded-xl border border-border bg-muted/40 p-3">
                <button type="button" className="w-full text-left" onClick={() => setSelectedRoleId(role.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{role.displayName}</p>
                      <p className="text-xs text-muted-foreground">{role.name}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{role.description || 'No description'}</p>
                    </div>
                    <Badge variant={selectedRoleId === role.id ? 'gold' : role.status === 1 ? 'success' : 'secondary'}>{selectedRoleId === role.id ? 'Selected' : role.status === 1 ? 'Active' : 'Inactive'}</Badge>
                  </div>
                </button>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => void toggleRoleStatus(role)} disabled={!canUpdate}>{role.status === 1 ? 'Disable' : 'Enable'}</Button>
                  {!role.isSystemRole ? <Button variant="ghost" size="icon" onClick={() => void deleteRole(role)} disabled={!canDelete} aria-label="Delete role"><Trash2 className="h-4 w-4" /></Button> : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Module CRUD permissions {selectedRole ? `for ${selectedRole.displayName}` : ''}</CardTitle>
          <CardDescription>{permissionLabel(canUpdate)}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Module</th>
                <th className="px-3 py-2 font-medium">Read</th>
                <th className="px-3 py-2 font-medium">Create</th>
                <th className="px-3 py-2 font-medium">Update</th>
                <th className="px-3 py-2 font-medium">Delete</th>
                <th className="px-3 py-2 font-medium">App</th>
                <th className="px-3 py-2 text-right font-medium">Save</th>
              </tr>
            </thead>
            <tbody>
              {modules.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-sm text-muted-foreground" colSpan={7}>
                    No data available.
                  </td>
                </tr>
              ) : null}
              {modules.map((module) => (
                <PermissionRow
                  key={module.id}
                  module={module}
                  permission={permissionByModuleId.get(module.id)}
                  disabled={!selectedRoleId || !canUpdate}
                  onSave={(draft) => void savePermission(module, draft)}
                />
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function PermissionRow({
  module,
  permission,
  disabled,
  onSave,
}: {
  module: Module;
  permission?: Permission;
  disabled: boolean;
  onSave: (draft: PermissionDraft) => void;
}) {
  const [value, setValue] = useState<PermissionDraft>({
    isListAccess: permission?.isListAccess ?? false,
    isAddAccess: permission?.isAddAccess ?? false,
    isUpdateAccess: permission?.isUpdateAccess ?? false,
    isDeleteAccess: permission?.isDeleteAccess ?? false,
    isOnApp: permission?.isOnApp ?? false,
  });

  useEffect(() => {
    setValue({
      isListAccess: permission?.isListAccess ?? false,
      isAddAccess: permission?.isAddAccess ?? false,
      isUpdateAccess: permission?.isUpdateAccess ?? false,
      isDeleteAccess: permission?.isDeleteAccess ?? false,
      isOnApp: permission?.isOnApp ?? false,
    });
  }, [permission]);

  return (
    <tr className="border-t border-border">
      <td className="px-3 py-3"><p className="font-medium">{module.moduleName}</p><p className="text-xs text-muted-foreground">{module.slug}</p></td>
      {(['isListAccess', 'isAddAccess', 'isUpdateAccess', 'isDeleteAccess', 'isOnApp'] as const).map((key) => (
        <td key={key} className="px-3 py-3">
          <input type="checkbox" className="h-4 w-4 accent-amber-500" checked={value[key]} disabled={disabled} onChange={(event) => setValue((current) => ({ ...current, [key]: event.target.checked }))} />
        </td>
      ))}
      <td className="px-3 py-3 text-right">
        <Button variant="outline" size="sm" disabled={disabled} onClick={() => onSave(value)}><Save className="h-4 w-4" />Save</Button>
      </td>
    </tr>
  );
}
