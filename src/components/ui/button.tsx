import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Design-system variants. `gold` / `default` alias to `primary` (brand CTA). */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gold' | 'default';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'default';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

const variantStyles: Record<'primary' | 'secondary' | 'outline' | 'ghost' | 'danger', string> = {
  primary: 'bg-brand text-brand-foreground hover:bg-brand-hover',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-muted',
  outline: 'border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground',
  ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
  danger: 'bg-destructive text-destructive-foreground hover:opacity-90',
};

const sizeStyles: Record<'sm' | 'md' | 'lg' | 'icon', string> = {
  sm: 'h-9 rounded-sm px-3 text-sm',
  md: 'h-10 rounded-lg px-4 text-sm',
  lg: 'h-11 rounded-lg px-6 text-sm',
  icon: 'h-10 w-10 rounded-lg p-0',
};

function resolveVariant(variant: ButtonVariant): keyof typeof variantStyles {
  if (variant === 'gold' || variant === 'default') return 'primary';
  return variant;
}

function resolveSize(size: ButtonSize): keyof typeof sizeStyles {
  if (size === 'default') return 'md';
  return size;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      type = 'button',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const resolvedVariant = resolveVariant(variant);
    const resolvedSize = resolveSize(size);
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={isLoading || undefined}
        className={cn(
          'relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:pointer-events-none disabled:opacity-50',
          variantStyles[resolvedVariant],
          sizeStyles[resolvedSize],
          className,
        )}
        {...props}
      >
        <span className={cn('inline-flex items-center gap-2', isLoading && 'invisible')}>
          {leftIcon}
          {children}
          {rightIcon}
        </span>
        {isLoading ? (
          <Loader2 className="absolute h-4 w-4 animate-spin" aria-hidden />
        ) : null}
      </button>
    );
  },
);

Button.displayName = 'Button';

export { Button };
export type { ButtonProps };
