import { useEffect, useMemo, useState } from 'react';
import { KeyRound, ShieldCheck, Users } from 'lucide-react';
import { api } from '@/lib/api';
import type { Module, Role, User } from '@/lib/api-types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export function DashboardPage() {
  const { session } = useAuth();
  const canReadUsers = hasPermission(session?.perms, 'users', 'read');
  const canReadRoles = hasPermission(session?.perms, 'roles', 'read');
  const canReadModules = hasPermission(session?.perms, 'modules', 'read');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [userPage, rolesList, modulesList] = await Promise.all([
          canReadUsers ? api.listUsers(0, 5) : Promise.resolve({ content: [], totalElements: 0, totalPages: 0, number: 0, size: 5 }),
          canReadRoles ? api.listRoles() : Promise.resolve([]),
          canReadModules ? api.listModules() : Promise.resolve([]),
        ]);
        setUsers(userPage.content ?? []);
        setRoles(rolesList ?? []);
        setModules(modulesList ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load dashboard data.');
      }
    }

    void loadDashboard();
  }, [canReadModules, canReadRoles, canReadUsers]);

  const stats = useMemo(
    () => [
      ...(canReadUsers ? [{ label: 'Users', value: String(users.length), delta: 'Loaded from /users', icon: Users }] : []),
      ...(canReadRoles ? [{ label: 'Roles', value: String(roles.length), delta: 'Loaded from /roles', icon: ShieldCheck }] : []),
      ...(canReadModules ? [{ label: 'Modules', value: String(modules.length), delta: 'Loaded from /modules', icon: KeyRound }] : []),
    ],
    [canReadModules, canReadRoles, canReadUsers, modules.length, roles.length, users.length],
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        {canReadModules ? <Card>
          <CardHeader>
            <CardTitle>API summary</CardTitle>
            <CardDescription>Counts are loaded from authenticated backend APIs.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.length === 0 ? <NoData /> : null}
            <div className="grid gap-4 sm:grid-cols-3">
              {stats.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-xl border border-border bg-muted/40 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">{item.label}</p>
                        <p className="mt-2 text-3xl font-semibold">{item.value}</p>
                      </div>
                      <div className="rounded-xl bg-gold-100 p-3 text-gold-700 dark:bg-gold-500/15 dark:text-gold-100">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">{item.delta}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card> : null}

        <Card>
          <CardHeader>
            <CardTitle>API modules</CardTitle>
            <CardDescription>Modules available for role permissions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {modules.length === 0 ? <NoData /> : null}
            {modules.map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-muted/40 px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.moduleName}</span>
                  <span className="text-muted-foreground">{item.slug}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {canReadUsers ? <section>
        <Card>
          <CardHeader>
            <CardTitle>Recent users</CardTitle>
            <CardDescription>Latest records returned by the users API.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users.length === 0 ? <NoData /> : null}
              {users.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/50 px-4 py-3">
                  <div>
                    <p className="font-semibold">{item.fullName || 'Unnamed user'}</p>
                    <p className="text-sm text-muted-foreground">{item.email}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Badge variant={item.status === 1 ? 'success' : 'secondary'}>{item.status === 1 ? 'Active' : 'Inactive'}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section> : null}
    </div>
  );
}

function NoData() {
  return <p className="text-sm text-muted-foreground">No data available.</p>;
}
