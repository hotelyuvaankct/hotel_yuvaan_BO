import { useState } from 'react';
import type { InventoryBlockConflict } from '@/lib/api-types';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { TextField } from '@/components/ui/form-fields';
import { addDaysIso, todayIso } from '@/lib/form-validation';

type Props = {
  open: boolean;
  mode: 'block' | 'unblock';
  hotelId: number | null;
  maxDate?: string;
  conflicts: InventoryBlockConflict[];
  onClose: () => void;
  onSubmit: (payload: {
    hotelId: number;
    fromDate: string;
    toDate: string;
    reason?: string;
  }) => Promise<void>;
};

export function InventoryBlockDialog({ open, mode, hotelId, maxDate, conflicts, onClose, onSubmit }: Props) {
  const [fromDate, setFromDate] = useState(todayIso());
  const [toDate, setToDate] = useState(addDaysIso(todayIso(), 2));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-lg bg-background p-5 shadow-lg">
        <h2 className="text-lg font-semibold">{mode === 'block' ? 'Block dates' : 'Unblock dates'}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === 'block'
            ? 'Stop-sell every room type in this hotel for the selected nights.'
            : 'Clear stop-sell for every room type in this hotel over the selected nights.'}
        </p>
        <div className="mt-4 space-y-3">
          <DateRangePicker
            label="Date range"
            required
            startValue={fromDate}
            endValue={toDate}
            minDate={todayIso()}
            maxDate={maxDate}
            onChange={(start, end) => {
              setFromDate(start);
              setToDate(end);
            }}
          />
          {mode === 'block' ? (
            <TextField
              label="Reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          ) : null}
          {conflicts.length > 0 ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <p className="font-medium text-destructive">Conflicting bookings</p>
              <ul className="mt-2 space-y-1">
                {conflicts.map((conflict) => (
                  <li key={conflict.bookingId}>
                    {conflict.bookingCode} · {conflict.guestName ?? 'Guest'} · {conflict.checkIn} →{' '}
                    {conflict.checkOut}
                    {conflict.ratePlanCode ? ` · ${conflict.ratePlanCode}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving || !hotelId || !fromDate || !toDate}
            onClick={async () => {
              if (!hotelId) return;
              setSaving(true);
              try {
                await onSubmit({
                  hotelId,
                  fromDate,
                  toDate,
                  reason: reason || undefined,
                });
              } finally {
                setSaving(false);
              }
            }}
          >
            {mode === 'block' ? 'Block' : 'Unblock'}
          </Button>
        </div>
      </div>
    </div>
  );
}
