import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AdminLayout } from '@/components/layout/admin-layout';
import { useAuth } from '@/lib/auth';
import { getFirstAccessiblePath } from '@/lib/navigation-access';
import { DashboardPage } from '@/pages/dashboard';
import { BookingsPage } from '@/pages/bookings';
import { BookingFormPage } from '@/pages/booking-form';
import { BookingViewPage } from '@/pages/booking-view';
import { RoomsPage } from '@/pages/rooms';
import { RoomFormPage } from '@/pages/room-form';
import { RoomViewPage } from '@/pages/room-view';
import { RoomTypesPage } from '@/pages/room-types';
import { InventoryPage } from '@/pages/inventory';
import { RoomTypeFormPage } from '@/pages/room-type-form';
import { RoomTypeViewPage } from '@/pages/room-type-view';
import { GalleryPage } from '@/pages/gallery';
import { GalleryFormPage } from '@/pages/gallery-form';
import { CouponsPage } from '@/pages/coupons';
import { CouponFormPage } from '@/pages/coupon-form';
import { CouponViewPage } from '@/pages/coupon-view';
import { UsersPage } from '@/pages/users';
import { UserFormPage } from '@/pages/user-form';
import { UserViewPage } from '@/pages/user-view';
import { RolesPage } from '@/pages/roles';
import { RoleFormPage } from '@/pages/role-form';
import { RoleViewPage } from '@/pages/role-view';
import { SettingsPage } from '@/pages/settings';
import { LoginPage } from '@/pages/login';
import { SetPasswordPage } from '@/pages/set-password';
import { NotFoundPage } from '@/pages/not-found';

function DefaultRoute() {
  const { session } = useAuth();
  return <Navigate to={getFirstAccessiblePath(session?.perms)} replace />;
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/set-password', element: <SetPasswordPage /> },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <DefaultRoute /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'bookings', element: <BookingsPage /> },
          { path: 'bookings/:id', element: <BookingViewPage /> },
          { path: 'bookings/:id/edit', element: <BookingFormPage /> },
          { path: 'rooms', element: <RoomsPage /> },
          { path: 'rooms/new', element: <RoomFormPage /> },
          { path: 'rooms/:id', element: <RoomViewPage /> },
          { path: 'rooms/:id/edit', element: <RoomFormPage /> },
          { path: 'room-types', element: <RoomTypesPage /> },
          { path: 'room-types/new', element: <RoomTypeFormPage /> },
          { path: 'room-types/:id', element: <RoomTypeViewPage /> },
          { path: 'room-types/:id/edit', element: <RoomTypeFormPage /> },
          { path: 'inventory', element: <InventoryPage /> },
          { path: 'gallery', element: <GalleryPage /> },
          { path: 'gallery/new', element: <GalleryFormPage /> },
          { path: 'gallery/:id/edit', element: <GalleryFormPage /> },
          { path: 'coupons', element: <CouponsPage /> },
          { path: 'coupons/new', element: <CouponFormPage /> },
          { path: 'coupons/:id', element: <CouponViewPage /> },
          { path: 'coupons/:id/edit', element: <CouponFormPage /> },
          { path: 'users', element: <UsersPage /> },
          { path: 'users/new', element: <UserFormPage /> },
          { path: 'users/:id', element: <UserViewPage /> },
          { path: 'users/:id/edit', element: <UserFormPage /> },
          { path: 'roles', element: <RolesPage /> },
          { path: 'roles/new', element: <RoleFormPage /> },
          { path: 'roles/:id', element: <RoleViewPage /> },
          { path: 'roles/:id/edit', element: <RoleFormPage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
