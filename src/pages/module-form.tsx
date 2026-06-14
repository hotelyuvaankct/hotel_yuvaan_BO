import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import type { UpsertModulePayload } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FullPageLoader } from '@/components/common/loading-state';

const inputClass = 'h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring';
const systemModuleSlugs = new Set(['users', 'roles', 'rooms', 'room-types']);

export function ModuleFormPage() {
  const { id } = useParams();
  const moduleId = id ? Number(id) : null;
  const isEdit = Boolean(moduleId);
  const navigate = useNavigate();
  const { session } = useAuth();
  const { showToast } = useToast();
  const canCreate = hasPermission(session?.perms, 'modules', 'create');
  const canUpdate = hasPermission(session?.perms, 'modules', 'update');
  const canSave = isEdit ? canUpdate : canCreate;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [systemModule, setSystemModule] = useState(false);
  const [form, setForm] = useState({
    moduleName: '',
    slug: '',
    order: '',
    isActive: true,
    onApp: false,
  });
  const generatedSlug = useMemo(
    () => form.moduleName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    [form.moduleName],
  );

  useEffect(() => {
    if (!moduleId) return;
    api.getModule(moduleId)
      .then((module) => {
        setSystemModule(systemModuleSlugs.has(module.slug));
        setForm({
          moduleName: module.moduleName,
          slug: module.slug,
          order: module.order == null ? '' : String(module.order),
          isActive: module.isActive ?? true,
          onApp: module.onApp ?? false,
        });
      })
      .catch((err) => showToast(err instanceof Error ? err.message : 'Unable to load module.', 'error'))
      .finally(() => setLoading(false));
  }, [moduleId, showToast]);

  function updateName(moduleName: string) {
    setForm((current) => ({
      ...current,
      moduleName,
      slug: isEdit || current.slug !== generatedSlug ? current.slug : moduleName.trim().toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    const payload: UpsertModulePayload = {
      moduleName: form.moduleName.trim(),
      slug: form.slug.trim(),
      order: form.order ? Number(form.order) : undefined,
      isActive: isEdit ? form.isActive : true,
      onApp: form.onApp,
    };
    try {
      if (isEdit && moduleId) {
        await api.updateModule(moduleId, payload);
      } else {
        await api.createModule(payload);
      }
      showToast(isEdit ? 'Module updated.' : 'Module created. It is now available in role forms.', 'success');
      navigate('/modules');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Unable to save module.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <FullPageLoader label="Loading module..." />;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Button variant="ghost" onClick={() => navigate('/modules')}>
        <ArrowLeft className="h-4 w-4" />
        Back to modules
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Update module' : 'Add module'}</CardTitle>
          <CardDescription>After saving, open a role form to assign read, create, update, and delete access.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            <label className="space-y-2 text-sm font-medium">
              Module name
              <input className={inputClass} required maxLength={100} value={form.moduleName} onChange={(event) => updateName(event.target.value)} />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Slug
              <input
                className={inputClass}
                required
                maxLength={100}
                pattern="[a-z][a-z0-9]*(?:-[a-z0-9]+)*"
                disabled={systemModule}
                value={form.slug}
                onChange={(event) => setForm((value) => ({ ...value, slug: event.target.value.toLowerCase() }))}
              />
              <span className="block text-xs font-normal text-muted-foreground">Lowercase letters, numbers, and single hyphens only.</span>
            </label>
            <label className="space-y-2 text-sm font-medium">
              Display order
              <input className={inputClass} min="0" type="number" value={form.order} onChange={(event) => setForm((value) => ({ ...value, order: event.target.value }))} />
            </label>
            {isEdit ? (
              <div className="flex flex-wrap items-center gap-6 pt-7 text-sm font-medium">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-amber-500"
                    checked={form.isActive}
                    disabled={systemModule}
                    onChange={(event) => setForm((value) => ({ ...value, isActive: event.target.checked }))}
                  />
                  Active
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 accent-amber-500" checked={form.onApp} onChange={(event) => setForm((value) => ({ ...value, onApp: event.target.checked }))} />
                  Available on app
                </label>
              </div>
            ) : (
              <label className="flex items-center gap-2 pt-7 text-sm font-medium">
                <input type="checkbox" className="h-4 w-4 accent-amber-500" checked={form.onApp} onChange={(event) => setForm((value) => ({ ...value, onApp: event.target.checked }))} />
                Available on app
              </label>
            )}
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button type="submit" variant="gold" disabled={!canSave || saving}>
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save module'}
              </Button>
              <Link to="/modules" className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold">Cancel</Link>
              <Link to="/roles" className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold">Manage roles</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
