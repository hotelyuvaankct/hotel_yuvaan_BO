import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import type { Role } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { genderOptions, recordStatusOptions } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FullPageLoader } from '@/components/common/loading-state';

const inputClass = 'h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring';

export function UserFormPage() {
  const { id } = useParams();
  const userId = id ? Number(id) : null;
  const isEdit = Boolean(userId);
  const navigate = useNavigate();
  const { session } = useAuth();
  const { showToast } = useToast();
  const canCreate = hasPermission(session?.perms, 'users', 'create');
  const canUpdate = hasPermission(session?.perms, 'users', 'update');
  const canSave = isEdit ? canUpdate : canCreate;
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    gender: '',
    status: '1',
  });

  const activeRoles = useMemo(() => roles.filter((role) => role.status !== 3), [roles]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const roleList = await api.listRoles();
        setRoles(roleList ?? []);
        if (userId) {
          const access = await api.getUserAccess(userId);
          setSelectedRoleIds(access.roles.map((role) => role.roleId));
          setForm({
            fullName: access.user.fullName ?? '',
            email: access.user.email ?? '',
            password: '',
            phone: access.user.phone ?? '',
            gender: access.user.gender ? String(access.user.gender) : '',
            status: String(access.user.status ?? 1),
          });
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Unable to load user form.', 'error');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [showToast, userId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        fullName: form.fullName,
        phone: form.phone || undefined,
        gender: form.gender ? Number(form.gender) : undefined,
        status: Number(form.status),
      };

      let savedUserId = userId;
      if (isEdit && userId) {
        await api.updateUser(userId, payload);
      } else {
        const user = await api.createUser({
          ...payload,
          email: form.email,
          password: form.password,
        });
        savedUserId = user.id;
      }

      if (savedUserId) {
        await api.assignUserRoles(savedUserId, { roleIds: selectedRoleIds });
      }
      showToast(isEdit ? 'User updated.' : 'User created.', 'success');
      navigate('/users');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Unable to save user.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <FullPageLoader label={isEdit ? 'Loading user...' : 'Preparing user form...'} />;
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Button variant="ghost" onClick={() => navigate('/users')}>
        <ArrowLeft className="h-4 w-4" />
        Back to users
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Update user' : 'Add user'}</CardTitle>
          <CardDescription>Role and gender values are selected from backend-compatible enums.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
              <label className="space-y-2 text-sm font-medium">
                Full name
                <input className={inputClass} required value={form.fullName} onChange={(event) => setForm((value) => ({ ...value, fullName: event.target.value }))} />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Email
                <input className={inputClass} type="email" required disabled={isEdit} value={form.email} onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))} />
              </label>
              {!isEdit ? (
                <label className="space-y-2 text-sm font-medium">
                  Password
                  <input className={inputClass} type="password" minLength={6} required value={form.password} onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))} />
                </label>
              ) : null}
              <label className="space-y-2 text-sm font-medium">
                Phone
                <input className={inputClass} value={form.phone} onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))} />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Gender
                <select className={inputClass} value={form.gender} onChange={(event) => setForm((value) => ({ ...value, gender: event.target.value }))}>
                  <option value="">Select gender</option>
                  {genderOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium">
                Status
                <select className={inputClass} value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value }))}>
                  {recordStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <div className="space-y-2 md:col-span-2">
                <p className="text-sm font-medium">Roles</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {activeRoles.length === 0 ? <p className="text-sm text-muted-foreground">No data available.</p> : null}
                  {activeRoles.map((role) => (
                    <label key={role.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm">
                      <span>{role.displayName}</span>
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-amber-500"
                        checked={selectedRoleIds.includes(role.id)}
                        onChange={(event) =>
                          setSelectedRoleIds((current) =>
                            event.target.checked ? [...current, role.id] : current.filter((roleId) => roleId !== role.id),
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" variant="gold" disabled={!canSave || saving}>
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save user'}
                </Button>
                <Link to="/users" className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold">
                  Cancel
                </Link>
              </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
