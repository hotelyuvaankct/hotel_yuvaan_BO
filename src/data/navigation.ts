import {
  LayoutDashboard,
  CalendarRange,
  BedDouble,
  Users,
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
    label: 'Guests',
    href: '/guests',
    description: 'Guest records and loyalty tiers',
    icon: Users,
  },
  {
    label: 'Reports',
    href: '/reports',
    description: 'Occupancy, revenue, and trends',
    icon: ChartColumnIncreasing,
  },
  {
    label: 'Settings',
    href: '/settings',
    description: 'Branding, users, and preferences',
    icon: Settings,
  },
];