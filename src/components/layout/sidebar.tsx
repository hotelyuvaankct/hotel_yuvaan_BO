import { NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { navigationItems } from '@/data/navigation';
import { useAuth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import faviconSrc from '@/assests/Images/favicon.ico';

export type SidebarProps = {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onMobileClose: () => void;
};

export function Sidebar({ collapsed, mobileOpen, onToggleCollapse, onMobileClose }: SidebarProps) {
  const { session } = useAuth();
  const visibleNavigationItems = navigationItems.filter((item) => {
    if (!item.moduleSlug) return true;
    return hasPermission(session?.perms, item.moduleSlug, 'read');
  });

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/45 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
          aria-label="Close sidebar overlay"
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300 lg:translate-x-0',
          /* width */
          collapsed ? 'w-[60px]' : 'w-60',
          /* mobile: slide in/out */
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Logo row */}
        <div
          className={cn(
            'flex h-14 shrink-0 items-center border-b border-sidebar-border',
            collapsed ? 'justify-center px-0' : 'justify-between px-4',
          )}
        >
          {/* Logo + name */}
          <div className={cn('flex items-center gap-2', collapsed && 'justify-center')}>
            <img
              src={faviconSrc}
              alt="Hotel Yuvaan"
              className="h-7 w-7 shrink-0 rounded-md object-contain"
            />
            {!collapsed && (
              <span className="font-playfair text-base font-bold tracking-wide text-sidebar-foreground truncate">
                Hotel Yuvaan
              </span>
            )}
          </div>

          {/* Collapse toggle — desktop only */}
          {!collapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground/60 transition hover:bg-sidebar-accent hover:text-sidebar-foreground"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto py-4 px-2">
          <nav className="space-y-1">
            {visibleNavigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={onMobileClose}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'group flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition-all duration-150',
                      collapsed && 'justify-center',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground',
                    )
                  }
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Expand button when collapsed (desktop) */}
        {collapsed && (
          <div className="hidden lg:flex justify-center border-t border-sidebar-border py-3">
            <button
              type="button"
              onClick={onToggleCollapse}
              className="flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground/60 transition hover:bg-sidebar-accent hover:text-sidebar-foreground"
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
