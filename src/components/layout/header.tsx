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

  const logoutButton = (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => void confirmLogout()}
      aria-label="Sign out"
      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
    >
      <LogOut className="h-4 w-4" />
    </Button>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-xl">
      {/* Mobile / tablet: menu · centered logo · logout */}
      <div className="grid h-14 grid-cols-[2.75rem_1fr_2.75rem] items-center px-2 sm:px-3 lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 justify-self-start"
          onClick={onMenuClick}
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex min-w-0 justify-center">
          <img
            src="/logo.png"
            alt="Hotel Yuvaan"
            className="h-8 w-auto max-w-[140px] object-contain"
          />
        </div>

        <div className="justify-self-end">{logoutButton}</div>
      </div>

      {/* Desktop: user · logout only (breadcrumbs live in page content) */}
      <div className="hidden h-14 items-center justify-end gap-4 px-4 lg:flex lg:px-6">
        <div className="flex shrink-0 items-center gap-2.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-brand-foreground"
            aria-hidden
          >
            {initials || 'HY'}
          </div>
          <span className="max-w-[160px] truncate text-sm font-medium text-foreground">
            {userName}
          </span>
        </div>
        {logoutButton}
      </div>
    </header>
  );
}
