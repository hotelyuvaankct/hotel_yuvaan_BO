import { UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const guests = [
  { name: 'Sophia Rao', tier: 'Platinum', stays: 18, note: 'Preferred corner suite' },
  { name: 'Aarav Mehta', tier: 'Gold', stays: 11, note: 'Airport pickup requested' },
  { name: 'Kabir Khan', tier: 'Silver', stays: 7, note: 'Late checkout frequent' },
  { name: 'Ishita Roy', tier: 'Platinum', stays: 22, note: 'Spa and breakfast package' },
];

export function GuestsPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card>
        <CardHeader>
          <CardTitle>Guest profiles</CardTitle>
          <CardDescription>High-value guests and their most recent preferences.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {guests.map((guest) => (
            <div key={guest.name} className="rounded-2xl border border-border bg-muted/40 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gold-100 text-gold-800 dark:bg-gold-500/15 dark:text-gold-100">
                  <UserRound className="h-5 w-5" />
                </div>
                <Badge variant={guest.tier === 'Platinum' ? 'gold' : 'secondary'}>{guest.tier}</Badge>
              </div>
              <p className="mt-4 text-lg font-semibold">{guest.name}</p>
              <p className="text-sm text-muted-foreground">{guest.stays} stays total</p>
              <p className="mt-3 text-sm text-muted-foreground">{guest.note}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}