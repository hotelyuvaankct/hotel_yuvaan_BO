import { useEffect, useState } from 'react';
import { RefreshCw, UserRound } from 'lucide-react';
import { api } from '@/lib/api';
import type { User } from '@/lib/api-types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingState } from '@/components/common/loading-state';
import { Status } from '@/lib/constants';

export function GuestsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadUsers() {
    setLoading(true);
    setError('');
    try {
      const page = await api.listUsers(0, 24);
      setUsers(page.content ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load guests.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>User and guest profiles</CardTitle>
            <CardDescription>Live records from the authenticated users API.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {loading ? <LoadingState label="Loading profiles..." className="md:col-span-2 xl:col-span-4" /> : null}
          {!loading && users.length === 0 ? <p className="text-sm text-muted-foreground">No users found.</p> : null}
          {users.map((guest) => (
            <div key={guest.id} className="rounded-2xl border border-border bg-muted/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-100 text-gold-800 dark:bg-gold-500/15 dark:text-gold-100">
                  <UserRound className="h-5 w-5" />
                </div>
                <Badge variant={guest.status === Status.ACTIVE ? 'success' : 'secondary'}>
                  {guest.status === Status.ACTIVE ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="mt-4 text-lg font-semibold">{guest.fullName || 'Unnamed user'}</p>
              <p className="text-sm text-muted-foreground">{guest.email}</p>
              <p className="mt-3 text-sm text-muted-foreground">{guest.phone || 'No phone saved'}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
