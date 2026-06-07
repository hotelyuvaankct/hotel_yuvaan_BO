import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

export function GlobalLoader() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setShow(customEvent.detail);
    };

    window.addEventListener('global-loader', handleToggle);
    return () => window.removeEventListener('global-loader', handleToggle);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <p className="mt-4 text-sm font-medium text-foreground">Processing...</p>
    </div>
  );
}
