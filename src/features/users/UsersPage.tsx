import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Eye, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { User } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { genderOptions, optionLabel, userStatusOptions } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { PageToolbar } from '@/components/common/page-toolbar';
import { Pagination } from '@/components/common/pagination';
import { ResponsiveList } from '@/components/ui/responsive-list';
import type { DataTableColumn } from '@/components/ui/data-table';
import { Status } from '@/lib/constants';

function userStatusTone(status?: number): BadgeTone {
  if (status === Status.ACTIVE) return 'success';
  if (status === Status.PENDING) return 'warning';
  return 'neutral';
}

function UserActions({
  user,
  canUpdate,
  canDelete,
  onDelete,
}: {
  user: User;
  canUpdate: boolean;
  canDelete: boolean;
  onDelete: (user: User) => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2" onClick={(e) => e.stopPropagation()}>
      <Button variant="outline" size="sm">
        <Link to={`/users/${user.id}`} className="inline-flex items-center gap-2">
          <Eye className="h-4 w-4" />
          View
        </Link>
      </Button>
      <Button variant="outline" size="sm" disabled={!canUpdate}>
        <Link to={`/users/${user.id}/edit`} className="inline-flex items-center gap-2">
          <Edit className="h-4 w-4" />
          Edit
        </Link>
      </Button>
      <Button variant="ghost" size="icon" onClick={() => onDelete(user)} disabled={!canDelete} aria-label="Delete user">
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function UsersPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const canCreate = hasPermission(session?.perms, 'users', 'create');
  const canRead = hasPermission(session?.perms, 'users', 'read');
  const canUpdate = hasPermission(session?.perms, 'users', 'update');
  const canDelete = hasPermission(session?.perms, 'users', 'delete');
  const currentUserId = session?.uid ?? session?.user?.id;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  async function load(targetPage = page) {
    setLoading(true);
    try {
      const userPage = await api.listUsers(targetPage, 10);
      setUsers(userPage.content ?? []);
      setPage(userPage.number ?? targetPage);
      setTotalPages(userPage.totalPages ?? 0);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load users.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(user: User) {
    if (user.id === currentUserId) {
      showToast('You cannot delete your own account.', 'error');
      return;
    }
    const confirmed = await confirm({
      title: 'Delete user?',
      description: `This will remove ${user.fullName || user.email} from active backoffice access.`,
      confirmLabel: 'Delete user',
    });
    if (!confirmed) return;
    try {
      await api.deleteUser(user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      showToast('User deleted.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete user.', 'error');
    }
  }

  useEffect(() => {
    if (canRead) void load();
  }, [canRead]);

  const columns = useMemo<Array<DataTableColumn<User>>>(
    () => [
      {
        key: 'fullName',
        header: 'Name',
        render: (row) => <span className="font-medium">{row.fullName || 'Unnamed user'}</span>,
      },
      { key: 'email', header: 'Email' },
      {
        key: 'gender',
        header: 'Gender',
        render: (row) => optionLabel(genderOptions, row.gender),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => (
          <Badge tone={userStatusTone(row.status)}>{optionLabel(userStatusOptions, row.status)}</Badge>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) => (
          <UserActions
            user={row}
            canUpdate={canUpdate}
            canDelete={canDelete && row.id !== currentUserId}
            onDelete={deleteUser}
          />
        ),
      },
    ],
    [canUpdate, canDelete, currentUserId],
  );

  if (!canRead) {
    return <PermissionCard module="users" />;
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageToolbar
        title="Users"
        description="Listing table is loaded from the users API."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="primary" size="sm" disabled={!canCreate}>
              <Link to="/users/new" className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add user
              </Link>
            </Button>
          </>
        }
      />

      <section>
        <Card>
          <CardHeader>
            <CardTitle>User listing</CardTitle>
            <CardDescription>View, edit, and delete user records.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveList
              columns={columns}
              data={users}
              isLoading={loading}
              emptyState={<EmptyState />}
              renderMobileCard={(user) => (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="truncate font-semibold">{user.fullName || 'Unnamed user'}</p>
                    <Badge tone={userStatusTone(user.status)} className="shrink-0">
                      {optionLabel(userStatusOptions, user.status)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-y-1 text-sm">
                    <span className="text-muted-foreground">Email</span>
                    <span className="truncate text-foreground">{user.email}</span>
                    <span className="text-muted-foreground">Gender</span>
                    <span className="text-foreground">{optionLabel(genderOptions, user.gender)}</span>
                  </div>
                  <UserActions
                    user={user}
                    canUpdate={canUpdate}
                    canDelete={canDelete && user.id !== currentUserId}
                    onDelete={deleteUser}
                  />
                </div>
              )}
            />
            <Pagination
              page={page}
              totalPages={totalPages}
              loading={loading}
              onPageChange={(p) => void load(p)}
            />
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
