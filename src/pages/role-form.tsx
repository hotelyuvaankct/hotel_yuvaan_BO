import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import type { Module, Permission } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FullPageLoader } from '@/components/common/loading-state';

const inputClass = 'h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring';

type PermissionDraft = {
  isListAccess: boolean;
  isAddAccess: boolean;
  isUpdateAccess: boolean;
  isDeleteAccess: boolean;
  isOnApp: boolean;
};

const emptyPermission: PermissionDraft = {
  isListAccess: false,
  isAddAccess: false,
  isUpdateAccess: false,
  isDeleteAccess: false,
  isOnApp: false,
};

export function RoleFormPage() {
  const { id } = useParams();
  const roleId = id ? Number(id) : null;
  const isEdit = Boolean(roleId);
  const navigate = useNavigate();
  const { session } = useAuth();
  const { showToast } = useToast();
  const canCreate = hasPermission(session?.perms, 'roles', 'create');
  const canUpdate = hasPermission(session?.perms, 'roles', 'update');
  const canReadModules = hasPermission(session?.perms, 'modules', 'read');
  const canSave = isEdit ? canUpdate : canCreate;
  const [modules, setModules] = useState<Module[]>([]);
  const [permissions, setPermissions] = useState<Record<number, PermissionDraft>>({});
  const [existingPermissions, setExistingPermissions] = useState<Map<number, Permission>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', displayName: '', description: '' });
  const normalizedRoleName = useMemo(() => form.name.trim().toUpperCase().replace(/\s+/g, '_'), [form.name]);

  useEffect(() => {
    async function load() {
      if (!canReadModules) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const moduleList = await api.listModules();
        setModules(moduleList ?? []);
        if (roleId) {
          const [role, permissionList] = await Promise.all([api.getRole(roleId), api.listPermissions(roleId)]);
          setForm({
            name: role.name,
            displayName: role.displayName,
            description: role.description ?? '',
          });
          setExistingPermissions(new Map(permissionList.map((permission) => [permission.moduleId, permission])));
          setPermissions(
            Object.fromEntries(
              permissionList.map((permission) => [
                permission.moduleId,
                {
                  isListAccess: permission.isListAccess,
                  isAddAccess: permission.isAddAccess,
                  isUpdateAccess: permission.isUpdateAccess,
                  isDeleteAccess: permission.isDeleteAccess,
                  isOnApp: permission.isOnApp,
                },
              ]),
            ),
          );
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Unable to load role form.', 'error');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [canReadModules, roleId, showToast]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      let savedRoleId = roleId;
      if (isEdit && roleId) {
        await api.updateRole(roleId, {
          displayName: form.displayName,
          description: form.description || undefined,
        });
      } else {
        const role = await api.createRole({
          name: normalizedRoleName,
          displayName: form.displayName,
          description: form.description || undefined,
        });
        savedRoleId = role.id;
      }

      if (savedRoleId) {
        await Promise.all(
          modules.map((module) =>
            api.savePermission(
              savedRoleId,
              {
                moduleId: module.id,
                ...(permissions[module.id] ?? emptyPermission),
              },
              existingPermissions.get(module.id),
            ),
          ),
        );
      }
      showToast(isEdit ? 'Role updated.' : 'Role created.', 'success');
      navigate('/roles');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Unable to save role.', 'error');
    } finally {
      setSaving(false);
    }
  }

  function updatePermission(moduleId: number, key: keyof PermissionDraft, checked: boolean) {
    setPermissions((current) => ({
      ...current,
      [moduleId]: {
        ...(current[moduleId] ?? emptyPermission),
        [key]: checked,
      },
    }));
  }

  if (loading) {
    return <FullPageLoader label={isEdit ? 'Loading role...' : 'Preparing role form...'} />;
  }

  if (!canReadModules) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>Module read permission is required to configure role permissions.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Button variant="ghost" onClick={() => navigate('/roles')}>
        <ArrowLeft className="h-4 w-4" />
        Back to roles
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Update role' : 'Add role'}</CardTitle>
          <CardDescription>Select modules and CRUD permissions for this role.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={onSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-medium">
                  Role name
                  <input className={inputClass} required disabled={isEdit} value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} />
                </label>
                <label className="space-y-2 text-sm font-medium">
                  Display name
                  <input className={inputClass} required value={form.displayName} onChange={(event) => setForm((value) => ({ ...value, displayName: event.target.value }))} />
                </label>
                <label className="space-y-2 text-sm font-medium md:col-span-2">
                  Description
                  <input className={inputClass} value={form.description} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} />
                </label>
              </div>

              <div>
                <p className="font-medium">Module permissions</p>
                <p className="text-sm text-muted-foreground">Assign read, create, update, and delete access for each module.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Module</th>
                      <th className="px-3 py-2 font-medium">Read</th>
                      <th className="px-3 py-2 font-medium">Create</th>
                      <th className="px-3 py-2 font-medium">Update</th>
                      <th className="px-3 py-2 font-medium">Delete</th>
                      <th className="px-3 py-2 font-medium">App</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modules.length === 0 ? (
                      <tr>
                        <td className="px-3 py-6 text-sm text-muted-foreground" colSpan={6}>No data available.</td>
                      </tr>
                    ) : null}
                    {modules.map((module) => {
                      const permission = permissions[module.id] ?? emptyPermission;
                      return (
                        <tr key={module.id} className="border-t border-border">
                          <td className="px-3 py-3"><p className="font-medium">{module.moduleName}</p><p className="text-xs text-muted-foreground">{module.slug}</p></td>
                          {(['isListAccess', 'isAddAccess', 'isUpdateAccess', 'isDeleteAccess', 'isOnApp'] as const).map((key) => (
                            <td key={key} className="px-3 py-3">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-amber-500"
                                checked={permission[key]}
                                onChange={(event) => updatePermission(module.id, key, event.target.checked)}
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2">
                <Button type="submit" variant="gold" disabled={!canSave || saving}>
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save role'}
                </Button>
                <Link to="/roles" className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold">
                  Cancel
                </Link>
              </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
