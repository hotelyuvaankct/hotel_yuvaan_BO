import { Menu, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/lib/auth';

export type HeaderProps = {
  onMenuClick: () => void;
};

export function Header({ onMenuClick }: HeaderProps) {
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
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur-xl sm:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 lg:hidden"
        onClick={onMenuClick}
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex items-center gap-2 lg:hidden">
        <img src="/logo.png" alt="Hotel Yuvaan" className="h-7 w-auto max-w-[120px] object-contain" />
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-2 rounded-lg px-2 py-1">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-brand-foreground">
            {initials || 'HY'}
          </div>
          <span className="hidden max-w-[120px] truncate text-sm font-medium text-foreground sm:block">
            {userName}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => void confirmLogout()}
          aria-label="Sign out"
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
