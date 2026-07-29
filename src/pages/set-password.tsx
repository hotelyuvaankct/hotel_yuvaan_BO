import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import { getPasswordPolicyError, isPasswordValid, passwordsMatch } from '@/lib/password-policy';
import { PasswordPolicyChecklist } from '@/components/auth/password-policy-checklist';
import { Button } from '@/components/ui/button';

type TokenState = 'loading' | 'valid' | 'missing' | 'invalid' | 'expired' | 'used' | 'success';

const inputShellClass =
  'flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 backdrop-blur-md transition-colors focus-within:border-gold-400/50 focus-within:ring-2 focus-within:ring-gold-400/25';

function resolveTokenState(error: unknown): TokenState {
  if (!(error instanceof ApiError)) return 'invalid';
  if (error.hasCode('ERR_107')) return 'expired';
  if (error.hasCode('ERR_108')) return 'used';
  if (error.hasCode('ERR_106')) return 'invalid';
  return 'invalid';
}

function tokenStateMessage(state: TokenState): { title: string; description: string } {
  switch (state) {
    case 'missing':
      return {
        title: 'Activation link required',
        description: 'Open the set-password link from your email to activate this account.',
      };
    case 'expired':
      return {
        title: 'Link expired',
        description: 'This activation link has expired. Ask an administrator to resend the setup email, or use Resend on the sign-in page.',
      };
    case 'used':
      return {
        title: 'Link already used',
        description: 'This activation link was already used. Sign in with your password, or request a new setup email if you still need one.',
      };
    case 'invalid':
      return {
        title: 'Invalid activation link',
        description: 'This activation link is invalid. Check that you opened the full link from your email.',
      };
    default:
      return {
        title: 'Unable to validate link',
        description: 'Something went wrong while validating your activation link.',
      };
  }
}

export function SetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get('token')?.trim() ?? '', [searchParams]);

  const [tokenState, setTokenState] = useState<TokenState>(token ? 'loading' : 'missing');
  const [maskedEmail, setMaskedEmail] = useState<string | undefined>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenState('missing');
      return;
    }

    let cancelled = false;
    (async () => {
      setTokenState('loading');
      setError('');
      try {
        const result = await api.validateSetupToken(token);
        if (cancelled) return;
        if (result?.valid) {
          setMaskedEmail(result.maskedEmail);
          setTokenState('valid');
          return;
        }
        const reason = result?.reason?.toUpperCase() ?? '';
        if (reason.includes('EXPIRED')) setTokenState('expired');
        else if (reason.includes('USED')) setTokenState('used');
        else setTokenState('invalid');
        setMaskedEmail(result?.maskedEmail);
      } catch (err) {
        if (!cancelled) setTokenState(resolveTokenState(err));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || tokenState !== 'valid') return;

    const nextErrors: { password?: string; confirmPassword?: string } = {};
    const policyError = getPasswordPolicyError(password);
    if (policyError) nextErrors.password = policyError;
    if (!passwordsMatch(password, confirmPassword)) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setError('');
    try {
      await api.setPassword({ token, newPassword: password });
      setTokenState('success');
      window.setTimeout(() => navigate('/login', { replace: true }), 1800);
    } catch (err) {
      if (err instanceof ApiError) {
        if (
          err.hasCode('ERR_107') ||
          err.hasCode('ERR_108') ||
          err.hasCode('ERR_106')
        ) {
          setTokenState(resolveTokenState(err));
          return;
        }
        setError(err.message);
      } else {
        setError('Unable to set password right now.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const blocked = tokenState !== 'valid' && tokenState !== 'success' && tokenState !== 'loading';
  const blockedCopy = blocked ? tokenStateMessage(tokenState) : null;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 dark">
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: "url('/images/login-bg.jpg')" }}
      />
      <div aria-hidden className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/45 to-brand/60" />

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        <div className="mb-8 text-center">
          <p className="font-playfair text-4xl font-bold tracking-wide text-white drop-shadow-sm">Hotel Yuvaan</p>
          <p className="mt-2 text-sm text-white/70">Account activation</p>
        </div>

        <div className="rounded-3xl border border-white/20 bg-white/10 p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-8">
          {tokenState === 'loading' ? (
            <p className="text-sm text-white/75" role="status">
              Validating your activation link…
            </p>
          ) : null}

          {tokenState === 'success' ? (
            <div className="space-y-3" role="status">
              <h1 className="text-xl font-semibold text-white">Password set</h1>
              <p className="text-sm text-white/70">
                Your account is ready. Redirecting you to sign in…
              </p>
              <Link to="/login" className="inline-flex text-sm font-semibold text-gold-300 underline-offset-4 hover:underline">
                Continue to sign in
              </Link>
            </div>
          ) : null}

          {blockedCopy ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <h1 className="text-xl font-semibold text-white">{blockedCopy.title}</h1>
                <p className="text-sm text-white/70">{blockedCopy.description}</p>
              </div>
              <Link
                to="/login"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-white/20 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Back to sign in
              </Link>
            </div>
          ) : null}

          {tokenState === 'valid' ? (
            <>
              <div className="mb-6 space-y-1.5">
                <h1 className="text-xl font-semibold text-white">Set your password</h1>
                <p className="text-sm text-white/65">
                  {maskedEmail
                    ? `Choose a password for ${maskedEmail}.`
                    : 'Choose a secure password to activate your account.'}
                </p>
              </div>

              <form className="space-y-4" onSubmit={onSubmit} noValidate>
                <label className="block space-y-2 text-sm font-medium text-white/90">
                  New password
                  <span className={inputShellClass}>
                    <LockKeyhole className="h-4 w-4 shrink-0 text-white/50" />
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Create a strong password"
                      className="w-full bg-transparent text-white placeholder:text-white/35 outline-none"
                      aria-invalid={Boolean(fieldErrors.password)}
                      aria-describedby="set-password-policy"
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
                  {fieldErrors.password ? (
                    <span className="block text-xs font-normal text-red-200">{fieldErrors.password}</span>
                  ) : null}
                </label>

                <label className="block space-y-2 text-sm font-medium text-white/90">
                  Confirm password
                  <span className={inputShellClass}>
                    <LockKeyhole className="h-4 w-4 shrink-0 text-white/50" />
                    <input
                      required
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Re-enter password"
                      className="w-full bg-transparent text-white placeholder:text-white/35 outline-none"
                      aria-invalid={Boolean(fieldErrors.confirmPassword)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                      className="shrink-0 rounded-md p-1 text-white/55 transition-colors hover:bg-white/10 hover:text-white"
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </span>
                  {fieldErrors.confirmPassword ? (
                    <span className="block text-xs font-normal text-red-200">{fieldErrors.confirmPassword}</span>
                  ) : null}
                </label>

                <div id="set-password-policy" className="rounded-xl border border-white/15 bg-black/20 p-3">
                  <PasswordPolicyChecklist
                    password={password}
                    className="[&_p]:text-white/90 [&_li]:text-white/70 [&_.text-emerald-600]:!text-emerald-300"
                  />
                </div>

                {error ? (
                  <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100" role="alert">
                    {error}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  variant="gold"
                  className="mt-2 w-full shadow-lg shadow-brand/30"
                  disabled={submitting || !isPasswordValid(password) || !passwordsMatch(password, confirmPassword)}
                >
                  <LockKeyhole className="h-4 w-4" />
                  {submitting ? 'Saving…' : 'Set password'}
                </Button>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}
