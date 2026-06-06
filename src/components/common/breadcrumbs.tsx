import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { navigationItems } from '@/data/navigation';

const actionLabels: Record<string, string> = {
  new: 'Add',
  edit: 'Edit',
};

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);
  const section = navigationItems.find((item) => item.href === `/${segments[0]}`);

  const crumbs = segments.map((segment, index) => {
    const path = `/${segments.slice(0, index + 1).join('/')}`;
    const isId = /^\d+$/.test(segment);
    const label =
      index === 0
        ? section?.label ?? titleCase(segment)
        : actionLabels[segment] ?? (isId ? 'Details' : titleCase(segment));

    return { label, path, isLast: index === segments.length - 1 };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex min-h-6 flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
      <Link to="/dashboard" className="rounded-md p-1 transition-colors hover:bg-muted hover:text-foreground" aria-label="Dashboard">
        <Home className="h-4 w-4" />
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.path} className="flex items-center gap-1.5">
          <ChevronRight className="h-3.5 w-3.5" />
          {crumb.isLast ? (
            <span className="font-medium text-foreground" aria-current="page">{crumb.label}</span>
          ) : (
            <Link to={crumb.path} className="transition-colors hover:text-foreground">{crumb.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}

function titleCase(value: string) {
  return value.replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}
