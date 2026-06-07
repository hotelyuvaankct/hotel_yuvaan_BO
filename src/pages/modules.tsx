import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { Module } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingState } from '@/components/common/loading-state';

const systemModuleSlugs = new Set(['users', 'roles', 'rooms', 'room-types']);

export function ModulesPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const canRead = hasPermission(session?.perms, 'modules', 'read');
  const canCreate = hasPermission(session?.perms, 'modules', 'create');
  const canUpdate = hasPermission(session?.perms, 'modules', 'update');
  const canDelete = hasPermission(session?.perms, 'modules', 'delete');
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setModules(await api.listModules());
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load modules.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function deleteModule(module: Module) {
    const confirmed = await confirm({
      title: 'Deactivate module?',
      description: `${module.moduleName} will be removed from role forms and will stop granting access.`,
      confirmLabel: 'Deactivate module',
    });
    if (!confirmed) return;
    try {
      await api.deleteModule(module.id);
      showToast('Module deactivated.', 'success');
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to deactivate module.', 'error');
    }
  }

  useEffect(() => {
    if (canRead) void load();
  }, [canRead]);

  if (!canRead) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>Module read permission is required to view modules.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Modules</CardTitle>
            <CardDescription>Create modules that can be assigned CRUD permissions in role forms.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="gold" size="sm" disabled={!canCreate} onClick={() => undefined}>
              <Link to="/modules/new" className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add module
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? <LoadingState /> : null}
          {!loading ? (
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Module</th>
                  <th className="px-3 py-2 font-medium">Slug</th>
                  <th className="px-3 py-2 font-medium">Order</th>
                  <th className="px-3 py-2 font-medium">App</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {modules.length === 0 ? (
                  <tr><td className="px-3 py-6" colSpan={6}><EmptyState /></td></tr>
                ) : null}
                {modules.map((module) => (
                  <tr key={module.id} className="border-t border-border">
                    <td className="px-3 py-3 font-medium">{module.moduleName}</td>
                    <td className="px-3 py-3 text-muted-foreground">{module.slug}</td>
                    <td className="px-3 py-3 text-muted-foreground">{module.order ?? '-'}</td>
                    <td className="px-3 py-3"><Badge variant={module.onApp ? 'gold' : 'secondary'}>{module.onApp ? 'Yes' : 'No'}</Badge></td>
                    <td className="px-3 py-3"><Badge variant={module.isActive ? 'success' : 'secondary'}>{module.isActive ? 'Active' : 'Inactive'}</Badge></td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" disabled={!canUpdate} onClick={() => undefined}>
                          <Link to={`/modules/${module.id}/edit`} className="inline-flex items-center gap-2">
                            <Edit className="h-4 w-4" />
                            Edit
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={!canDelete || systemModuleSlugs.has(module.slug)}
                          onClick={() => void deleteModule(module)}
                          aria-label="Deactivate module"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
