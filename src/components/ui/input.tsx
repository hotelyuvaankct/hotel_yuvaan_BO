import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { FieldShell, TextField, fieldControlClass } from '@/components/ui/form-fields';

type InputSize = 'sm' | 'md';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  size?: InputSize;
  wrapperClassName?: string;
};

const sizeStyles: Record<InputSize, string> = {
  sm: 'h-9 text-sm',
  md: 'h-10 text-sm',
};

/**
 * Design-system Input — wraps shared field control styles.
 * Prefer this for new code; existing TextField remains supported.
 */
export function Input({
  label,
  error,
  helperText,
  leftIcon,
  size = 'md',
  wrapperClassName,
  className,
  required,
  ...props
}: InputProps) {
  return (
    <FieldShell
      label={label}
      error={error}
      hint={helperText}
      required={required}
      className={wrapperClassName}
    >
      <div className="relative">
        {leftIcon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {leftIcon}
          </span>
        ) : null}
        <input
          {...props}
          required={required}
          className={cn(
            fieldControlClass,
            sizeStyles[size],
            leftIcon && 'pl-9',
            error && 'border-destructive focus:border-destructive focus:ring-destructive',
            className,
          )}
        />
      </div>
    </FieldShell>
  );
}

export { TextField };
export type { InputProps, InputSize };
