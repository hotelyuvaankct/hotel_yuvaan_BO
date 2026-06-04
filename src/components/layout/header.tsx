import { LogOut, Menu, MoonStar, SunMedium } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useTheme } from '@/components/theme-provider';
import { useAuth } from '@/lib/auth';

export type HeaderProps = {
  onMenuClick: () => void;
  title: string;
  subtitle: string;
};

export function Header({ onMenuClick, title, subtitle }: HeaderProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { logout, session } = useAuth();
  const { confirm } = useConfirm();
  const userName = session?.user?.fullName || session?.user?.email || 'Admin';
  const initials = userName
    .split(/[ @.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  async function confirmLogout() {
    const confirmed = await confirm({
      title: 'Sign out?',
      description: 'You will be returned to the login screen and this browser session will be cleared.',
      confirmLabel: 'Sign out',
    });
    if (confirmed) logout();
  }

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
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          {resolvedTheme === 'dark' ? <SunMedium className="h-5 w-5" /> : <MoonStar className="h-5 w-5" />}
        </Button>

        <div className="hidden items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2 shadow-sm sm:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gold-400 to-bronze-600 text-sm font-bold text-white">
            {initials || 'HY'}
          </div>
          <div className="leading-tight">
            <p className="max-w-36 truncate text-sm font-semibold">{userName}</p>
            <p className="text-xs text-muted-foreground">Authenticated</p>
          </div>
        </div>

        <Button variant="outline" size="icon" onClick={() => void confirmLogout()} aria-label="Sign out">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
