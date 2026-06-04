import { createContext, useContext, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info';

type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast(message, type = 'info') {
        const id = Date.now();
        setToasts((current) => [...current, { id, message, type }]);
        window.setTimeout(() => {
          setToasts((current) => current.filter((toast) => toast.id !== id));
        }, 3600);
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'flex items-start justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-sm shadow-lg',
              toast.type === 'success' && 'border-emerald-500/30 text-emerald-700 dark:text-emerald-200',
              toast.type === 'error' && 'border-destructive/30 text-destructive',
              toast.type === 'info' && 'border-border text-foreground',
            )}
          >
            <span>{toast.message}</span>
            <button
              type="button"
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}
              aria-label="Dismiss message"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside ToastProvider');
  }
  return context;
}
