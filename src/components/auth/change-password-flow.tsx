import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { getPasswordPolicyError, isPasswordValid, passwordsMatch } from '@/lib/password-policy';
import { PasswordPolicyChecklist } from '@/components/auth/password-policy-checklist';
import { Button } from '@/components/ui/button';
import { PasswordField, TextField } from '@/components/ui/form-fields';
import { useToast } from '@/components/ui/toast';

type Step = 'request' | 'verify' | 'reset';

const OTP_TTL_SECONDS = 10 * 60;
const RESEND_COOLDOWN_SECONDS = 60;

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function ChangePasswordFlow() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<Step>('request');
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

  function clearSensitiveState() {
    resetTokenRef.current = null;
    setOtp('');
    setPassword('');
    setConfirmPassword('');
  }

  function cancelFlow() {
    clearSensitiveState();
    setStep('request');
    setError('');
    setFieldErrors({});
    setMaskedEmail(undefined);
    setOtpExpiresIn(0);
    setResendCooldown(0);
  }

  async function requestOtp() {
    setBusy(true);
    setError('');
    try {
      const result = await api.requestPasswordOtp();
      setMaskedEmail(result?.maskedEmail);
      setStep('verify');
      setOtp('');
      setOtpExpiresIn(OTP_TTL_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      showToast(result?.message || 'Verification code sent.', 'success');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to request a verification code.');
    } finally {
      setBusy(false);
    }
  }

  async function onVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = otp.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setFieldErrors({ otp: 'Enter the 6-digit code from your email.' });
      return;
    }

    setBusy(true);
    setError('');
    setFieldErrors({});
    try {
      const result = await api.verifyPasswordOtp({ otp: trimmed });
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
          setStep('request');
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
      setStep('request');
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
      await api.resetPassword({ resetToken, newPassword: password });
      clearSensitiveState();
      showToast('Password updated. Please sign in again.', 'success');
      logout();
      navigate('/login', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (
          err.hasCode('ERR_113') ||
          err.hasCode('ERR_114') ||
          err.hasCode('ERR_112')
        ) {
          setError(err.message);
          clearSensitiveState();
          setStep('request');
          return;
        }
        setError(err.message);
      } else {
        setError('Unable to update password.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {step === 'request' ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We will email a one-time code to verify it is you before you can change your password.
          </p>
          {error ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="button" variant="gold" disabled={busy} onClick={() => void requestOtp()}>
            <ShieldCheck className="h-4 w-4" />
            {busy ? 'Sending…' : 'Send verification code'}
          </Button>
        </div>
      ) : null}

      {step === 'verify' ? (
        <form className="space-y-4" onSubmit={(event) => void onVerifyOtp(event)} noValidate>
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code sent to {maskedEmail || 'your email'}.
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground" aria-live="polite">
            <span>Code expires in {formatCountdown(otpExpiresIn)}</span>
            {resendCooldown > 0 ? <span>Resend available in {formatCountdown(resendCooldown)}</span> : null}
          </div>
          <TextField
            label="Verification code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="\d{6}"
            required
            value={otp}
            error={fieldErrors.otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          {error ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="gold" disabled={busy || otp.length !== 6}>
              <KeyRound className="h-4 w-4" />
              {busy ? 'Verifying…' : 'Verify code'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy || resendCooldown > 0}
              onClick={() => void requestOtp()}
            >
              {resendCooldown > 0 ? `Resend (${formatCountdown(resendCooldown)})` : 'Resend code'}
            </Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={cancelFlow}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {step === 'reset' ? (
        <form className="space-y-4" onSubmit={(event) => void onResetPassword(event)} noValidate>
          <p className="text-sm text-muted-foreground">
            Choose a new password. You will be signed out after it is saved.
          </p>
          <PasswordField
            label="New password"
            autoComplete="new-password"
            required
            value={password}
            error={fieldErrors.password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <PasswordField
            label="Confirm password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            error={fieldErrors.confirmPassword}
            hideLabel="Hide confirm password"
            revealLabel="Show confirm password"
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          <PasswordPolicyChecklist password={password} />
          {error ? (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="gold"
              disabled={busy || !isPasswordValid(password) || !passwordsMatch(password, confirmPassword)}
            >
              <LockKeyhole className="h-4 w-4" />
              {busy ? 'Updating…' : 'Update password'}
            </Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={cancelFlow}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
