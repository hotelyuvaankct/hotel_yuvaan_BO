import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { navigationItems } from '@/data/navigation';

const routeMeta: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': {
    title: 'Dashboard',
    subtitle: 'A live overview of arrivals, occupancy, and revenue.',
  },
  '/bookings': {
    title: 'Bookings',
    subtitle: 'Track reservations, check-ins, and payment status.',
  },
  '/rooms': {
    title: 'Rooms',
    subtitle: 'Monitor availability, housekeeping, and rate plans.',
  },
  '/guests': {
    title: 'Guests',
    subtitle: 'Review guest history, notes, and loyalty details.',
  },
  '/reports': {
    title: 'Reports',
    subtitle: 'Measure occupancy trends, ADR, and monthly performance.',
  },
  '/settings': {
    title: 'Settings',
    subtitle: 'Tune operational defaults and branding preferences.',
  },
};

function getRouteMeta(pathname: string) {
  return routeMeta[pathname] ?? {
    title: 'Dashboard',
    subtitle: 'A live overview of arrivals, occupancy, and revenue.',
  };
}

export function AdminLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const pageMeta = useMemo(() => getRouteMeta(location.pathname), [location.pathname]);
  const activeNavItem = navigationItems.find((item) => item.href === location.pathname);

  return (
    <div className="min-h-screen bg-background text-foreground lg:pl-80">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="relative flex min-h-screen flex-col">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          title={pageMeta.title}
          subtitle={pageMeta.subtitle}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{pageMeta.title}</span>
              <span>/</span>
              <span>{activeNavItem?.description ?? 'Backoffice overview'}</span>
            </div>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}