import { Menu, MoonStar, SunMedium, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useTheme } from '@/components/theme-provider';
import { useAuth } from '@/lib/auth';
import faviconSrc from '@/assests/Images/favicon.ico';

export type HeaderProps = {
  onMenuClick: () => void;
};

export function Header({ onMenuClick }: HeaderProps) {
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
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border/70 bg-background/90 px-3 backdrop-blur-xl sm:px-4">
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden shrink-0"
        onClick={onMenuClick}
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile logo (only visible when sidebar is hidden on mobile) */}
      <div className="flex items-center gap-2 lg:hidden">
        <img src={faviconSrc} alt="Hotel Yuvaan" className="h-6 w-6 rounded object-contain" />
        <span className="font-playfair text-sm font-bold tracking-wide">Hotel Yuvaan</span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right-side actions */}
      <div className="flex items-center gap-1.5">
        {/* Theme toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme" className="rounded-lg">
          {resolvedTheme === 'dark' ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
        </Button>

        {/* Divider */}
        <div className="mx-1 h-5 w-px bg-border" />

        {/* User chip */}
        <div className="flex items-center gap-2 rounded-lg px-2 py-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-600 text-xs font-bold text-white shrink-0">
            {initials || 'HY'}
          </div>
          <span className="hidden max-w-[120px] truncate text-sm font-medium sm:block">{userName}</span>
        </div>

        {/* Logout */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void confirmLogout()}
          aria-label="Sign out"
          className="rounded-lg text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
