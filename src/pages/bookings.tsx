import { CalendarRange, CheckCircle2, Clock3, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const bookings = [
  { guest: 'Aarav Mehta', room: '802', dates: 'Jun 4 - Jun 7', status: 'Confirmed', icon: CheckCircle2 },
  { guest: 'Sophia Rao', room: '1201', dates: 'Jun 4 - Jun 9', status: 'VIP', icon: CalendarRange },
  { guest: 'Kabir Khan', room: '511', dates: 'Jun 5 - Jun 6', status: 'Payment due', icon: CreditCard },
  { guest: 'Ishita Roy', room: '233', dates: 'Jun 5 - Jun 8', status: 'Late arrival', icon: Clock3 },
];

export function BookingsPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card>
        <CardHeader>
          <CardTitle>Bookings</CardTitle>
          <CardDescription>All active reservations and operational status in one list.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-sm text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Guest</th>
                  <th className="px-4 py-2 font-medium">Room</th>
                  <th className="px-4 py-2 font-medium">Dates</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => {
                  const Icon = booking.icon;
                  return (
                    <tr key={booking.guest} className="rounded-2xl bg-muted/40">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-100 text-gold-800 dark:bg-gold-500/15 dark:text-gold-100">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold">{booking.guest}</p>
                            <p className="text-sm text-muted-foreground">Guest profile synced</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-medium">#{booking.room}</td>
                      <td className="px-4 py-4 text-muted-foreground">{booking.dates}</td>
                      <td className="px-4 py-4">
                        <Badge
                          variant={
                            booking.status === 'VIP'
                              ? 'gold'
                              : booking.status === 'Payment due'
                              ? 'warning'
                              : booking.status === 'Late arrival'
                              ? 'secondary'
                              : 'success'
                          }
                        >
                          {booking.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button variant="ghost" size="sm">
                          View details
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}