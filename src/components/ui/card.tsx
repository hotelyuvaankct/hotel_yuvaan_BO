import * as React from 'react';
import { cn } from '@/lib/utils';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';

type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  padding?: CardPadding;
  hoverable?: boolean;
};

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

const CardRoot = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding = 'none', hoverable = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-border bg-card text-card-foreground shadow-sm',
        hoverable && 'transition-shadow hover:shadow-md',
        paddingStyles[padding],
        className,
      )}
      {...props}
    />
  ),
);
CardRoot.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col items-stretch gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5',
        className,
      )}
      {...props}
    />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-base font-semibold tracking-tight text-card-foreground', className)} {...props} />
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-xs font-normal text-muted-foreground', className)} {...props} />
  ),
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('min-w-0 px-4 py-4 sm:px-5', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

const CardBody = CardContent;

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
        className={cn(
          'flex flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3 sm:px-5 sm:py-4',
          className,
        )}
      {...props}
    />
  ),
);
CardFooter.displayName = 'CardFooter';

type CardComponent = typeof CardRoot & {
  Header: typeof CardHeader;
  Title: typeof CardTitle;
  Description: typeof CardDescription;
  Body: typeof CardBody;
  Content: typeof CardContent;
  Footer: typeof CardFooter;
};

const Card = CardRoot as CardComponent;
Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Description = CardDescription;
Card.Body = CardBody;
Card.Content = CardContent;
Card.Footer = CardFooter;

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardBody, CardFooter };
export type { CardProps, CardPadding };
