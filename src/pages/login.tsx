import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole, Mail, UserPlus } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type LocationState = {
  from?: { pathname?: string };
};

export function LoginPage() {
  const { isAuthenticated, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState | null)?.from?.pathname ?? '/dashboard';
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await login({ email, password });
      } else {
        await register({ email, password, fullName, phone: phone || undefined });
      }
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
            <CardTitle>{mode === 'login' ? 'Sign in' : 'Create admin user'}</CardTitle>
            <CardDescription>
              {mode === 'login'
                ? 'Use your backend credentials to continue.'
                : 'Registration uses the backend auth API and starts a session.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              {mode === 'register' ? (
                <label className="block space-y-2 text-sm font-medium">
                  Full name
                  <input
                    required
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
              ) : null}

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
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full bg-transparent outline-none"
                  />
                </span>
              </label>

              {mode === 'register' ? (
                <label className="block space-y-2 text-sm font-medium">
                  Phone
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 outline-none focus:ring-2 focus:ring-ring"
                    placeholder="10 digit mobile number"
                  />
                </label>
              ) : null}

              {error ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <Button type="submit" variant="gold" className="w-full" disabled={loading}>
                {mode === 'login' ? <LockKeyhole className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {loading ? 'Please wait' : mode === 'login' ? 'Sign in' : 'Register'}
              </Button>
            </form>

            <Button
              variant="ghost"
              className="mt-3 w-full"
              onClick={() => {
                setError('');
                setMode(mode === 'login' ? 'register' : 'login');
              }}
            >
              {mode === 'login' ? 'Create first admin user' : 'Back to sign in'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
