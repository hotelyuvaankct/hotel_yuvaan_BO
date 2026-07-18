import { Check, Circle } from 'lucide-react';
import { getPasswordRuleResults } from '@/lib/password-policy';
import { cn } from '@/lib/utils';

type PasswordPolicyChecklistProps = {
  password: string;
  className?: string;
  title?: string;
};

export function PasswordPolicyChecklist({
  password,
  className,
  title = 'Password requirements',
}: PasswordPolicyChecklistProps) {
  const results = getPasswordRuleResults(password);

  return (
    <div className={cn('space-y-2', className)} aria-live="polite">
      <p className="text-sm font-medium">{title}</p>
      <ul className="space-y-1.5">
        {results.map((rule) => (
          <li
            key={rule.id}
            className={cn(
              'flex items-start gap-2 text-sm',
              rule.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
            )}
          >
            {rule.passed ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 opacity-60" aria-hidden />
            )}
            <span>
              <span className="sr-only">{rule.passed ? 'Met: ' : 'Not met: '}</span>
              {rule.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
