import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type BreadcrumbLabelsContextValue = {
  labels: Record<string, string>;
  setBreadcrumbLabel: (path: string, label: string | null) => void;
};

const BreadcrumbLabelsContext = createContext<BreadcrumbLabelsContextValue | null>(null);

export function BreadcrumbLabelProvider({ children }: { children: ReactNode }) {
  const [labels, setLabels] = useState<Record<string, string>>({});

  const setBreadcrumbLabel = useCallback((path: string, label: string | null) => {
    setLabels((current) => {
      if (!label) {
        if (!(path in current)) return current;
        const next = { ...current };
        delete next[path];
        return next;
      }
      if (current[path] === label) return current;
      return { ...current, [path]: label };
    });
  }, []);

  const value = useMemo(
    () => ({ labels, setBreadcrumbLabel }),
    [labels, setBreadcrumbLabel],
  );

  return (
    <BreadcrumbLabelsContext.Provider value={value}>{children}</BreadcrumbLabelsContext.Provider>
  );
}

function useBreadcrumbLabels() {
  const ctx = useContext(BreadcrumbLabelsContext);
  if (!ctx) {
    return {
      labels: {} as Record<string, string>,
      setBreadcrumbLabel: () => undefined,
    };
  }
  return ctx;
}

/** Sets a breadcrumb label for a path while mounted (e.g. booking code instead of numeric id). */
export function useBreadcrumbLabel(path: string | undefined, label: string | null | undefined) {
  const { setBreadcrumbLabel } = useBreadcrumbLabels();

  useEffect(() => {
    if (!path || !label) return;
    setBreadcrumbLabel(path, label);
    return () => setBreadcrumbLabel(path, null);
  }, [path, label, setBreadcrumbLabel]);
}

export { useBreadcrumbLabels };
