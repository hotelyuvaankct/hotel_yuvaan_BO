import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type BottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** When true, overlay click / Esc do not close. */
  preventDismiss?: boolean;
  className?: string;
  /** Max height of the sheet panel (CSS value). Default 90dvh. */
  maxHeight?: string;
};

type BottomSheetContextValue = {
  titleId: string;
  descriptionId: string;
  onClose: () => void;
};

const BottomSheetContext = createContext<BottomSheetContextValue | null>(null);

function useBottomSheetContext() {
  const ctx = useContext(BottomSheetContext);
  if (!ctx) throw new Error('BottomSheet compound components must be used inside <BottomSheet>');
  return ctx;
}

/**
 * Mobile-first bottom sheet. Portal to document.body.
 *
 * @example
 * ```tsx
 * <BottomSheet isOpen={open} onClose={() => setOpen(false)}>
 *   <BottomSheet.Header title="Select dates" />
 *   <BottomSheet.Body>…</BottomSheet.Body>
 *   <BottomSheet.Footer>
 *     <Button onClick={onClose}>Cancel</Button>
 *     <Button onClick={apply}>Apply</Button>
 *   </BottomSheet.Footer>
 * </BottomSheet>
 * ```
 */
export function BottomSheet({
  isOpen,
  onClose,
  children,
  preventDismiss = false,
  className,
  maxHeight = '90dvh',
}: BottomSheetProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    if (preventDismiss) return;
    onClose();
  }, [onClose, preventDismiss]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);

    const frame = window.requestAnimationFrame(() => {
      panelRef.current?.focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      window.cancelAnimationFrame(frame);
    };
  }, [handleClose, isOpen]);

  const value = useMemo(
    () => ({ titleId, descriptionId, onClose: handleClose }),
    [titleId, descriptionId, handleClose],
  );

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <BottomSheetContext.Provider value={value}>
      <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
        <button
          type="button"
          className="absolute inset-0 bg-overlay backdrop-blur-[2px] animate-in fade-in-0 duration-200"
          aria-label="Close sheet overlay"
          onClick={handleClose}
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          style={{ maxHeight }}
          className={cn(
            'relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-popover text-popover-foreground shadow-xl outline-none',
            'animate-in slide-in-from-bottom-4 fade-in-0 duration-200',
            'sm:max-h-[min(90dvh,900px)] sm:max-w-2xl sm:rounded-2xl sm:slide-in-from-bottom-0 sm:zoom-in-95',
            className,
          )}
        >
          <div className="flex shrink-0 justify-center pt-2 sm:hidden" aria-hidden>
            <span className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>
          {children}
        </div>
      </div>
    </BottomSheetContext.Provider>,
    document.body,
  );
}

function BottomSheetHeader({
  title,
  onClose,
  className,
}: {
  title: string;
  onClose?: () => void;
  className?: string;
}) {
  const ctx = useBottomSheetContext();
  return (
    <div className={cn('flex shrink-0 items-start justify-between gap-4 border-b border-border px-4 py-3 sm:px-5 sm:py-4', className)}>
      <h2 id={ctx.titleId} className="text-base font-semibold text-foreground sm:text-lg">
        {title}
      </h2>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        aria-label="Close"
        onClick={onClose ?? ctx.onClose}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function BottomSheetBody({ children, className }: { children: ReactNode; className?: string }) {
  const ctx = useBottomSheetContext();
  return (
    <div
      id={ctx.descriptionId}
      className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 text-sm text-foreground sm:px-5 sm:py-4', className)}
    >
      {children}
    </div>
  );
}

function BottomSheetFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

BottomSheet.Header = BottomSheetHeader;
BottomSheet.Body = BottomSheetBody;
BottomSheet.Footer = BottomSheetFooter;

export type { BottomSheetProps };
