import { useState, type MouseEvent } from 'react';
import { Check, Copy } from 'lucide-react';
import { copyToClipboard, cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';

type CopyableRowProps = {
  label: string;
  value?: string | null;
  className?: string;
  /** Toast on success. Default: "Copied" */
  successMessage?: string;
};

/** Mono value row with copy action — use for gateway ids, codes, references. */
export function CopyableRow({
  label,
  value,
  className,
  successMessage = 'Copied',
}: CopyableRowProps) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  async function handleCopy() {
    const ok = await copyToClipboard(value!);
    if (!ok) {
      showToast('Unable to copy', 'error');
      return;
    }
    setCopied(true);
    showToast(successMessage, 'success');
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-2 border-b border-border/60 py-2.5 last:border-0',
        className,
      )}
    >
      <span className="w-20 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{value}</code>
      <button
        type="button"
        aria-label={`Copy ${label}`}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={(event) => {
          event.stopPropagation();
          void handleCopy();
        }}
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-success" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

type CopyIconButtonProps = {
  value: string;
  label?: string;
  className?: string;
  successMessage?: string;
  onCopied?: (value: string) => void;
};

/** Icon-only copy control for compact cells / chips. */
export function CopyIconButton({
  value,
  label = 'Copy',
  className,
  successMessage = 'Copied',
  onCopied,
}: CopyIconButtonProps) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  async function handleCopy(event: MouseEvent) {
    event.stopPropagation();
    const ok = await copyToClipboard(value);
    if (!ok) {
      showToast('Unable to copy', 'error');
      return;
    }
    setCopied(true);
    onCopied?.(value);
    showToast(successMessage, 'success');
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      onClick={(event) => void handleCopy(event)}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-success" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

export type { CopyableRowProps, CopyIconButtonProps };
