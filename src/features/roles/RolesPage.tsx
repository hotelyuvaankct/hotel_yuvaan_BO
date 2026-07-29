import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Eye, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { Role } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { optionLabel, recordStatusOptions } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { PageToolbar } from '@/components/common/page-toolbar';
import { ResponsiveList } from '@/components/ui/responsive-list';
import type { DataTableColumn } from '@/components/ui/data-table';
import { Status } from '@/lib/constants';

function recordStatusTone(status?: number): BadgeTone {
  return status === Status.ACTIVE ? 'success' : 'neutral';
}

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
      <Button variant="outline" size="sm">
        <Link to={`/roles/${role.id}`} className="inline-flex items-center gap-2">
          <Eye className="h-4 w-4" />
          View
        </Link>
      </Button>
      <Button variant="outline" size="sm" disabled={!canUpdate}>
        <Link to={`/roles/${role.id}/edit`} className="inline-flex items-center gap-2">
          <Edit className="h-4 w-4" />
          Edit
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
            <Button variant="primary" size="sm" disabled={!canCreate}>
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
          <CardDescription>Only the ADMIN role is protected. Deleting another role also deletes all users assigned to it.</CardDescription>
        </CardHeader>
        <CardContent>
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
                <div className="grid grid-cols-2 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Role name</span>
                  <span className="text-foreground">{role.name}</span>
                  <span className="text-muted-foreground">Description</span>
                  <span className="text-foreground">{role.description || '-'}</span>
                </div>
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
