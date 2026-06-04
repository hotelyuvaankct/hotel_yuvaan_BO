import { ArrowUpRight, CheckCircle2, Clock3, DollarSign, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const stats = [
  { label: 'Occupancy', value: '84%', delta: '+12%', icon: CheckCircle2 },
  { label: 'Today revenue', value: '$42.8k', delta: '+8.4%', icon: DollarSign },
  { label: 'Check-ins', value: '26', delta: '8 pending', icon: Clock3 },
  { label: 'Upsells', value: '14', delta: '+5 this week', icon: Sparkles },
];

const arrivals = [
  { guest: 'Aarav Mehta', room: 'Deluxe Sea View', time: '03:15 PM', status: 'Confirmed' },
  { guest: 'Sophia Rao', room: 'Presidential Suite', time: '04:00 PM', status: 'VIP' },
  { guest: 'Kabir Khan', room: 'Family Suite', time: '05:30 PM', status: 'Payment due' },
];

const roomPulse = [
  { name: 'Premium', value: 92 },
  { name: 'Deluxe', value: 84 },
  { name: 'Family', value: 78 },
  { name: 'Suites', value: 66 },
];

export function DashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <section className="grid gap-6 xl:grid-cols-[1.65fr_0.95fr]">
        <Card className="overflow-hidden border-gold-500/20 bg-gradient-to-br from-card via-card to-gold-500/10">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="gold">Morning shift</Badge>
              <Badge variant="secondary">Live operations</Badge>
            </div>
            <div>
              <CardTitle className="font-playfair text-3xl sm:text-5xl">
                The house is moving well today.
              </CardTitle>
              <CardDescription className="mt-3 max-w-2xl text-base">
                Keep an eye on arrivals, housekeeping, and revenue momentum from the same screen.
                The layout stays warm in light mode and crisp in dark mode.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="gold">
                View reservations
                <ArrowUpRight className="h-4 w-4" />
              </Button>
              <Button variant="outline">Open housekeeping queue</Button>
            </div>
          </CardHeader>
        </Card>

        <Card className="bg-card/90">
          <CardHeader>
            <CardTitle>Operations summary</CardTitle>
            <CardDescription>Today&apos;s rhythm across the front desk and floors.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {roomPulse.map((item) => (
              <div key={item.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground">{item.value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold-400 to-bronze-500"
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className="animate-scale-in">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardDescription>{item.label}</CardDescription>
                    <CardTitle className="mt-2 text-3xl">{item.value}</CardTitle>
                  </div>
                  <div className="rounded-2xl bg-gold-100 p-3 text-gold-700 dark:bg-gold-500/15 dark:text-gold-100">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-muted-foreground">{item.delta}</CardContent>
            </Card>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader>
            <CardTitle>Arrivals queue</CardTitle>
            <CardDescription>Guests expected within the next four hours.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {arrivals.map((item) => (
                <div key={item.guest} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-muted/50 px-4 py-3">
                  <div>
                    <p className="font-semibold">{item.guest}</p>
                    <p className="text-sm text-muted-foreground">{item.room}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">{item.time}</span>
                    <Badge variant={item.status === 'VIP' ? 'gold' : item.status === 'Payment due' ? 'warning' : 'success'}>
                      {item.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Fast paths for the desk and operations team.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {['Create booking', 'Assign room', 'Mark cleaning complete', 'Send guest message'].map((action) => (
              <Button key={action} variant="outline" className="w-full justify-start">
                {action}
              </Button>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}