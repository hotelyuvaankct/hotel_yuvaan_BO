import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function BookingsPage() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card>
        <CardHeader>
          <CardTitle>Bookings</CardTitle>
          <CardDescription>No bookings API is available in the backend yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No data available.</p>
        </CardContent>
      </Card>
    </div>
  );
}
