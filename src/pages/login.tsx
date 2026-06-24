import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';

type LocationState = {
  from?: { pathname?: string };
};

const inputShellClass =
  'flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 backdrop-blur-md transition-colors focus-within:border-gold-400/50 focus-within:ring-2 focus-within:ring-gold-400/25';

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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 dark">
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: "url('/images/login-bg.jpg')" }}
      />
      <div aria-hidden className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/45 to-amber-950/60" />

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        <div className="mb-8 text-center">
          <p className="font-playfair text-4xl font-bold tracking-wide text-white drop-shadow-sm">Hotel Yuvaan</p>
          <p className="mt-2 text-sm text-white/70">Backoffice access</p>
        </div>

        <div className="rounded-3xl border border-white/20 bg-white/10 p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-8">
          <div className="mb-6 space-y-1.5">
            <h1 className="text-xl font-semibold text-white">Sign in</h1>
            <p className="text-sm text-white/65">Use your backend credentials to continue.</p>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block space-y-2 text-sm font-medium text-white/90">
              Email
              <span className={inputShellClass}>
                <Mail className="h-4 w-4 shrink-0 text-white/50" />
                <input
                  required
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@hotel.com"
                  className="w-full bg-transparent text-white placeholder:text-white/35 outline-none"
                />
              </span>
            </label>

            <div className="space-y-2">
              <label className="block space-y-2 text-sm font-medium text-white/90">
                Password
                <span className={inputShellClass}>
                  <LockKeyhole className="h-4 w-4 shrink-0 text-white/50" />
                  <input
                    required
                    minLength={6}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-transparent text-white placeholder:text-white/35 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="shrink-0 rounded-md p-1 text-white/55 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </span>
              </label>
            </div>

            {error ? (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100 backdrop-blur-sm">
                {error}
              </div>
            ) : null}

            <Button type="submit" variant="gold" className="mt-2 w-full shadow-lg shadow-amber-900/30" disabled={loading}>
              <LockKeyhole className="h-4 w-4" />
              {loading ? 'Please wait' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
