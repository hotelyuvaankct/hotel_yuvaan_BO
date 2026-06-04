import { BedDouble, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const rooms = [
  { name: 'Presidential Suite', status: 'Ready', rate: '$980', occupancy: 100 },
  { name: 'Deluxe Sea View', status: 'Occupied', rate: '$420', occupancy: 86 },
  { name: 'Family Suite', status: 'Cleaning', rate: '$560', occupancy: 72 },
  { name: 'Garden Villa', status: 'Maintenance', rate: '$710', occupancy: 54 },
];

export function RoomsPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {rooms.map((room) => (
          <Card key={room.name}>
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="rounded-2xl bg-gold-100 p-3 text-gold-800 dark:bg-gold-500/15 dark:text-gold-100">
                  <BedDouble className="h-5 w-5" />
                </div>
                <Badge variant={room.status === 'Ready' ? 'success' : room.status === 'Occupied' ? 'gold' : 'warning'}>
                  {room.status}
                </Badge>
              </div>
              <div>
                <CardTitle>{room.name}</CardTitle>
                <CardDescription className="mt-1">Average nightly rate {room.rate}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Availability</span>
                <span className="font-medium">{room.occupancy}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gold-400 to-bronze-500"
                  style={{ width: `${room.occupancy}%` }}
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                Housekeeping sync enabled
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}