import { TrendingUp, Wallet, BedDouble, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const metrics = [
  { label: 'ADR', value: '$412', icon: Wallet, change: '+6.2%' },
  { label: 'Occupancy', value: '84%', icon: BedDouble, change: '+3.1%' },
  { label: 'Guest retention', value: '71%', icon: Users, change: '+4.8%' },
  { label: 'Revenue growth', value: '18%', icon: TrendingUp, change: '+2.2%' },
];

export function ReportsPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardDescription>{metric.label}</CardDescription>
                    <CardTitle className="mt-2 text-3xl">{metric.value}</CardTitle>
                  </div>
                  <div className="rounded-2xl bg-gold-100 p-3 text-gold-800 dark:bg-gold-500/15 dark:text-gold-100">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">{metric.change} this month</CardContent>
            </Card>
          );
        })}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Revenue trend</CardTitle>
          <CardDescription>Placeholder chart area ready for a real analytics component.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-7">
            {[48, 62, 58, 71, 86, 79, 94].map((value, index) => (
              <div key={`${value}-${index}`} className="flex h-44 items-end rounded-2xl border border-border bg-muted/30 p-3">
                <div className="flex w-full flex-col items-center gap-2">
                  <div
                    className="w-full rounded-xl bg-gradient-to-t from-bronze-600 to-gold-400 transition-transform duration-300 hover:scale-105"
                    style={{ height: `${value}%` }}
                  />
                  <span className="text-xs text-muted-foreground">W{index + 1}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}