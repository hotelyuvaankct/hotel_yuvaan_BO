import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { AdminLayout } from '@/components/layout/admin-layout';
import { DashboardPage } from '@/pages/dashboard';
import { BookingsPage } from '@/pages/bookings';
import { RoomsPage } from '@/pages/rooms';
import { UsersPage } from '@/pages/users';
import { RolesPage } from '@/pages/roles';
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
          { path: 'users', element: <UsersPage /> },
          { path: 'roles', element: <RolesPage /> },
          { path: 'guests', element: <GuestsPage /> },
          { path: 'reports', element: <ReportsPage /> },
          { path: 'settings', element: <SettingsPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
