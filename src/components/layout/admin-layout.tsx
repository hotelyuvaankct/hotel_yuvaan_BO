import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Breadcrumbs } from '@/components/common/breadcrumbs';
import { cn } from '@/lib/utils';

export function AdminLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isFullBleed = location.pathname.startsWith('/inventory');
  const collapsedBeforeFullBleed = useRef(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Auto-collapse sidebar on inventory (full-bleed) screens
  useEffect(() => {
    if (isFullBleed) {
      setCollapsed((current) => {
        collapsedBeforeFullBleed.current = current;
        return true;
      });
      setMobileOpen(false);
      return;
    }
    setCollapsed(collapsedBeforeFullBleed.current);
  }, [isFullBleed]);

  const sidebarWidth = collapsed ? 'lg:pl-[60px]' : 'lg:pl-64';

  return (
    <div className={`min-h-screen bg-background text-foreground transition-all duration-300 ${sidebarWidth}`}>
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div
        className={cn(
          'relative flex flex-col',
          isFullBleed ? 'h-screen overflow-hidden' : 'min-h-screen',
        )}
      >
        <Header onMenuClick={() => setMobileOpen((o) => !o)} />

        <main
          className={cn(
            'flex min-h-0 flex-1 flex-col',
            isFullBleed ? 'overflow-hidden p-0' : 'px-4 py-6 sm:px-6 lg:px-8 lg:py-8',
          )}
        >
          <div
            className={cn(
              'flex w-full min-h-0 flex-1 flex-col',
              isFullBleed ? 'max-w-none gap-0' : 'mx-auto max-w-7xl gap-6',
            )}
          >
            {isFullBleed ? (
              <div className="border-b border-border/70 px-3 py-2 sm:px-4">
                <Breadcrumbs />
              </div>
            ) : (
              <Breadcrumbs />
            )}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
