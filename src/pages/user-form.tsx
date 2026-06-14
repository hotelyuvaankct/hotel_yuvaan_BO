import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import type { Role } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { SYSTEM_ROLE_NAMES, Status } from '@/lib/constants';
import { genderOptions } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FullPageLoader } from '@/components/common/loading-state';
import { SelectField, TextField } from '@/components/ui/form-fields';
import { isValidEmail, isValidPhone } from '@/lib/form-validation';

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
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [isSuperAdminUser, setIsSuperAdminUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    gender: '',
  });

  const activeRoles = useMemo(() => roles.filter((role) => role.status !== Status.DELETED), [roles]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const roleList = await api.listRoles();
        setRoles(roleList ?? []);
        if (userId) {
          const access = await api.getUserAccess(userId);
          const superAdmin = access.roles.some(
            (role) => role.roleName.toUpperCase() === SYSTEM_ROLE_NAMES.SUPER_ADMIN,
          );
          setIsSuperAdminUser(superAdmin);
          setSelectedRoleId(access.roles[0] ? String(access.roles[0].roleId) : '');
          setForm({
            fullName: access.user.fullName ?? '',
            email: access.user.email ?? '',
            password: '',
            phone: access.user.phone ?? '',
            gender: access.user.gender ? String(access.user.gender) : '',
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

    const nextErrors: Record<string, string> = {};
    if (!form.fullName.trim()) nextErrors.fullName = 'Full name is required.';
    if (!isEdit && !form.email.trim()) nextErrors.email = 'Email is required.';
    if (!isEdit && form.email.trim() && !isValidEmail(form.email)) nextErrors.email = 'Enter a valid email address.';
    if (!isEdit && form.password.length < 6) nextErrors.password = 'Password must be at least 6 characters.';
    if (form.phone.trim() && !isValidPhone(form.phone)) nextErrors.phone = 'Enter a valid phone number.';
    if (!isEdit && !selectedRoleId) nextErrors.role = 'Select a role for the user.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      showToast('Please fix the highlighted fields.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        fullName: form.fullName,
        phone: form.phone || undefined,
        gender: form.gender ? Number(form.gender) : undefined,
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

      if (savedUserId && !isSuperAdminUser) {
        await api.assignUserRoles(savedUserId, {
          roleIds: selectedRoleId ? [Number(selectedRoleId)] : [],
        });
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
          <CardDescription>Each user is assigned exactly one role. Super admin roles cannot be changed.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit} noValidate>
              <TextField
                label="Full name"
                required
                value={form.fullName}
                error={errors.fullName}
                onChange={(event) => setForm((value) => ({ ...value, fullName: event.target.value }))}
              />
              <TextField
                label="Email"
                type="email"
                required
                disabled={isEdit}
                value={form.email}
                error={errors.email}
                onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))}
              />
              {!isEdit ? (
                <TextField
                  label="Password"
                  type="password"
                  minLength={6}
                  required
                  value={form.password}
                  error={errors.password}
                  onChange={(event) => setForm((value) => ({ ...value, password: event.target.value }))}
                />
              ) : null}
              <TextField
                label="Phone"
                type="tel"
                value={form.phone}
                error={errors.phone}
                onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))}
              />
              <SelectField
                label="Gender"
                value={form.gender}
                placeholder="Select gender"
                options={genderOptions.map((option) => ({ value: option.value, label: option.label }))}
                onChange={(event) => setForm((value) => ({ ...value, gender: event.target.value }))}
              />
              <SelectField
                label="Role"
                required={!isEdit}
                disabled={isSuperAdminUser}
                wrapperClassName="md:col-span-2"
                value={selectedRoleId}
                error={errors.role}
                hint={isSuperAdminUser ? 'Super admin role is locked and cannot be changed.' : undefined}
                placeholder="Select role"
                options={activeRoles.map((role) => ({ value: role.id, label: role.displayName }))}
                onChange={(event) => setSelectedRoleId(event.target.value)}
              />
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
