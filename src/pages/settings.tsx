import { MoonStar, ShieldCheck, SlidersHorizontal, SunMedium } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6 animate-fade-in-up">
      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Brand appearance</CardTitle>
            <CardDescription>Keep the warm gold/bronze tone and switch between light and dark modes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant={theme === 'light' ? 'gold' : 'outline'}
              className="w-full justify-start"
              onClick={() => setTheme('light')}
            >
              <SunMedium className="h-4 w-4" />
              Light theme
            </Button>
            <Button
              variant={theme === 'dark' ? 'gold' : 'outline'}
              className="w-full justify-start"
              onClick={() => setTheme('dark')}
            >
              <MoonStar className="h-4 w-4" />
              Dark theme
            </Button>
            <Button
              variant={theme === 'system' ? 'gold' : 'outline'}
              className="w-full justify-start"
              onClick={() => setTheme('system')}
            >
              Use system preference
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System controls</CardTitle>
            <CardDescription>Core admin defaults for the hotel operations team.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              'Multi-property support',
              'Automated guest notifications',
              'Payment gateway sync',
              'Housekeeping status refresh',
            ].map((setting) => (
              <div key={setting} className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 px-4 py-3">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-gold-600" />
                  <span className="font-medium">{setting}</span>
                </div>
                <span className="text-sm text-muted-foreground">Enabled</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Operational defaults</CardTitle>
          <CardDescription>Fine-tune house rules and booking behavior.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {['Check-in time', 'Check-out time', 'Payment hold'].map((field) => (
            <div key={field} className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                {field}
              </label>
              <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                Configure value here
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}