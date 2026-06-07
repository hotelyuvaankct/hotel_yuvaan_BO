import { RouterProvider } from 'react-router-dom';
import { router } from '@/app/router';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/components/ui/toast';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { GlobalLoader } from '@/components/common/global-loader';

export default function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <GlobalLoader />
        </AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
