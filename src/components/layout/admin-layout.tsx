import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { navigationItems } from '@/data/navigation';

const routeMeta: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': {
    title: 'Dashboard',
    subtitle: 'API-backed overview of the connected admin modules.',
  },
  '/bookings': {
    title: 'Bookings',
    subtitle: 'No backend bookings API is available yet.',
  },
  '/rooms': {
    title: 'Rooms',
    subtitle: 'Manage room records from the backend rooms API.',
  },
  '/users': {
    title: 'Users',
    subtitle: 'Create users, assign roles, and verify effective permissions.',
  },
  '/roles': {
    title: 'Roles',
    subtitle: 'Create roles and manage CRUD access by module.',
  },
  '/guests': {
    title: 'Guests',
    subtitle: 'View user records returned by the backend users API.',
  },
  '/reports': {
    title: 'Reports',
    subtitle: 'No backend reports API is available yet.',
  },
  '/settings': {
    title: 'Settings',
    subtitle: 'View authenticated profile and current permissions.',
  },
};

function getRouteMeta(pathname: string) {
  const sectionPath = `/${pathname.split('/')[1] || 'dashboard'}`;
  return routeMeta[pathname] ?? routeMeta[sectionPath] ?? {
    title: 'Dashboard',
    subtitle: 'API-backed overview of the connected admin modules.',
  };
}

export function AdminLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const pageMeta = useMemo(() => getRouteMeta(location.pathname), [location.pathname]);
  const activeNavItem = navigationItems.find((item) => location.pathname === item.href || location.pathname.startsWith(`${item.href}/`));

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
