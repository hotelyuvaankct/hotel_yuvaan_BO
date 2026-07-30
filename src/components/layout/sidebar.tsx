import { NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { navigationItems } from '@/config/navigation';
import { useAuth } from '@/lib/auth';
import { canAccessNavigationItem } from '@/lib/navigation-access';
import { cn } from '@/lib/utils';

export type SidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onMobileClose: () => void;
};

export function Sidebar({ collapsed, mobileOpen, onToggleCollapse, onMobileClose }: SidebarProps) {
  const { session } = useAuth();
  const visibleNavigationItems = navigationItems.filter((item) =>
    canAccessNavigationItem(item, session?.perms),
  );
  // Inventory auto-collapses the desktop rail; keep a full labeled drawer on mobile.
  const iconRail = collapsed && !mobileOpen;

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-overlay backdrop-blur-[2px] lg:hidden"
          onClick={onMobileClose}
          aria-label="Close sidebar overlay"
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 lg:translate-x-0',
          iconRail ? 'w-[60px]' : 'w-64',
          mobileOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div
          className={cn(
            'flex h-14 shrink-0 items-center border-b border-sidebar-border',
            iconRail ? 'justify-center px-0' : 'justify-between px-4',
          )}
        >
          <div className={cn('flex items-center gap-2', iconRail && 'justify-center')}>
            <img
              src={iconRail ? '/favicon.svg' : '/logo.png'}
              alt="Hotel Yuvaan"
              className={cn(
                'shrink-0 object-contain',
                iconRail ? 'h-7 w-7' : 'h-8 w-auto max-w-[140px]',
              )}
            />
            {!iconRail ? <span className="sr-only">Hotel Yuvaan</span> : null}
          </div>

          {!iconRail ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground/70 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring lg:flex"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4">
          <nav className="space-y-1">
            {visibleNavigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={onMobileClose}
                  title={iconRail ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-150',
                      iconRail && 'justify-center px-2',
                      isActive
                        ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    )
                  }
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!iconRail ? <span className="truncate">{item.label}</span> : null}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {iconRail ? (
          <div className="hidden justify-center border-t border-sidebar-border py-3 lg:flex">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground/70 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </aside>
    </>
  );
}
