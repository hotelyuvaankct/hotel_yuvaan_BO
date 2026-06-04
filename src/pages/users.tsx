import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Eye, RefreshCw, Save, Trash2, UserPlus } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import type { Role, User, UserAccess } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { hasPermission, permissionLabel } from '@/lib/permissions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const inputClass = 'h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring';

export function UsersPage() {
  const { session } = useAuth();
  const canCreate = hasPermission(session?.perms, 'users', 'create');
  const canRead = hasPermission(session?.perms, 'users', 'read');
  const canUpdate = hasPermission(session?.perms, 'users', 'update');
  const canDelete = hasPermission(session?.perms, 'users', 'delete');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [access, setAccess] = useState<UserAccess | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', phone: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const assignedRoleNames = useMemo(
    () => new Set(access?.roles.map((role) => role.roleDisplayName) ?? []),
    [access],
  );

  async function load() {
    setError('');
    try {
      const [userPage, roleList] = await Promise.all([api.listUsers(0, 100), api.listRoles()]);
      setUsers(userPage.content ?? []);
      setRoles(roleList ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load users.');
    }
  }

  async function loadAccess(userId: number) {
    setSelectedUserId(userId);
    setAccess(null);
    setError('');
    try {
      const userAccess = await api.getUserAccess(userId);
      setAccess(userAccess);
      setSelectedRoleIds(userAccess.roles.map((role) => role.roleId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load user access.');
    }
  }

  useEffect(() => {
    if (canRead) void load();
  }, [canRead]);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      const user = await api.createUser({ ...form, phone: form.phone || undefined });
      setUsers((current) => [user, ...current]);
      setForm({ fullName: '', email: '', password: '', phone: '' });
      setMessage('User created.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create user.');
    }
  }

  async function saveRoles() {
    if (!selectedUserId) return;
    setError('');
    const userAccess = await api.assignUserRoles(selectedUserId, { roleIds: selectedRoleIds });
    setAccess(userAccess);
    setMessage('User roles updated.');
  }

  async function toggleStatus(user: User) {
    const updated = await api.updateUser(user.id, { status: user.status === 1 ? 2 : 1 });
    setUsers((current) => current.map((item) => (item.id === user.id ? updated : item)));
  }

  async function deleteUser(user: User) {
    await api.deleteUser(user.id);
    setUsers((current) => current.filter((item) => item.id !== user.id));
    if (selectedUserId === user.id) {
      setSelectedUserId(null);
      setAccess(null);
    }
  }

  if (!canRead) {
    return <PermissionCard module="users" />;
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {message ? <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">{message}</div> : null}
      {error ? <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Create user</CardTitle>
            <CardDescription>{permissionLabel(canCreate)}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-5" onSubmit={createUser}>
            <input className={inputClass} placeholder="Full name" required value={form.fullName} onChange={(event) => setForm((value) => ({ ...value, fullName: event.target.value }))} />
            <input className={inputClass} placeholder="Email" type="email" required value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} />
            <input className={inputClass} placeholder="Password" type="password" required minLength={6} value={form.password} onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))} />
            <input className={inputClass} placeholder="Phone" value={form.phone} onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))} />
            <Button type="submit" variant="gold" disabled={!canCreate}>
              <UserPlus className="h-4 w-4" />
              Create
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>View, update status, delete, and inspect permissions.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Phone</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6 text-sm text-muted-foreground" colSpan={5}>
                      No data available.
                    </td>
                  </tr>
                ) : null}
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-border">
                    <td className="px-3 py-3 font-medium">{user.fullName || 'Unnamed user'}</td>
                    <td className="px-3 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-3 py-3 text-muted-foreground">{user.phone || '-'}</td>
                    <td className="px-3 py-3"><Badge variant={user.status === 1 ? 'success' : 'secondary'}>{user.status === 1 ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => void loadAccess(user.id)}><Eye className="h-4 w-4" />View</Button>
                        <Button variant="outline" size="sm" onClick={() => void toggleStatus(user)} disabled={!canUpdate}>{user.status === 1 ? 'Deactivate' : 'Activate'}</Button>
                        <Button variant="ghost" size="icon" onClick={() => void deleteUser(user)} disabled={!canDelete} aria-label="Delete user"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User access</CardTitle>
            <CardDescription>{selectedUserId ? 'Assigned roles and merged permissions.' : 'Select a user to view details.'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {access ? (
              <>
                <div>
                  <p className="font-semibold">{access.user.fullName || 'Unnamed user'}</p>
                  <p className="text-sm text-muted-foreground">{access.user.email}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Roles</p>
                  <div className="grid gap-2">
                    {roles.length === 0 ? <p className="text-sm text-muted-foreground">No data available.</p> : null}
                    {roles.map((role) => (
                      <label key={role.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm">
                        <span>{role.displayName}</span>
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-amber-500"
                          checked={selectedRoleIds.includes(role.id)}
                          disabled={!canUpdate}
                          onChange={(event) => {
                            setSelectedRoleIds((current) =>
                              event.target.checked ? [...current, role.id] : current.filter((id) => id !== role.id),
                            );
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  <Button variant="gold" onClick={() => void saveRoles()} disabled={!canUpdate}>
                    <Save className="h-4 w-4" />
                    Save roles
                  </Button>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Current role names</p>
                  <div className="flex flex-wrap gap-2">
                    {assignedRoleNames.size === 0 ? <p className="text-sm text-muted-foreground">No data available.</p> : null}
                    {[...assignedRoleNames].map((name) => <Badge key={name} variant="gold">{name}</Badge>)}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Permissions</p>
                  {Object.entries(access.perms).length === 0 ? <p className="text-sm text-muted-foreground">No data available.</p> : null}
                  {Object.entries(access.perms).map(([module, perms]) => (
                    <div key={module} className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm">
                      <span className="font-medium">{module}</span>
                      <span className="ml-2 text-muted-foreground">
                        {Object.entries(perms).filter(([, allowed]) => allowed).map(([key]) => key).join(', ') || 'No access'}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No user selected.</p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function PermissionCard({ module }: { module: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Access denied</CardTitle>
        <CardDescription>Your current role does not include read access for {module}.</CardDescription>
      </CardHeader>
    </Card>
  );
}
