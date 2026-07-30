import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

type UseScrollToTopOptions = {
  /** Scroll smoothly instead of jumping. Default 'smooth'. */
  behavior?: ScrollBehavior;
  /** When true, skip scrolling if the URL has a hash (anchor links). Default true. */
  ignoreHash?: boolean;
};

/**
 * Scrolls the window to the top whenever the route pathname (or search) changes.
 *
 * @example
 * ```tsx
 * function RootLayout() {
 *   useScrollToTop(); // smooth by default
 *   return <Outlet />;
 * }
 * ```
 */
export function useScrollToTop(options: UseScrollToTopOptions = {}) {
  const { behavior = 'smooth', ignoreHash = true } = options;
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    if (ignoreHash && hash) return;

    // Prefer smooth window scroll; avoid instant scrollTop overrides that cancel the effect.
    window.scrollTo({ top: 0, left: 0, behavior });

    if (behavior === 'auto') {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [pathname, search, hash, behavior, ignoreHash]);
}
