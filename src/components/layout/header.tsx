import { Bell, Menu, MoonStar, Search, SunMedium } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '@/components/theme-provider';

export type HeaderProps = {
  onMenuClick: () => void;
  title: string;
  subtitle: string;
};

export function Header({ onMenuClick, title, subtitle }: HeaderProps) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="flex items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Open sidebar">
          <Menu className="h-5 w-5" />
        </Button>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Hotel Yuvaan
          </p>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            <Badge variant="gold" className="hidden sm:inline-flex">
              Live
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <label className="hidden max-w-xs flex-1 items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm md:flex">
          <Search className="h-4 w-4" />
          <input
            type="search"
            placeholder="Search reservations, rooms, guests"
            className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </label>

        <Button variant="outline" size="icon" className="hidden sm:inline-flex" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </Button>

        <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          {resolvedTheme === 'dark' ? <SunMedium className="h-5 w-5" /> : <MoonStar className="h-5 w-5" />}
        </Button>

        <div className="hidden items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2 shadow-sm sm:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-bronze-600 text-sm font-bold text-white">
            HY
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Admin</p>
            <p className="text-xs text-muted-foreground">Operations lead</p>
          </div>
        </div>
      </div>
    </header>
  );
}