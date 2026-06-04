import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { navigationItems } from '@/data/navigation';
import { cn } from '@/lib/utils';

export type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-80 border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl transition-transform duration-300 lg:translate-x-0 lg:shadow-none',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between border-b border-sidebar-border px-6 py-6 lg:justify-start">
            <div>
              <p className="font-playfair text-2xl font-bold tracking-wide text-sidebar-foreground">
                Hotel Yuvaan
              </p>
              <p className="mt-1 text-sm text-sidebar-foreground/70">Admin backoffice</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-sidebar-foreground/70 transition hover:bg-sidebar-accent hover:text-sidebar-foreground lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-6 overflow-y-auto px-4 py-6">
            <div className="rounded-2xl border border-sidebar-border bg-gradient-to-br from-gold-500/15 to-bronze-500/10 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-sidebar-foreground/60">
                Occupancy
              </p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-3xl font-semibold">84%</p>
                  <p className="text-sm text-sidebar-foreground/70">Weekend rooms filled</p>
                </div>
                <span className="rounded-full bg-sidebar-primary px-3 py-1 text-xs font-semibold text-sidebar-primary-foreground">
                  +12% vs last week
                </span>
              </div>
            </div>

            <nav className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 transition-all duration-200',
                        isActive
                          ? 'border-sidebar-border bg-sidebar-accent text-sidebar-foreground shadow-sm'
                          : 'text-sidebar-foreground/75 hover:border-sidebar-border hover:bg-sidebar-accent/80 hover:text-sidebar-foreground',
                      )
                    }
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-accent text-sidebar-foreground transition group-hover:bg-sidebar-primary group-hover:text-sidebar-primary-foreground">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium">{item.label}</span>
                      <span className="block truncate text-xs text-sidebar-foreground/60">
                        {item.description}
                      </span>
                    </span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>
      </aside>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/45 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-label="Close sidebar overlay"
        />
      ) : null}
    </>
  );
}