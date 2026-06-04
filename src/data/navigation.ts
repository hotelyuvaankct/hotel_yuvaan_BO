import {
  LayoutDashboard,
  CalendarRange,
  BedDouble,
  Users,
  ShieldCheck,
  ChartColumnIncreasing,
  Settings,
} from 'lucide-react';

export type NavigationItem = {
  label: string;
  href: string;
  description: string;
  icon: typeof LayoutDashboard;
};

export const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    description: 'Performance snapshot and quick actions',
    icon: LayoutDashboard,
  },
  {
    label: 'Bookings',
    href: '/bookings',
    description: 'Manage reservations and arrivals',
    icon: CalendarRange,
  },
  {
    label: 'Rooms',
    href: '/rooms',
    description: 'Inventory, status, and pricing',
    icon: BedDouble,
  },
  {
    label: 'Users',
    href: '/users',
    description: 'Accounts, assigned roles, and permissions',
    icon: Users,
  },
  {
    label: 'Roles',
    href: '/roles',
    description: 'Module CRUD permission matrix',
    icon: ShieldCheck,
  },
  {
    label: 'Guests',
    href: '/guests',
    description: 'Guest records and loyalty tiers',
    icon: Users,
  },
  {
    label: 'Reports',
    href: '/reports',
    description: 'No backend reports API available',
    icon: ChartColumnIncreasing,
  },
  {
    label: 'Settings',
    href: '/settings',
    description: 'Branding, users, and preferences',
    icon: Settings,
  },
];
