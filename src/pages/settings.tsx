import { RefreshCw } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/components/theme-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { session, refreshProfile } = useAuth();

  return (
    <div className="space-y-6 animate-fade-in-up">
      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Authenticated user and permissions loaded from the profile API.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="font-semibold">{session?.user?.fullName || 'Backoffice user'}</p>
              <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
            </div>
            <Button variant="outline" onClick={() => void refreshProfile()}>
              <RefreshCw className="h-4 w-4" />
              Refresh profile
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Theme preference stays local to this browser.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {(['light', 'dark', 'system'] as const).map((option) => (
              <Button key={option} variant={theme === option ? 'gold' : 'outline'} onClick={() => setTheme(option)}>
                {option[0].toUpperCase() + option.slice(1)}
              </Button>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Current permissions</CardTitle>
          <CardDescription>These module permissions decide whether CRUD controls are enabled.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(session?.perms ?? {}).length === 0 ? (
            <p className="text-sm text-muted-foreground">No data available.</p>
          ) : null}
          {Object.entries(session?.perms ?? {}).map(([module, perms]) => (
            <div key={module} className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="font-semibold">{module}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {Object.entries(perms).map(([action, allowed]) => (
                  <Badge key={action} variant={allowed ? 'success' : 'secondary'}>
                    {action}: {allowed ? 'yes' : 'no'}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
