import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { navigationItems } from '@/config/navigation';

const actionLabels: Record<string, string> = {
  new: 'Add',
  edit: 'Edit',
};

type Crumb = {
  label: string;
  path: string;
  isLast: boolean;
  isEllipsis?: boolean;
};

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);
  const section = navigationItems.find((item) => item.href === `/${segments[0]}`);

  const crumbs: Crumb[] = segments.map((segment, index) => {
    const path = `/${segments.slice(0, index + 1).join('/')}`;
    const isId = /^\d+$/.test(segment) || /^[A-Z0-9_-]{8,}$/i.test(segment);
    const label =
      index === 0
        ? section?.label ?? titleCase(segment)
        : actionLabels[segment] ?? (isId ? truncateLabel(segment) : titleCase(segment));

    return { label, path, isLast: index === segments.length - 1 };
  });

  // List: Home > Section. Nested: Home > … > Current (ellipsis links to parent)
  const displayCrumbs: Crumb[] =
    crumbs.length > 1
      ? [
          {
            label: '…',
            path: crumbs[crumbs.length - 2].path,
            isLast: false,
            isEllipsis: true,
          },
          { ...crumbs[crumbs.length - 1], isLast: true },
        ]
      : crumbs;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex min-h-6 min-w-0 flex-nowrap items-center gap-1.5 overflow-hidden text-sm text-muted-foreground"
    >
      <Link
        to="/dashboard"
        className="shrink-0 rounded-md p-1 transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Dashboard"
      >
        <Home className="h-4 w-4" />
      </Link>
      {displayCrumbs.map((crumb) => (
        <span key={crumb.isEllipsis ? 'ellipsis' : crumb.path} className="flex min-w-0 items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          {crumb.isEllipsis ? (
            <Link
              to={crumb.path}
              className="shrink-0 transition-colors hover:text-foreground"
              aria-label="Parent page"
              title="Go up"
            >
              …
            </Link>
          ) : crumb.isLast ? (
            <span className="truncate font-medium text-foreground" aria-current="page" title={crumb.label}>
              {crumb.label}
            </span>
          ) : (
            <Link to={crumb.path} className="shrink-0 transition-colors hover:text-foreground">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

function titleCase(value: string) {
  return value.replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function truncateLabel(value: string) {
  if (value.length <= 12) return value.toUpperCase();
  return `${value.slice(0, 6)}…${value.slice(-4)}`.toUpperCase();
}
