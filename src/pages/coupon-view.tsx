import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';
import { api } from '@/lib/api';
import type { Coupon, CouponUsage } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { couponTypeOptions, discountTypeOptions, optionLabel } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { FullPageLoader } from '@/components/common/loading-state';
import { Pagination } from '@/components/common/pagination';

function formatCurrency(value?: number) {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function formatDate(value?: string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatDiscount(coupon: Coupon) {
  if (coupon.discountType === 1) {
    const cap = coupon.maxDiscountAmount ? ` (max ${formatCurrency(coupon.maxDiscountAmount)})` : '';
    return `${coupon.discountValue}%${cap}`;
  }
  return formatCurrency(coupon.discountValue);
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export function CouponViewPage() {
  const { id } = useParams();
  const couponId = Number(id);
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const { showToast } = useToast();
  const canRead = hasPermission(session?.perms, 'coupons', 'read');
  const canUpdate = hasPermission(session?.perms, 'coupons', 'update');
  const canReadBookings = hasPermission(session?.perms, 'bookings', 'read');
  const usageSectionRef = useRef<HTMLDivElement | null>(null);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [usages, setUsages] = useState<CouponUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [usageLoading, setUsageLoading] = useState(true);
  const [usagePage, setUsagePage] = useState(0);
  const [usageTotalPages, setUsageTotalPages] = useState(0);

  async function loadUsages(page = usagePage) {
    if (!couponId || !canRead) return;
    setUsageLoading(true);
    try {
      const result = await api.listCouponUsages(couponId, page, 10);
      setUsages(result.content ?? []);
      setUsagePage(result.number ?? page);
      setUsageTotalPages(result.totalPages ?? 0);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load coupon usage history.', 'error');
    } finally {
      setUsageLoading(false);
    }
  }

  useEffect(() => {
    if (!canRead || !couponId) return;
    api.getCoupon(couponId)
      .then(setCoupon)
      .catch((err) => showToast(err instanceof Error ? err.message : 'Unable to load coupon details.', 'error'))
      .finally(() => setLoading(false));
    void loadUsages(0);
  }, [canRead, couponId, showToast]);

  useEffect(() => {
    if (loading || !location.hash.includes('usage-history')) return;
    usageSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [loading, location.hash]);

  if (!canRead) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>Your current role does not include read access for coupons.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) return <FullPageLoader label="Loading coupon details..." />;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Button variant="ghost" onClick={() => navigate('/coupons')}>
        <ArrowLeft className="h-4 w-4" />
        Back to coupons
      </Button>

      {!coupon ? (
        <EmptyState label="No coupon details found." />
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-mono text-2xl font-bold">{coupon.code}</h1>
              <p className="text-sm text-muted-foreground">{coupon.title}</p>
            </div>
            {canUpdate ? (
              <Button variant="gold" size="sm" asChild>
                <Link to={`/coupons/${coupon.id}/edit`} className="inline-flex items-center gap-2">
                  <Edit className="h-4 w-4" />
                  Edit coupon
                </Link>
              </Button>
            ) : null}
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Coupon details</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <DetailRow label="Hotel" value={coupon.hotelName ?? 'All hotels'} />
                <DetailRow label="Type" value={optionLabel(couponTypeOptions, coupon.couponType)} />
                <DetailRow label="Discount" value={formatDiscount(coupon)} />
                <DetailRow label="Discount type" value={optionLabel(discountTypeOptions, coupon.discountType)} />
                <DetailRow
                  label="Minimum booking"
                  value={formatCurrency(coupon.minBookingAmount ?? 0)}
                />
                <DetailRow label="Valid from" value={formatDate(coupon.startDate)} />
                <DetailRow label="Expires" value={formatDate(coupon.expiryDate)} />
                <DetailRow
                  label="Usage"
                  value={`${coupon.usageCount ?? 0}${coupon.totalUsageLimit ? ` / ${coupon.totalUsageLimit}` : ' (unlimited)'}`}
                />
                <DetailRow label="Per-email limit" value={String(coupon.perUserUsageLimit ?? 1)} />
                {coupon.description ? <DetailRow label="Description" value={coupon.description} /> : null}
              </CardContent>
            </Card>

            <Card id="usage-history" ref={usageSectionRef}>
              <CardHeader>
                <CardTitle>Usage history</CardTitle>
                <CardDescription>
                  Bookings and guests that redeemed this coupon. Visible with coupons read permission.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!canRead ? (
                  <EmptyState label="Coupons read permission is required to view usage history." />
                ) : usageLoading ? (
                  <p className="text-sm text-muted-foreground">Loading usage history…</p>
                ) : usages.length === 0 ? (
                  <EmptyState label="This coupon has not been used yet." />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {usages.map((usage) => (
                      <Card key={usage.id} className="border-border/80 shadow-none">
                        <CardContent className="space-y-2 p-4 text-sm">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs text-muted-foreground">Booking</p>
                              {usage.bookingId ? (
                                canReadBookings ? (
                                  <Link
                                    to={`/bookings/${usage.bookingId}`}
                                    className="font-medium text-primary hover:underline"
                                  >
                                    {usage.bookingCode ?? `#${usage.bookingId}`}
                                  </Link>
                                ) : (
                                  <p className="font-medium">{usage.bookingCode ?? `#${usage.bookingId}`}</p>
                                )
                              ) : (
                                <p className="font-medium">-</p>
                              )}
                            </div>
                            <Badge variant="secondary">{formatCurrency(usage.discountAmount)}</Badge>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Guest</p>
                            <p className="font-medium">{usage.guestName ?? '-'}</p>
                            <p className="text-xs text-muted-foreground break-all">
                              {usage.guestEmail ?? usage.userEmail ?? '-'}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">{formatDate(usage.usedAt)}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
                {canRead ? (
                  <Pagination
                    page={usagePage}
                    totalPages={usageTotalPages}
                    loading={usageLoading}
                    onPageChange={(next) => void loadUsages(next)}
                  />
                ) : null}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
