import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, Save, Settings2, X } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import type { CancellationPolicyConfig, CancellationPolicyTier, PricingConfig } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { SYSTEM_ROLE_NAMES } from '@/lib/constants';
import { ChangePasswordFlow } from '@/components/auth/change-password-flow';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TextField } from '@/components/ui/form-fields';

const emptyPricing: PricingConfig = {
  roomTaxPercent: 0,
  processingFeePercent: 0,
  processingFeeGstPercent: 0,
  hotelGstin: '',
  invoiceHsnSac: '',
};

const emptyPolicy: CancellationPolicyConfig = {
  tiers: [],
  adminCancelRefundPercent: 0,
};

export function SettingsPage() {
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

  const [policyOpen, setPolicyOpen] = useState(false);
  const [policy, setPolicy] = useState<CancellationPolicyConfig>(emptyPolicy);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policySaving, setPolicySaving] = useState(false);

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
            roomTaxPercent: Number(data.roomTaxPercent),
            processingFeePercent: Number(data.processingFeePercent),
            processingFeeGstPercent: Number(data.processingFeeGstPercent),
            hotelGstin: data.hotelGstin ?? '',
            invoiceHsnSac: data.invoiceHsnSac ?? '',
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

  useEffect(() => {
    if (!isSuperAdmin || !policyOpen) return;
    let cancelled = false;
    (async () => {
      setPolicyLoading(true);
      try {
        const data = await api.getCancellationPolicy();
        if (!cancelled && data) {
          setPolicy({
            tiers: (data.tiers ?? []).map((tier) => ({
              id: tier.id,
              minHoursBeforeCheckIn: Number(tier.minHoursBeforeCheckIn),
              refundPercent: Number(tier.refundPercent),
              sortOrder: tier.sortOrder,
            })),
            adminCancelRefundPercent: Number(data.adminCancelRefundPercent),
            cancelOtpExpiryMinutes: data.cancelOtpExpiryMinutes,
          });
        }
      } catch (error) {
        if (!cancelled) {
          showToast(
            error instanceof ApiError ? error.message : 'Failed to load cancellation policy',
            'error',
          );
          setPolicyOpen(false);
        }
      } finally {
        if (!cancelled) setPolicyLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin, policyOpen, showToast]);

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
        invoiceHsnSac: saved.invoiceHsnSac ?? '',
      });
      showToast('Pricing configuration saved', 'success');
      setConfigOpen(false);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Failed to save pricing config', 'error');
    } finally {
      setPricingSaving(false);
    }
  }

  function updateTier(index: number, patch: Partial<CancellationPolicyTier>) {
    setPolicy((prev) => ({
      ...prev,
      tiers: prev.tiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)),
    }));
  }

  function addTier() {
    setPolicy((prev) => ({
      ...prev,
      tiers: [...prev.tiers, { minHoursBeforeCheckIn: 0, refundPercent: 0, sortOrder: prev.tiers.length + 1 }],
    }));
  }

  function removeTier(index: number) {
    setPolicy((prev) => ({
      ...prev,
      tiers: prev.tiers.filter((_, i) => i !== index),
    }));
  }

  async function savePolicy(event: FormEvent) {
    event.preventDefault();
    if (policy.tiers.length === 0) {
      showToast('Add at least one policy tier', 'error');
      return;
    }
    const confirmed = await confirm({
      title: 'Save cancellation policy?',
      description: 'Guest refund percentages will use these tiers. Admin cancel uses admin refund percent.',
      confirmLabel: 'Yes, save',
      cancelLabel: 'Cancel',
    });
    if (!confirmed) return;

    setPolicySaving(true);
    try {
      const saved = await api.updateCancellationPolicy({
        tiers: policy.tiers.map((tier, index) => ({
          minHoursBeforeCheckIn: Number(tier.minHoursBeforeCheckIn),
          refundPercent: Number(tier.refundPercent),
          sortOrder: tier.sortOrder ?? index + 1,
        })),
        adminCancelRefundPercent: Number(policy.adminCancelRefundPercent),
      });
      setPolicy({
        tiers: saved.tiers ?? [],
        adminCancelRefundPercent: Number(saved.adminCancelRefundPercent),
        cancelOtpExpiryMinutes: saved.cancelOtpExpiryMinutes,
      });
      showToast('Cancellation policy saved', 'success');
      setPolicyOpen(false);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : 'Failed to save cancellation policy', 'error');
    } finally {
      setPolicySaving(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <section className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription className="hidden sm:block">
              Authenticated user and permissions loaded from the profile API.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-muted/40 p-4">
              <div className="min-w-0 space-y-1">
                <p className="truncate font-semibold">{session?.user?.fullName || 'Backoffice user'}</p>
                <p className="truncate text-sm text-muted-foreground">{session?.user?.email}</p>
                {(session?.roles?.length ?? 0) > 0 ? (
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {session?.roles?.join(' · ')}
                  </p>
                ) : null}
              </div>
              <Button variant="outline" className="h-9 w-9 px-0 sm:h-10 sm:w-auto sm:px-4" aria-label="Refresh profile" onClick={() => void refreshProfile()}>
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Refresh profile</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription className="hidden sm:block">
              Change your password with a one-time email code. All sessions end after a successful change.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordFlow />
          </CardContent>
        </Card>

        {isSuperAdmin ? (
          <Card>
            <CardHeader>
              <CardTitle>Tax & payment fees</CardTitle>
              <CardDescription className="hidden sm:block">
                Configure room GST, Razorpay processing fee, and GST on that fee. Changes apply to new
                checkouts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                size="sm"
                className="h-9 w-9 px-0 sm:w-auto sm:px-3"
                aria-label="Config"
                onClick={() => setConfigOpen(true)}
              >
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">Config</span>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {isSuperAdmin ? (
          <Card>
            <CardHeader>
              <CardTitle>Cancellation refund policy</CardTitle>
              <CardDescription className="hidden sm:block">
                Guest cancel tiers by hours before check-in, plus admin cancel refund percent.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                size="sm"
                className="h-9 w-9 px-0 sm:w-auto sm:px-3"
                aria-label="Edit policy"
                onClick={() => setPolicyOpen(true)}
              >
                <Settings2 className="h-4 w-4" />
                <span className="hidden sm:inline">Edit policy</span>
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </section>

      {configOpen
        ? createPortal(
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-overlay px-4 backdrop-blur-md">
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

      {policyOpen
        ? createPortal(
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-overlay px-4 backdrop-blur-md">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="cancel-policy-title"
                className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-card p-5 text-card-foreground shadow-2xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 id="cancel-policy-title" className="text-lg font-semibold">
                      Cancellation refund policy
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Stored in cancellation_policy_tiers. Admin percent is in app_config.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setPolicyOpen(false)}
                    aria-label="Close policy"
                    disabled={policySaving}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-5">
                  {policyLoading ? (
                    <p className="text-sm text-muted-foreground">Loading cancellation policy…</p>
                  ) : (
                    <form className="space-y-4" onSubmit={(e) => void savePolicy(e)}>
                      <TextField
                        label="Admin cancel refund %"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        required
                        value={String(policy.adminCancelRefundPercent)}
                        onChange={(e) =>
                          setPolicy((prev) => ({
                            ...prev,
                            adminCancelRefundPercent: Number(e.target.value),
                          }))
                        }
                        hint="Percent of the full amount the guest paid (includes processing fee). 100 = full refund."
                      />
                      <div className="space-y-3">
                        {policy.tiers.map((tier, index) => (
                          <div key={`${tier.id ?? 'new'}-${index}`} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                            <TextField
                              label="Min hours before check-in"
                              type="number"
                              min="0"
                              required
                              value={String(tier.minHoursBeforeCheckIn)}
                              onChange={(e) =>
                                updateTier(index, { minHoursBeforeCheckIn: Number(e.target.value) })
                              }
                            />
                            <TextField
                              label="Refund %"
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              required
                              value={String(tier.refundPercent)}
                              onChange={(e) =>
                                updateTier(index, { refundPercent: Number(e.target.value) })
                              }
                            />
                            <div className="flex items-end">
                              <Button
                                type="button"
                                variant="outline"
                                disabled={policy.tiers.length <= 1}
                                onClick={() => removeTier(index)}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={addTier} disabled={policySaving}>
                          Add tier
                        </Button>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setPolicyOpen(false)}
                            disabled={policySaving}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={policySaving}>
                            <Save className="h-4 w-4" />
                            {policySaving ? 'Saving…' : 'Save policy'}
                          </Button>
                        </div>
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
