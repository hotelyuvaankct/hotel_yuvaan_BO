import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';
import { api } from '@/lib/api';
import type { Permission, Role } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { optionLabel, recordStatusOptions } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingState } from '@/components/common/loading-state';
import { PageToolbar } from '@/components/common/page-toolbar';

export function RoleViewPage() {
  const { id } = useParams();
  const roleId = Number(id);
  const navigate = useNavigate();
  const { session } = useAuth();
  const { showToast } = useToast();
  const canRead = hasPermission(session?.perms, 'roles', 'read');
  const canUpdate = hasPermission(session?.perms, 'roles', 'update');
  const [role, setRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!canRead || !roleId) return;
      setLoading(true);
      try {
        const [roleRecord, permissionList] = await Promise.all([api.getRole(roleId), api.listPermissions(roleId)]);
        setRole(roleRecord);
        setPermissions(permissionList ?? []);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Unable to load role details.', 'error');
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [canRead, roleId, showToast]);

  if (!canRead) {
    return <PermissionCard module="roles" />;
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Button variant="ghost" onClick={() => navigate('/roles')}>
        <ArrowLeft className="h-4 w-4" />
        Back to roles
      </Button>

      <PageToolbar
        title="Role details"
        description="Role metadata and selected module CRUD permissions."
        actions={
          role && canUpdate ? (
            <Button variant="gold" size="sm" onClick={() => undefined}>
              <Link to={`/roles/${role.id}/edit`} className="inline-flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Update role
              </Link>
            </Button>
          ) : null
        }
      />

      {loading ? <LoadingState /> : null}
      {!loading && !role ? <EmptyState label="No role details found." /> : null}
      {role ? (
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <Card>
            <CardHeader>
              <CardTitle>{role.displayName}</CardTitle>
              <CardDescription>{role.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <DetailRow label="Description" value={role.description || '-'} />
              <DetailRow label="Status" value={optionLabel(recordStatusOptions, role.status)} />
              <DetailRow label="System role" value={role.isSystemRole ? 'Yes' : 'No'} />
              <DetailRow label="Created" value={formatDate(role.createdAt)} />
              <DetailRow label="Updated" value={formatDate(role.updatedAt)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Module permissions</CardTitle>
              <CardDescription>CRUD access configured for this role.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Module</th>
                    <th className="px-3 py-2 font-medium">Read</th>
                    <th className="px-3 py-2 font-medium">Create</th>
                    <th className="px-3 py-2 font-medium">Update</th>
                    <th className="px-3 py-2 font-medium">Delete</th>
                    <th className="px-3 py-2 font-medium">App</th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.length === 0 ? (
                    <tr>
                      <td className="px-3 py-6" colSpan={6}><EmptyState /></td>
                    </tr>
                  ) : null}
                  {permissions.map((permission) => (
                    <tr key={permission.id} className="border-t border-border">
                      <td className="px-3 py-3">
                        <p className="font-medium">{permission.moduleName}</p>
                        <p className="text-xs text-muted-foreground">{permission.moduleSlug}</p>
                      </td>
                      <PermissionCell allowed={permission.isListAccess} />
                      <PermissionCell allowed={permission.isAddAccess} />
                      <PermissionCell allowed={permission.isUpdateAccess} />
                      <PermissionCell allowed={permission.isDeleteAccess} />
                      <PermissionCell allowed={permission.isOnApp} />
                    </tr>
                  ))}
                </tbody>
              </table>
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
