import { FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, Mail, RefreshCw } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import type { PermissionSet } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { getStoredSession } from '@/lib/auth-storage';
import { canAccessPath, getFirstAccessiblePath } from '@/lib/navigation-access';
import { Button } from '@/components/ui/button';

type LocationState = {
  from?: { pathname?: string };
};

const inputShellClass =
  'flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 backdrop-blur-md transition-colors focus-within:border-gold-400/50 focus-within:ring-2 focus-within:ring-gold-400/25';

function resolveLandingPath(
  requestedPath: string | undefined,
  perms: Record<string, PermissionSet> | undefined,
) {
  if (requestedPath && canAccessPath(requestedPath, perms)) {
    return requestedPath;
  }
  return getFirstAccessiblePath(perms);
}

export function LoginPage() {
  const { isAuthenticated, login, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const requestedPath = (location.state as LocationState | null)?.from?.pathname;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [pendingActivation, setPendingActivation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={resolveLandingPath(requestedPath, session?.perms)} replace />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setInfo('');
    setPendingActivation(false);
    setLoading(true);

    try {
      await login({ email, password });
      const nextSession = getStoredSession();
      navigate(resolveLandingPath(requestedPath, nextSession?.perms), { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 403 && err.hasCode('ERR_105')) {
        setPendingActivation(true);
        setError('');
        setInfo(
          'This account is waiting for activation. Open the set-password link from your email, or resend the setup email below.',
        );
      } else {
        setError(err instanceof ApiError ? err.message : 'Unable to authenticate right now.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function onResendSetupEmail() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Enter your email address to resend the activation email.');
      return;
    }

    setResending(true);
    setError('');
    try {
      await api.resendSetupEmail({ email: trimmedEmail });
      setInfo(
        'If this email is eligible for activation, a new setup message has been sent. Check your inbox and spam folder.',
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to resend the activation email right now.');
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 dark">
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: "url('/images/login-bg.jpg')" }}
      />
      <div aria-hidden className="absolute inset-0 bg-overlay backdrop-blur-[2px]" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/45 to-brand/60" />

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        <div className="mb-8 text-center">
          <p className="font-playfair text-4xl font-bold tracking-wide text-white drop-shadow-sm">Hotel Yuvaan</p>
          <p className="mt-2 text-sm text-white/70">Backoffice access</p>
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-8">
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
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-white/90" htmlFor="login-password">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-gold-300 underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <label className="block" htmlFor="login-password">
                <span className={inputShellClass}>
                  <LockKeyhole className="h-4 w-4 shrink-0 text-white/50" />
                  <input
                    id="login-password"
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

            {info ? (
              <div
                className="rounded-xl border border-gold-border/40 bg-gold/15 px-3 py-2 text-sm text-gold-muted backdrop-blur-sm"
                role="status"
              >
                {info}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground backdrop-blur-sm" role="alert">
                {error}
              </div>
            ) : null}

            {pendingActivation ? (
              <Button
                type="button"
                variant="outline"
                className="w-full border-white/25 bg-white/5 text-white hover:bg-white/10"
                disabled={resending || !email.trim()}
                onClick={() => void onResendSetupEmail()}
              >
                <RefreshCw className={`h-4 w-4 ${resending ? 'animate-spin' : ''}`} />
                {resending ? 'Sending…' : 'Resend activation email'}
              </Button>
            ) : null}

            <Button type="submit" variant="primary" className="mt-2 w-full shadow-lg shadow-brand/30" disabled={loading}>
              <LockKeyhole className="h-4 w-4" />
              {loading ? 'Please wait' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-white/55">
            Have an activation link?{' '}
            <Link to="/set-password" className="font-semibold text-gold-300 underline-offset-4 hover:underline">
              Set your password
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
