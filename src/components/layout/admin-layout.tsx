import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Breadcrumbs } from '@/components/common/breadcrumbs';
import { BreadcrumbLabelProvider } from '@/components/common/breadcrumb-labels';
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
    <BreadcrumbLabelProvider>
      <div className={`min-h-screen bg-background text-foreground transition-all duration-300 ${sidebarWidth}`}>
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          onMobileClose={() => setMobileOpen(false)}
        />

        <div
          className={cn(
            'relative z-0 flex flex-col',
            isFullBleed ? 'h-screen overflow-hidden' : 'min-h-screen',
          )}
        >
          <Header onMenuClick={() => setMobileOpen((o) => !o)}>
            <Breadcrumbs />
          </Header>

          <main
            className={cn(
              'flex min-h-0 min-w-0 flex-1 flex-col',
              isFullBleed ? 'overflow-hidden p-0' : 'px-4 py-6 sm:px-6 lg:px-8 lg:py-8',
            )}
          >
            <div
              className={cn(
                'flex w-full min-h-0 min-w-0 flex-1 flex-col',
                isFullBleed ? 'max-w-none gap-0 overflow-hidden' : 'mx-auto max-w-7xl gap-6',
              )}
            >
              {isFullBleed ? (
                <div className="shrink-0 border-b border-border bg-card px-3 py-1.5 lg:hidden sm:px-4">
                  <Breadcrumbs />
                </div>
              ) : (
                <div className="lg:hidden">
                  <Breadcrumbs />
                </div>
              )}
              <div className={cn(isFullBleed && 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden')}>
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </BreadcrumbLabelProvider>
  );
}
