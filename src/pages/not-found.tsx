import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
          <CardDescription>The requested admin page does not exist.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            to="/dashboard"
            className={cn(
              'inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-gold-400 to-gold-600 px-6 text-sm font-semibold text-white shadow-lg shadow-gold-500/20 transition hover:from-gold-500 hover:to-gold-700',
            )}
          >
            Back to dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}