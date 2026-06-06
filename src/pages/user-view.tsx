import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';
import { api } from '@/lib/api';
import type { UserAccess } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { optionLabel, recordStatusOptions } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { FullPageLoader } from '@/components/common/loading-state';
import { PageToolbar } from '@/components/common/page-toolbar';

const genderOptions = [
  { value: 1, label: 'Male' },
  { value: 2, label: 'Female' },
  { value: 3, label: 'Other' },
  { value: 4, label: 'Prefer not to say' },
];

export function UserViewPage() {
  const { id } = useParams();
  const userId = Number(id);
  const navigate = useNavigate();
  const { session } = useAuth();
  const { showToast } = useToast();
  const canRead = hasPermission(session?.perms, 'users', 'read');
  const canUpdate = hasPermission(session?.perms, 'users', 'update');
  const [access, setAccess] = useState<UserAccess | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!canRead || !userId) return;
      setLoading(true);
      try {
        setAccess(await api.getUserAccess(userId));
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Unable to load user details.', 'error');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [canRead, userId, showToast]);

  if (!canRead) {
    return <PermissionCard module="users" />;
  }

  if (loading) {
    return <FullPageLoader label="Loading user details..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Button variant="ghost" onClick={() => navigate('/users')}>
        <ArrowLeft className="h-4 w-4" />
        Back to users
      </Button>

      <PageToolbar
        title="User details"
        description="Profile, assigned roles, and effective module permissions from the API."
        actions={
          access && canUpdate ? (
            <Button variant="gold" size="sm" onClick={() => undefined}>
              <Link to={`/users/${access.user.id}/edit`} className="inline-flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Update user
              </Link>
            </Button>
          ) : null
        }
      />

      {!access ? <EmptyState label="No user details found." /> : null}
      {access ? (
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <Card>
            <CardHeader>
              <CardTitle>{access.user.fullName || 'Unnamed user'}</CardTitle>
              <CardDescription>{access.user.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <DetailRow label="Phone" value={access.user.phone || '-'} />
              <DetailRow label="Gender" value={optionLabel(genderOptions, access.user.gender)} />
              <DetailRow label="Date of birth" value={access.user.dateOfBirth || '-'} />
              <DetailRow label="Status" value={optionLabel(recordStatusOptions, access.user.status)} />
              <DetailRow label="Created" value={formatDate(access.user.createdAt)} />
              <DetailRow label="Updated" value={formatDate(access.user.updatedAt)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Roles and permissions</CardTitle>
              <CardDescription>Effective access after merging all assigned roles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <p className="text-sm font-medium">Assigned roles</p>
                <div className="flex flex-wrap gap-2">
                  {access.roles.length === 0 ? <EmptyState label="No roles assigned." /> : null}
                  {access.roles.map((role) => <Badge key={role.id} variant="gold">{role.roleDisplayName}</Badge>)}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Module</th>
                      <th className="px-3 py-2 font-medium">Read</th>
                      <th className="px-3 py-2 font-medium">Create</th>
                      <th className="px-3 py-2 font-medium">Update</th>
                      <th className="px-3 py-2 font-medium">Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(access.perms).length === 0 ? (
                      <tr>
                        <td className="px-3 py-6" colSpan={5}><EmptyState /></td>
                      </tr>
                    ) : null}
                    {Object.entries(access.perms).map(([module, perms]) => (
                      <tr key={module} className="border-t border-border">
                        <td className="px-3 py-3 font-medium">{module}</td>
                        <PermissionCell allowed={perms.read} />
                        <PermissionCell allowed={perms.create} />
                        <PermissionCell allowed={perms.update} />
                        <PermissionCell allowed={perms.delete} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function PermissionCell({ allowed }: { allowed: boolean }) {
  return (
    <td className="px-3 py-3">
      <Badge variant={allowed ? 'success' : 'secondary'}>{allowed ? 'Yes' : 'No'}</Badge>
    </td>
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

function formatDate(value?: string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
