import type { ReactNode } from 'react';
import { Breadcrumbs } from '@/components/common/breadcrumbs';
import { cn } from '@/lib/utils';

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  /** When true, renders breadcrumbs under the title row. Default false — AdminLayout already shows crumbs. */
  showBreadcrumbs?: boolean;
  className?: string;
};

/**
 * Shared page chrome: title (text-2xl) + optional description + primary actions.
 */
export function PageHeader({
  title,
  description,
  actions,
  showBreadcrumbs = false,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {showBreadcrumbs ? <Breadcrumbs /> : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description ? <div className="text-sm font-normal text-muted-foreground">{description}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export type { PageHeaderProps };
