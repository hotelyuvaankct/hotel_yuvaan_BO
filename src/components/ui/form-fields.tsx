import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export const fieldControlClass =
  'h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-60';

export const filterControlClass =
  'h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring/60';

function controlClass(error?: string, className?: string, base = fieldControlClass) {
  return cn(
    base,
    error ? 'border-destructive focus:ring-destructive/30' : 'border-input hover:border-ring/40',
    className,
  );
}

type FieldShellProps = {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

export function FieldShell({ label, error, hint, required, className, children }: FieldShellProps) {
  const Wrapper = label || error || hint ? 'label' : 'div';
  return (
    <Wrapper className={cn('block space-y-2 text-sm font-medium', className)}>
      {label ? (
        <span>
          {label}
          {required ? <span className="text-destructive"> *</span> : null}
        </span>
      ) : null}
      {children}
      {error ? <span className="block text-xs font-normal text-destructive">{error}</span> : null}
      {!error && hint ? <span className="block text-xs font-normal text-muted-foreground">{hint}</span> : null}
    </Wrapper>
  );
}

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  hint?: string;
  options: Array<{ value: string | number; label: string }>;
  placeholder?: string;
  wrapperClassName?: string;
  variant?: 'field' | 'filter';
};

export function SelectField({
  label,
  error,
  hint,
  required,
  options,
  placeholder = 'Select option',
  wrapperClassName,
  variant = 'field',
  className,
  disabled,
  ...props
}: SelectFieldProps) {
  const base = variant === 'filter' ? filterControlClass : fieldControlClass;

  return (
    <FieldShell label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
      <div className="relative">
        <select
          {...props}
          disabled={disabled}
          required={required}
          className={cn(controlClass(error, cn('appearance-none pr-10 cursor-pointer', className), base))}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </FieldShell>
  );
}

type DateFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
  variant?: 'field' | 'filter';
};

export function DateField({
  label,
  error,
  hint,
  required,
  wrapperClassName,
  variant = 'field',
  className,
  ...props
}: DateFieldProps) {
  const base = variant === 'filter' ? filterControlClass : fieldControlClass;

  return (
    <FieldShell label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
      <div className="relative">
        <input
          {...props}
          type="date"
          required={required}
          className={cn(
            controlClass(error, cn(
              'pr-10 [color-scheme:light] dark:[color-scheme:dark]',
              '[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0',
              '[&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full',
              '[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0',
              className,
            ), base),
          )}
        />
        <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </FieldShell>
  );
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
};

export function TextField({ label, error, hint, required, wrapperClassName, className, ...props }: TextFieldProps) {
  return (
    <FieldShell label={label} error={error} hint={hint} required={required} className={wrapperClassName}>
      <input
        {...props}
        required={required}
        className={controlClass(error, className)}
      />
    </FieldShell>
  );
}

export const inputClass = fieldControlClass;
