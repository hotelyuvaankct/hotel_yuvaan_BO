import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Eye, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { Role } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { optionLabel, recordStatusOptions } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingState } from '@/components/common/loading-state';
import { PageToolbar } from '@/components/common/page-toolbar';

export function RolesPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const canCreate = hasPermission(session?.perms, 'roles', 'create');
  const canRead = hasPermission(session?.perms, 'roles', 'read');
  const canUpdate = hasPermission(session?.perms, 'roles', 'update');
  const canDelete = hasPermission(session?.perms, 'roles', 'delete');
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      setRoles(await api.listRoles());
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load roles.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function deleteRole(role: Role) {
    const confirmed = await confirm({
      title: 'Delete role?',
      description: `This will remove the ${role.displayName} role and its module permissions.`,
      confirmLabel: 'Delete role',
    });
    if (!confirmed) return;
    try {
      await api.deleteRole(role.id);
      setRoles((current) => current.filter((item) => item.id !== role.id));
      showToast('Role deleted.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete role.', 'error');
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
          <CardDescription>Your current role does not include read access for roles.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageToolbar
        title="Roles"
        description="Listing table is loaded from the roles API."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="gold" size="sm" disabled={!canCreate} onClick={() => undefined}>
              <Link to="/roles/new" className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add role
              </Link>
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Role listing</CardTitle>
          <CardDescription>System roles like SUPER_ADMIN and ADMIN cannot be deleted.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? <LoadingState /> : null}
          {!loading ? (
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Display name</th>
                  <th className="px-3 py-2 font-medium">Role name</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.length === 0 ? (
                  <tr>
                    <td className="px-3 py-6" colSpan={5}><EmptyState /></td>
                  </tr>
                ) : null}
                {roles.map((role) => (
                  <tr key={role.id} className="border-t border-border">
                    <td className="px-3 py-3 font-medium">{role.displayName}</td>
                    <td className="px-3 py-3 text-muted-foreground">{role.name}</td>
                    <td className="px-3 py-3 text-muted-foreground">{role.description || '-'}</td>
                    <td className="px-3 py-3">
                      <Badge variant={role.status === 1 ? 'success' : 'secondary'}>{optionLabel(recordStatusOptions, role.status)}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => undefined}>
                          <Link to={`/roles/${role.id}`} className="inline-flex items-center gap-2"><Eye className="h-4 w-4" />View</Link>
                        </Button>
                        <Button variant="outline" size="sm" disabled={!canUpdate} onClick={() => undefined}>
                          <Link to={`/roles/${role.id}/edit`} className="inline-flex items-center gap-2"><Edit className="h-4 w-4" />Edit</Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => void deleteRole(role)}
                          disabled={!canDelete || role.isSystemRole}
                          aria-label="Delete role"
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
