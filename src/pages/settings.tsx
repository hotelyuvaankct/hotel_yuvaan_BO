import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, Save, Settings2, X } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import type { PricingConfig } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { SYSTEM_ROLE_NAMES } from '@/lib/constants';
import { useTheme } from '@/components/theme-provider';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TextField } from '@/components/ui/form-fields';

const emptyPricing: PricingConfig = {
  roomTaxPercent: 5,
  processingFeePercent: 2,
  processingFeeGstPercent: 18,
  hotelGstin: '',
  invoiceHsnSac: '996311',
};

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { session, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const isSuperAdmin = useMemo(
    () => (session?.roles ?? []).some((role) => role.toUpperCase() === SYSTEM_ROLE_NAMES.SUPER_ADMIN),
    [session?.roles],
  );

  const [configOpen, setConfigOpen] = useState(false);
  const [pricing, setPricing] = useState<PricingConfig>(emptyPricing);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingErrors, setPricingErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isSuperAdmin || !configOpen) return;
    let cancelled = false;
    (async () => {
      setPricingLoading(true);
      setPricingErrors({});
      try {
        const data = await api.getPricingConfig();
        if (!cancelled && data) {
          setPricing({
            roomTaxPercent: Number(data.roomTaxPercent ?? 5),
            processingFeePercent: Number(data.processingFeePercent ?? 2),
            processingFeeGstPercent: Number(data.processingFeeGstPercent ?? 18),
            hotelGstin: data.hotelGstin ?? '',
            invoiceHsnSac: data.invoiceHsnSac ?? '996311',
          });
        }
      } catch (error) {
        if (!cancelled) {
          showToast(error instanceof ApiError ? error.message : 'Failed to load pricing config', 'error');
          setConfigOpen(false);
        }
      } finally {
        if (!cancelled) setPricingLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin, configOpen, showToast]);

  async function savePricing(event: FormEvent) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (pricing.roomTaxPercent < 0 || pricing.roomTaxPercent > 100) {
      errors.roomTaxPercent = 'Must be between 0 and 100';
    }
    if (pricing.processingFeePercent < 0 || pricing.processingFeePercent > 100) {
      errors.processingFeePercent = 'Must be between 0 and 100';
    }
    if (pricing.processingFeeGstPercent < 0 || pricing.processingFeeGstPercent > 100) {
      errors.processingFeeGstPercent = 'Must be between 0 and 100';
    }
    setPricingErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const confirmed = await confirm({
      title: 'Are you sure?',
      description:
        'This will update room tax and payment processing fees for all new checkouts. Existing bookings keep their saved amounts.',
      confirmLabel: 'Yes, update',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;

    setPricingSaving(true);
    try {
      const saved = await api.updatePricingConfig({
        roomTaxPercent: pricing.roomTaxPercent,
        processingFeePercent: pricing.processingFeePercent,
        processingFeeGstPercent: pricing.processingFeeGstPercent,
        hotelGstin: pricing.hotelGstin?.trim() || undefined,
        invoiceHsnSac: pricing.invoiceHsnSac?.trim() || undefined,
      });
      setPricing({
        roomTaxPercent: Number(saved.roomTaxPercent),
        processingFeePercent: Number(saved.processingFeePercent),
        processingFeeGstPercent: Number(saved.processingFeeGstPercent),
        hotelGstin: saved.hotelGstin ?? '',
        invoiceHsnSac: saved.invoiceHsnSac ?? '996311',
      });
      showToast('Pricing configuration saved', 'success');
      setConfigOpen(false);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Failed to save pricing config', 'error');
    } finally {
      setPricingSaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Authenticated user and permissions loaded from the profile API.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="font-semibold">{session?.user?.fullName || 'Backoffice user'}</p>
              <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
            </div>
            <Button variant="outline" onClick={() => void refreshProfile()}>
              <RefreshCw className="h-4 w-4" />
              Refresh profile
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Theme preference stays local to this browser.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {(['light', 'dark', 'system'] as const).map((option) => (
              <Button key={option} variant={theme === option ? 'gold' : 'outline'} onClick={() => setTheme(option)}>
                {option[0].toUpperCase() + option.slice(1)}
              </Button>
            ))}
          </CardContent>
        </Card>
      </section>

      {isSuperAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Tax & payment fees</CardTitle>
            <CardDescription>
              Configure room GST, Razorpay processing fee, and GST on that fee. Changes apply to new checkouts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={() => setConfigOpen(true)}>
              <Settings2 className="h-4 w-4" />
              Config
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {configOpen
        ? createPortal(
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 px-4 backdrop-blur-sm">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="pricing-config-title"
                className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-card p-5 text-card-foreground shadow-2xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 id="pricing-config-title" className="text-lg font-semibold">
                      Tax & payment fees
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Stored in app_config and applied on checkout.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setConfigOpen(false)}
                    aria-label="Close config"
                    disabled={pricingSaving}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5">
                  {pricingLoading ? (
                    <p className="text-sm text-muted-foreground">Loading pricing config…</p>
                  ) : (
                    <form className="space-y-4" onSubmit={(e) => void savePricing(e)}>
                      <div className="grid gap-4 md:grid-cols-3">
                        <TextField
                          label="Room tax %"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          required
                          value={String(pricing.roomTaxPercent)}
                          error={pricingErrors.roomTaxPercent}
                          hint="Applied on (room subtotal − discount). Shown as CGST + SGST."
                          onChange={(e) =>
                            setPricing((prev) => ({ ...prev, roomTaxPercent: Number(e.target.value) }))
                          }
                        />
                        <TextField
                          label="Processing fee %"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          required
                          value={String(pricing.processingFeePercent)}
                          error={pricingErrors.processingFeePercent}
                          hint="Razorpay fee on (room net + room tax)."
                          onChange={(e) =>
                            setPricing((prev) => ({
                              ...prev,
                              processingFeePercent: Number(e.target.value),
                            }))
                          }
                        />
                        <TextField
                          label="GST on processing fee %"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          required
                          value={String(pricing.processingFeeGstPercent)}
                          error={pricingErrors.processingFeeGstPercent}
                          hint="GST charged on the processing fee amount."
                          onChange={(e) =>
                            setPricing((prev) => ({
                              ...prev,
                              processingFeeGstPercent: Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <TextField
                          label="Hotel GSTIN"
                          value={pricing.hotelGstin ?? ''}
                          onChange={(e) => setPricing((prev) => ({ ...prev, hotelGstin: e.target.value }))}
                        />
                        <TextField
                          label="Invoice HSN/SAC"
                          value={pricing.invoiceHsnSac ?? ''}
                          onChange={(e) =>
                            setPricing((prev) => ({ ...prev, invoiceHsnSac: e.target.value }))
                          }
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setConfigOpen(false)}
                          disabled={pricingSaving}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={pricingSaving}>
                          <Save className="h-4 w-4" />
                          {pricingSaving ? 'Saving…' : 'Save pricing config'}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
