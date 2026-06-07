import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type LocationState = {
  from?: { pathname?: string };
};

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from?.pathname ?? '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to authenticate right now.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="mb-6 text-center">
          <p className="font-playfair text-4xl font-bold tracking-wide">Hotel Yuvaan</p>
          <p className="mt-2 text-sm text-muted-foreground">Backoffice access</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Use your backend credentials to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <label className="block space-y-2 text-sm font-medium">
                Email
                <span className="flex h-11 items-center gap-2 rounded-xl border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full bg-transparent outline-none"
                  />
                </span>
              </label>

              <label className="block space-y-2 text-sm font-medium">
                Password
                <span className="flex h-11 items-center gap-2 rounded-xl border border-input bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
                  <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                  <input
                    required
                    minLength={6}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full bg-transparent outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-muted-foreground hover:text-foreground focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>

              {error ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <Button type="submit" variant="gold" className="w-full" disabled={loading}>
                <LockKeyhole className="h-4 w-4" />
                {loading ? 'Please wait' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
