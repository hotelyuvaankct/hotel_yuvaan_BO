import {
  LayoutDashboard,
  CalendarRange,
  BedDouble,
  Tags,
  Blocks,
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
  moduleSlug?: string;
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
    moduleSlug: 'bookings',
  },
  {
    label: 'Rooms',
    href: '/rooms',
    description: 'Inventory, status, and pricing',
    icon: BedDouble,
    moduleSlug: 'rooms',
  },
  {
    label: 'Room Types',
    href: '/room-types',
    description: 'Room categories, occupancy, and pricing',
    icon: Tags,
    moduleSlug: 'room-types',
  },
  {
    label: 'Users',
    href: '/users',
    description: 'Accounts, assigned roles, and permissions',
    icon: Users,
    moduleSlug: 'users',
  },
  {
    label: 'Roles',
    href: '/roles',
    description: 'Module CRUD permission matrix',
    icon: ShieldCheck,
    moduleSlug: 'roles',
  },
  {
    label: 'Modules',
    href: '/modules',
    description: 'Create modules for the role permission matrix',
    icon: Blocks,
    moduleSlug: 'modules',
  },
  {
    label: 'Guests',
    href: '/guests',
    description: 'Guest records and loyalty tiers',
    icon: Users,
    moduleSlug: 'users',
  },
  {
    label: 'Reports',
    href: '/reports',
    description: 'No backend reports API available',
    icon: ChartColumnIncreasing,
    moduleSlug: 'reports',
  },
  {
    label: 'Settings',
    href: '/settings',
    description: 'Branding, users, and preferences',
    icon: Settings,
  },
];
