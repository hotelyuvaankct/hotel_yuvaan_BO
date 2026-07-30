import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { KeyRound, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getPasswordPolicyError, isPasswordValid, passwordsMatch } from '@/lib/password-policy';
import { PasswordPolicyChecklist } from '@/components/auth/password-policy-checklist';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

type Step = 'email' | 'verify' | 'reset';

const OTP_TTL_SECONDS = 10 * 60;
const RESEND_COOLDOWN_SECONDS = 60;

const inputShellClass =
  'flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 backdrop-blur-md transition-colors focus-within:border-gold-400/50 focus-within:ring-2 focus-within:ring-gold-400/25';

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function ForgotPasswordPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState<string | undefined>();
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const resetTokenRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      resetTokenRef.current = null;
    };
  }, []);

  const timersActive = otpExpiresIn > 0 || resendCooldown > 0;

  useEffect(() => {
    if (!timersActive) return undefined;
    const timer = window.setInterval(() => {
      setOtpExpiresIn((current) => (current > 0 ? current - 1 : 0));
      setResendCooldown((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [timersActive]);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  function clearSensitiveState() {
    resetTokenRef.current = null;
    setOtp('');
    setPassword('');
    setConfirmPassword('');
  }

  async function requestOtp(trimmedEmail: string) {
    setBusy(true);
    setError('');
    setFieldErrors({});
    try {
      const result = await api.forgotPasswordRequestOtp({ email: trimmedEmail });
      setMaskedEmail(result?.maskedEmail);
      setStep('verify');
      setOtp('');
      setOtpExpiresIn(OTP_TTL_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      showToast(result?.message || 'Verification code sent to your email.', 'success');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Unable to request a verification code.',
      );
      setStep('email');
    } finally {
      setBusy(false);
    }
  }

  async function onRequestEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setFieldErrors({ email: 'Enter your email address.' });
      return;
    }
    await requestOtp(trimmed);
  }

  async function onVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedOtp = otp.trim();
    if (!/^\d{6}$/.test(trimmedOtp)) {
      setFieldErrors({ otp: 'Enter the 6-digit code from your email.' });
      return;
    }

    setBusy(true);
    setError('');
    setFieldErrors({});
    try {
      const result = await api.forgotPasswordVerifyOtp({ email: email.trim(), otp: trimmedOtp });
      if (!result?.resetToken) {
        throw new Error('Reset token missing from response.');
      }
      resetTokenRef.current = result.resetToken;
      setStep('reset');
      setOtp('');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.hasCode('ERR_110') || err.hasCode('ERR_111')) {
          setError(err.message);
          setStep('email');
          clearSensitiveState();
          setOtpExpiresIn(0);
          return;
        }
        setError(err.message);
      } else {
        setError('Unable to verify the code.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function onResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const resetToken = resetTokenRef.current;
    if (!resetToken) {
      setError('Your reset session expired. Request a new verification code.');
      setStep('email');
      return;
    }

    const nextErrors: Record<string, string> = {};
    const policyError = getPasswordPolicyError(password);
    if (policyError) nextErrors.password = policyError;
    if (!passwordsMatch(password, confirmPassword)) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    setError('');
    try {
      await api.forgotPasswordReset({ resetToken, newPassword: password });
      clearSensitiveState();
      showToast('Password reset successfully. Please sign in.', 'success');
      navigate('/login', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.hasCode('ERR_113') || err.hasCode('ERR_114') || err.hasCode('ERR_112')) {
          setError(err.message);
          clearSensitiveState();
          setStep('email');
          return;
        }
        setError(err.message);
      } else {
        setError('Unable to reset password.');
      }
    } finally {
      setBusy(false);
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
          <img
            src="/logo.png"
            alt="Hotel Yuvaan"
            className="mx-auto h-14 w-auto max-w-[220px] object-contain drop-shadow-sm"
          />
          <p className="mt-3 text-sm text-white/70">Reset your password</p>
        </div>

        <div className="rounded-2xl border border-white/20 bg-white/10 p-6 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-8">
          <div className="mb-6 space-y-1.5">
            <h1 className="text-xl font-semibold text-white">Forgot password</h1>
            <p className="text-sm text-white/65">
              {step === 'email'
                ? 'Enter your email and we will send a one-time code.'
                : step === 'verify'
                  ? `Enter the 6-digit code sent to ${maskedEmail || 'your email'}.`
                  : 'Choose a new password, then sign in.'}
            </p>
          </div>

          {step === 'email' ? (
            <form className="space-y-4" onSubmit={(event) => void onRequestEmail(event)} noValidate>
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
                {fieldErrors.email ? <span className="text-xs text-destructive-foreground">{fieldErrors.email}</span> : null}
              </label>
              {error ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground" role="alert">
                  {error}
                </div>
              ) : null}
              <Button type="submit" variant="primary" className="w-full shadow-lg shadow-brand/30" disabled={busy}>
                <ShieldCheck className="h-4 w-4" />
                {busy ? 'Sending…' : 'Send verification code'}
              </Button>
            </form>
          ) : null}

          {step === 'verify' ? (
            <form className="space-y-4" onSubmit={(event) => void onVerifyOtp(event)} noValidate>
              <div className="flex flex-wrap gap-3 text-xs text-white/55" aria-live="polite">
                <span>Code expires in {formatCountdown(otpExpiresIn)}</span>
                {resendCooldown > 0 ? <span>Resend available in {formatCountdown(resendCooldown)}</span> : null}
              </div>
              <label className="block space-y-2 text-sm font-medium text-white/90">
                Verification code
                <span className={inputShellClass}>
                  <KeyRound className="h-4 w-4 shrink-0 text-white/50" />
                  <input
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    pattern="\d{6}"
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit code"
                    className="w-full bg-transparent text-white placeholder:text-white/35 outline-none tracking-[0.3em]"
                  />
                </span>
                {fieldErrors.otp ? <span className="text-xs text-destructive-foreground">{fieldErrors.otp}</span> : null}
              </label>
              {error ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground" role="alert">
                  {error}
                </div>
              ) : null}
              <Button type="submit" variant="primary" className="w-full" disabled={busy || otp.length !== 6}>
                <KeyRound className="h-4 w-4" />
                {busy ? 'Verifying…' : 'Verify code'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full border-white/25 bg-white/5 text-white hover:bg-white/10"
                disabled={busy || resendCooldown > 0}
                onClick={() => void requestOtp(email.trim())}
              >
                {resendCooldown > 0 ? `Resend (${formatCountdown(resendCooldown)})` : 'Resend code'}
              </Button>
            </form>
          ) : null}

          {step === 'reset' ? (
            <form className="space-y-4" onSubmit={(event) => void onResetPassword(event)} noValidate>
              <label className="block space-y-2 text-sm font-medium text-white/90">
                New password
                <span className={inputShellClass}>
                  <LockKeyhole className="h-4 w-4 shrink-0 text-white/50" />
                  <input
                    required
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter a new password"
                    className="w-full bg-transparent text-white placeholder:text-white/35 outline-none"
                  />
                </span>
                {fieldErrors.password ? <span className="text-xs text-destructive-foreground">{fieldErrors.password}</span> : null}
              </label>
              <label className="block space-y-2 text-sm font-medium text-white/90">
                Confirm password
                <span className={inputShellClass}>
                  <LockKeyhole className="h-4 w-4 shrink-0 text-white/50" />
                  <input
                    required
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-transparent text-white placeholder:text-white/35 outline-none"
                  />
                </span>
                {fieldErrors.confirmPassword ? (
                  <span className="text-xs text-destructive-foreground">{fieldErrors.confirmPassword}</span>
                ) : null}
              </label>
              <div className="rounded-xl border border-white/15 bg-black/20 p-3 text-white/80">
                <PasswordPolicyChecklist password={password} />
              </div>
              {error ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive-foreground" role="alert">
                  {error}
                </div>
              ) : null}
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={busy || !isPasswordValid(password) || !passwordsMatch(password, confirmPassword)}
              >
                <LockKeyhole className="h-4 w-4" />
                {busy ? 'Saving…' : 'Reset password'}
              </Button>
            </form>
          ) : null}

          <p className="mt-5 text-center text-xs text-white/70">
            Remembered your password?{' '}
            <Link to="/login" className="font-semibold text-white underline underline-offset-4 hover:text-white/80">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
