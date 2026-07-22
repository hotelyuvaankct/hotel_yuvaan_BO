import {
  LayoutDashboard,
  CalendarRange,
  BedDouble,
  Tags,
  Users,
  ShieldCheck,
  Settings,
  Images,
  TicketPercent,
  CalendarClock,
  ArrowLeftRight,
  Landmark,
} from 'lucide-react';

export type NavigationItem = {
  label: string;
  href: string;
  description: string;
  icon: typeof LayoutDashboard;
  moduleSlug?: string;
  /** Extra module slugs that also unlock this nav item (any one read permission is enough). */
  alternateModuleSlugs?: string[];
};

export const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    description: 'Performance snapshot and quick actions',
    icon: LayoutDashboard,
    moduleSlug: 'dashboard',
    alternateModuleSlugs: ['bookings'],
  },
  {
    label: 'Bookings',
    href: '/bookings',
    description: 'Manage reservations and arrivals',
    icon: CalendarRange,
    moduleSlug: 'bookings',
  },
  {
    label: 'Transactions',
    href: '/transactions',
    description: 'Payments, refunds, and checkout orders',
    icon: ArrowLeftRight,
    moduleSlug: 'payments',
  },
  {
    label: 'Settlements',
    href: '/settlements',
    description: 'Razorpay bank settlements and instant settle',
    icon: Landmark,
    moduleSlug: 'settlements',
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
    label: 'Inventory',
    href: '/inventory',
    description: 'Daily availability, pricing, and date blocks',
    icon: CalendarClock,
    moduleSlug: 'inventory',
  },
  {
    label: 'Gallery',
    href: '/gallery',
    description: 'Website gallery photos for the public site',
    icon: Images,
    moduleSlug: 'gallery',
  },
  {
    label: 'Coupons',
    href: '/coupons',
    description: 'Discount codes, usage limits, and redemption history',
    icon: TicketPercent,
    moduleSlug: 'coupons',
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
    label: 'Settings',
    href: '/settings',
    description: 'Branding, users, and preferences',
    icon: Settings,
  },
];
