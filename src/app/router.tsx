import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AdminLayout } from '@/components/layout/admin-layout';
import { DashboardPage } from '@/pages/dashboard';
import { BookingsPage } from '@/pages/bookings';
import { RoomsPage } from '@/pages/rooms';
import { RoomFormPage } from '@/pages/room-form';
import { UsersPage } from '@/pages/users';
import { UserFormPage } from '@/pages/user-form';
import { UserViewPage } from '@/pages/user-view';
import { RolesPage } from '@/pages/roles';
import { RoleFormPage } from '@/pages/role-form';
import { RoleViewPage } from '@/pages/role-view';
import { GuestsPage } from '@/pages/guests';
import { ReportsPage } from '@/pages/reports';
import { SettingsPage } from '@/pages/settings';
import { LoginPage } from '@/pages/login';
import { NotFoundPage } from '@/pages/not-found';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'bookings', element: <BookingsPage /> },
          { path: 'rooms', element: <RoomsPage /> },
          { path: 'rooms/new', element: <RoomFormPage /> },
          { path: 'rooms/:id/edit', element: <RoomFormPage /> },
          { path: 'users', element: <UsersPage /> },
          { path: 'users/new', element: <UserFormPage /> },
          { path: 'users/:id', element: <UserViewPage /> },
          { path: 'users/:id/edit', element: <UserFormPage /> },
          { path: 'roles', element: <RolesPage /> },
          { path: 'roles/new', element: <RoleFormPage /> },
          { path: 'roles/:id', element: <RoleViewPage /> },
          { path: 'roles/:id/edit', element: <RoleFormPage /> },
          { path: 'guests', element: <GuestsPage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
