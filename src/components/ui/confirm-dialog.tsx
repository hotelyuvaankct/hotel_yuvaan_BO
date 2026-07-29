import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';

type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Defaults to danger for destructive confirmations. */
  tone?: 'danger' | 'primary';
};

type ConfirmDialogState = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<ConfirmDialogState | null>(null);

  const close = useCallback((confirmed: boolean) => {
    setDialog((current) => {
      current?.resolve(confirmed);
      return null;
    });
  }, []);

  const value = useMemo<ConfirmContextValue>(
    () => ({
      confirm(options) {
        return new Promise<boolean>((resolve) => {
          setDialog({ ...options, resolve });
        });
      },
    }),
    [],
  );

  const tone = dialog?.tone ?? 'danger';

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal isOpen={Boolean(dialog)} onClose={() => close(false)} size="sm">
        {dialog ? (
          <>
            <Modal.Header title={dialog.title} onClose={() => close(false)} />
            <Modal.Body>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <p className="leading-6 text-muted-foreground">{dialog.description}</p>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="outline" onClick={() => close(false)}>
                {dialog.cancelLabel ?? 'Cancel'}
              </Button>
              <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={() => close(true)}>
                {dialog.confirmLabel ?? 'Confirm'}
              </Button>
            </Modal.Footer>
          </>
        ) : null}
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used inside ConfirmProvider');
  }
  return context;
}
