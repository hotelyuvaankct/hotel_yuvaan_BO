import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Eye, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { User } from '@/lib/api-types';
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
import { Status } from '@/lib/constants';

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

  async function load() {
    setLoading(true);
    try {
      const userPage = await api.listUsers(0, 100);
      setUsers(userPage.content ?? []);
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
            <Button variant="gold" size="sm" disabled={!canCreate} onClick={() => undefined}>
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
          <CardContent className="overflow-x-auto">
            {loading ? <LoadingState /> : null}
            {!loading ? (
              <table className="w-full min-w-[760px] text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Gender</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6" colSpan={5}><EmptyState /></td>
                    </tr>
                  ) : null}
                  {users.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      canUpdate={canUpdate}
                      canDelete={canDelete && user.id !== currentUserId}
                      onDelete={deleteUser}
                    />
                  ))}
                </tbody>
              </table>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function UserRow({
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
    <tr className="border-t border-border">
      <td className="px-3 py-3 font-medium">{user.fullName || 'Unnamed user'}</td>
      <td className="px-3 py-3 text-muted-foreground">{user.email}</td>
      <td className="px-3 py-3 text-muted-foreground">{optionLabel([{ value: 1, label: 'Male' }, { value: 2, label: 'Female' }, { value: 3, label: 'Other' }, { value: 4, label: 'Prefer not to say' }], user.gender)}</td>
      <td className="px-3 py-3">
        <Badge variant={user.status === Status.ACTIVE ? 'success' : 'secondary'}>{optionLabel(recordStatusOptions, user.status)}</Badge>
      </td>
      <td className="px-3 py-3">
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => undefined}>
            <Link to={`/users/${user.id}`} className="inline-flex items-center gap-2"><Eye className="h-4 w-4" />View</Link>
          </Button>
          <Button variant="outline" size="sm" disabled={!canUpdate} onClick={() => undefined}>
            <Link to={`/users/${user.id}/edit`} className="inline-flex items-center gap-2"><Edit className="h-4 w-4" />Edit</Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(user)} disabled={!canDelete} aria-label="Delete user"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </td>
    </tr>
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
