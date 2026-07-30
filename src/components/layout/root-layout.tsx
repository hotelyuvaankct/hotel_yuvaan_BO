import { Outlet } from 'react-router-dom';
import { useScrollToTop } from '@/hooks/use-scroll-to-top';

/** Root route shell — scrolls to top on every navigation. */
export function RootLayout() {
  useScrollToTop();
  return <Outlet />;
}
