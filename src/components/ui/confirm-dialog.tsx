import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
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

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {dialog
        ? createPortal(
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
              <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby="confirm-dialog-description"
                className="w-full max-w-md rounded-xl border border-border bg-card p-5 text-card-foreground shadow-2xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                      <AlertTriangle className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 id="confirm-dialog-title" className="text-lg font-semibold">
                        {dialog.title}
                      </h2>
                      <p id="confirm-dialog-description" className="mt-2 text-sm leading-6 text-muted-foreground">
                        {dialog.description}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => close(false)}
                    aria-label="Close confirmation"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => close(false)}>
                    {dialog.cancelLabel ?? 'Cancel'}
                  </Button>
                  <Button className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => close(true)}>
                    {dialog.confirmLabel ?? 'Confirm'}
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
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
