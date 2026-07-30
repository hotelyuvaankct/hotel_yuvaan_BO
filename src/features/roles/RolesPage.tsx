import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Eye, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { Role } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { optionLabel, recordStatusOptions, recordStatusTone } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { ResponsiveList } from '@/components/ui/responsive-list';
import type { DataTableColumn } from '@/components/ui/data-table';

function RoleActions({
  role,
  canUpdate,
  canDelete,
  onDelete,
}: {
  role: Role;
  canUpdate: boolean;
  canDelete: boolean;
  onDelete: (role: Role) => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2" onClick={(e) => e.stopPropagation()}>
      <Button variant="outline" size="sm" className="h-9 w-9 px-0 sm:w-auto sm:px-3" aria-label="View">
        <Link to={`/roles/${role.id}`} className="inline-flex items-center gap-2">
          <Eye className="h-4 w-4" />
          <span className="hidden sm:inline">View</span>
        </Link>
      </Button>
      <Button variant="outline" size="sm" className="h-9 w-9 px-0 sm:w-auto sm:px-3" aria-label="Edit" disabled={!canUpdate}>
        <Link to={`/roles/${role.id}/edit`} className="inline-flex items-center gap-2">
          <Edit className="h-4 w-4" />
          <span className="hidden sm:inline">Edit</span>
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => void onDelete(role)}
        disabled={!canDelete || role.name.toUpperCase() === 'ADMIN'}
        aria-label="Delete role"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

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
      description: `This will delete the ${role.displayName} role and every user assigned to it, including users with other roles.`,
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

  const columns = useMemo<Array<DataTableColumn<Role>>>(
    () => [
      {
        key: 'displayName',
        header: 'Display name',
        render: (row) => <span className="font-medium">{row.displayName}</span>,
      },
      { key: 'name', header: 'Role name' },
      {
        key: 'description',
        header: 'Description',
        render: (row) => row.description || '-',
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => (
          <Badge tone={recordStatusTone(row.status)}>{optionLabel(recordStatusOptions, row.status)}</Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) => (
          <RoleActions
            role={row}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onDelete={deleteRole}
          />
        ),
      },
    ],
    [canUpdate, canDelete],
  );

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
    <div className="min-w-0 space-y-6 animate-fade-in-up">
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="flex-col items-stretch gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div>
            <CardTitle>Roles</CardTitle>
            <CardDescription className="hidden sm:block">
              Only the ADMIN role is protected. Deleting another role also deletes all users assigned to it.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="h-9 w-9 px-0 sm:w-auto sm:px-3" aria-label="Refresh" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="primary" size="sm" className="h-9 w-9 px-0 sm:w-auto sm:px-3" aria-label="Add role" disabled={!canCreate}>
              <Link to="/roles/new" className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add role</span>
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ResponsiveList
            columns={columns}
            data={roles}
            isLoading={loading}
            emptyState={<EmptyState />}
            renderMobileCard={(role) => (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="truncate font-semibold">{role.displayName}</p>
                  <Badge tone={recordStatusTone(role.status)} className="shrink-0">
                    {optionLabel(recordStatusOptions, role.status)}
                  </Badge>
                </div>
                <dl className="space-y-2 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="shrink-0 text-muted-foreground">Role name</dt>
                    <dd className="min-w-0 text-right text-foreground">{role.name}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="shrink-0 text-muted-foreground">Description</dt>
                    <dd className="min-w-0 text-right text-foreground">{role.description || '-'}</dd>
                  </div>
                </dl>
                <RoleActions
                  role={role}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                  onDelete={deleteRole}
                />
              </div>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
