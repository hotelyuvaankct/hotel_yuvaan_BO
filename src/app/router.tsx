import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AdminLayout } from '@/components/layout/admin-layout';
import { useAuth } from '@/lib/auth';
import { getFirstAccessiblePath } from '@/lib/navigation-access';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { BookingsPage } from '@/features/bookings/BookingsPage';
import { BookingFormPage } from '@/features/bookings/BookingFormPage';
import { BookingViewPage } from '@/features/bookings/BookingViewPage';
import { RoomsPage } from '@/features/rooms/RoomsPage';
import { RoomFormPage } from '@/features/rooms/RoomFormPage';
import { RoomViewPage } from '@/features/rooms/RoomViewPage';
import { RoomTypesPage } from '@/features/room-types/RoomTypesPage';
import { InventoryPage } from '@/features/inventory/InventoryPage';
import { RoomTypeFormPage } from '@/features/room-types/RoomTypeFormPage';
import { RoomTypeViewPage } from '@/features/room-types/RoomTypeViewPage';
import { GalleryPage } from '@/features/gallery/GalleryPage';
import { GalleryFormPage } from '@/features/gallery/GalleryFormPage';
import { CouponsPage } from '@/features/coupons/CouponsPage';
import { CouponFormPage } from '@/features/coupons/CouponFormPage';
import { CouponViewPage } from '@/features/coupons/CouponViewPage';
import { UsersPage } from '@/features/users/UsersPage';
import { UserFormPage } from '@/features/users/UserFormPage';
import { UserViewPage } from '@/features/users/UserViewPage';
import { RolesPage } from '@/features/roles/RolesPage';
import { RoleFormPage } from '@/features/roles/RoleFormPage';
import { RoleViewPage } from '@/features/roles/RoleViewPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { TransactionsPage } from '@/features/transactions/TransactionsPage';
import { TransactionViewPage } from '@/features/transactions/TransactionViewPage';
import { SettlementsPage } from '@/features/settlements/SettlementsPage';
import { SettlementViewPage } from '@/features/settlements/SettlementViewPage';
import { LoginPage } from '@/pages/login';
import { ForgotPasswordPage } from '@/pages/forgot-password';
import { SetPasswordPage } from '@/pages/set-password';
import { NotFoundPage } from '@/pages/not-found';

function DefaultRoute() {
  const { session } = useAuth();
  return <Navigate to={getFirstAccessiblePath(session?.perms)} replace />;
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
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
          { path: 'transactions', element: <TransactionsPage /> },
          { path: 'transactions/:id', element: <TransactionViewPage /> },
          { path: 'settlements', element: <SettlementsPage /> },
          { path: 'settlements/:id', element: <SettlementViewPage /> },
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
