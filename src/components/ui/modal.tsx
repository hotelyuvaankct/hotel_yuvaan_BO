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
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  size?: ModalSize;
  children: ReactNode;
  /** When true, overlay click / Esc do not close (e.g. destructive in progress). */
  preventDismiss?: boolean;
  className?: string;
};

const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

type ModalContextValue = {
  titleId: string;
  descriptionId: string;
  onClose: () => void;
};

const ModalContext = createContext<ModalContextValue | null>(null);

function useModalContext() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('Modal compound components must be used inside <Modal>');
  return ctx;
}

export function Modal({
  isOpen,
  onClose,
  size = 'md',
  children,
  preventDismiss = false,
  className,
}: ModalProps) {
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
    <ModalContext.Provider value={value}>
      <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
        <button
          type="button"
          className="absolute inset-0 bg-overlay backdrop-blur-[2px]"
          aria-label="Close dialog overlay"
          onClick={handleClose}
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
          className={cn(
            'relative z-10 w-full rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl outline-none',
            sizeStyles[size],
            className,
          )}
        >
          {children}
        </div>
      </div>
    </ModalContext.Provider>,
    document.body,
  );
}

function ModalHeader({
  title,
  onClose,
  className,
}: {
  title: string;
  onClose?: () => void;
  className?: string;
}) {
  const ctx = useModalContext();
  return (
    <div className={cn('flex items-start justify-between gap-4 border-b border-border px-5 py-4', className)}>
      <h2 id={ctx.titleId} className="text-lg font-semibold text-foreground">
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

function ModalBody({ children, className }: { children: ReactNode; className?: string }) {
  const ctx = useModalContext();
  return (
    <div id={ctx.descriptionId} className={cn('px-5 py-4 text-sm text-foreground', className)}>
      {children}
    </div>
  );
}

function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-4', className)}>
      {children}
    </div>
  );
}

Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;

export type { ModalProps, ModalSize };
