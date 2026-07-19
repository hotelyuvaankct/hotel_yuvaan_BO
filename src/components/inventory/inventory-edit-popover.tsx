import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type InventoryEditKind = 'availability' | 'rate';

type Props = {
  kind: InventoryEditKind;
  initialValue: string;
  anchorRect: DOMRect | null;
  saving?: boolean;
  onCancel: () => void;
  onSave: (value: number) => void;
};

const POPOVER_WIDTH = 280;
const GAP = 12;
const ESTIMATED_HEIGHT = 200;

export function InventoryEditPopover({
  kind,
  initialValue,
  anchorRect,
  saving,
  onCancel,
  onSave,
}: Props) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue);
  const [placement, setPlacement] = useState<'above' | 'below'>('above');
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  useLayoutEffect(() => {
    if (!anchorRect) {
      setCoords(null);
      return;
    }

    const height = panelRef.current?.offsetHeight || ESTIMATED_HEIGHT;
    const spaceAbove = anchorRect.top;
    const placeAbove = spaceAbove >= height + GAP;
    setPlacement(placeAbove ? 'above' : 'below');

    const centerX = anchorRect.left + anchorRect.width / 2;
    const left = Math.min(
      Math.max(centerX, POPOVER_WIDTH / 2 + 8),
      window.innerWidth - POPOVER_WIDTH / 2 - 8,
    );
    const top = placeAbove ? anchorRect.top - GAP : anchorRect.bottom + GAP;
    setCoords({ left, top });
  }, [anchorRect, value, kind]);

  if (!anchorRect) return null;

  const parsed = Number(value);
  const canSave = value.trim() !== '' && !Number.isNaN(parsed) && parsed >= 0 && !saving;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-[200]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-labelledby={titleId}
        className="pointer-events-auto absolute w-[280px] rounded-xl border border-border bg-background p-4 shadow-xl"
        style={{
          left: coords?.left ?? anchorRect.left + anchorRect.width / 2,
          top: coords?.top ?? anchorRect.top - GAP,
          transform:
            placement === 'above' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
        }}
      >
        <h3 id={titleId} className="text-base font-semibold text-sky-900">
          {kind === 'availability' ? 'Update total rooms' : 'Update rate'}
        </h3>

        <label className="mt-3 flex items-center justify-between gap-3 text-sm text-slate-700">
          <span className="shrink-0">
            {kind === 'availability' ? 'Total rooms' : 'Sell exclusive rate'}
          </span>
          <input
            ref={inputRef}
            type="number"
            min={0}
            step={1}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && canSave) onSave(parsed);
            }}
            className="h-9 w-24 rounded-md border border-sky-400 px-2 text-center text-sm outline-none focus:ring-2 focus:ring-sky-300"
          />
        </label>

        {kind === 'availability' ? (
          <p className="mt-2 text-xs text-muted-foreground">
            To close availability, please set to 0.
          </p>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 border-sky-500 text-sky-700 hover:bg-sky-50"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className={cn('h-9 bg-sky-500 text-white hover:bg-sky-600', !canSave && 'opacity-50')}
            disabled={!canSave}
            onClick={() => onSave(parsed)}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>

        <span
          aria-hidden
          className={cn(
            'absolute left-1/2 -translate-x-1/2 border-8 border-transparent',
            placement === 'above'
              ? 'top-full border-t-background'
              : 'bottom-full border-b-background',
          )}
        />
      </div>
    </div>,
    document.body,
  );
}
