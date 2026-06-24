import { useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  CalendarRange,
  Check,
  Copy,
  Edit,
  Eye,
  History,
  Mail,
  Percent,
  Trash2,
  Wallet,
} from 'lucide-react';
import type { Coupon } from '@/lib/api-types';
import { couponTypeOptions, optionLabel } from '@/lib/enums';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  couponExpiryStatus,
  couponUsagePercent,
  formatCouponCurrency,
  formatCouponDate,
  formatCouponDiscount,
  formatCouponDiscountDetail,
} from '@/lib/coupon-format';
import { cn } from '@/lib/utils';

type CouponListCardProps = {
  coupon: Coupon;
  tab: 'active' | 'deactivated';
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onDelete: (coupon: Coupon) => void;
};

const cardActionClass =
  'flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 px-2 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground';

function CardActionLink({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link to={to} className={cardActionClass} title={label}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

function CardActionButton({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        cardActionClass,
        destructive && 'hover:bg-destructive/10 hover:text-destructive',
      )}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

export function CouponListCard({
  coupon,
  tab,
  canRead,
  canUpdate,
  canDelete,
  onDelete,
}: CouponListCardProps) {
  const [copied, setCopied] = useState(false);
  const isWebsite = coupon.couponType === 1;
  const usagePercent = couponUsagePercent(coupon);
  const typeLabel = optionLabel(couponTypeOptions, coupon.couponType);
  const expiryStatus = tab === 'active' ? couponExpiryStatus(coupon) : null;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-300',
        'hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md hover:shadow-primary/5',
        tab === 'deactivated' && 'opacity-70 saturate-[0.85]',
      )}
    >
      <div
        className={cn(
          'absolute inset-y-0 left-0 w-1',
          isWebsite ? 'bg-emerald-500' : 'bg-gold-500',
        )}
      />

      <div className="flex flex-1 flex-col gap-4 p-5 pl-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isWebsite ? 'success' : 'gold'}>{typeLabel}</Badge>
            {tab === 'deactivated' ? (
              <Badge variant="secondary">Deactivated</Badge>
            ) : null}
            {expiryStatus === 'expiring-soon' ? (
              <Badge variant="warning">Expires soon</Badge>
            ) : null}
            {expiryStatus === 'expired' ? (
              <Badge variant="outline" className="border-destructive/40 text-destructive">
                Expired
              </Badge>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => void copyCode()}
              aria-label={copied ? 'Code copied' : 'Copy coupon code'}
              title={copied ? 'Copied!' : 'Copy code'}
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          <p className="font-mono text-2xl font-bold tracking-wider text-foreground">{coupon.code}</p>
          <h3 className="text-sm font-medium text-foreground">{coupon.title}</h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span>{coupon.hotelName || 'All hotels'}</span>
          </div>
        </div>

        {coupon.description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{coupon.description}</p>
        ) : null}

        <div className="grid grid-cols-3 divide-x divide-border/70 overflow-hidden rounded-xl border border-border/60 bg-muted/25">
          <div className="px-3 py-3">
            <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {coupon.discountType === 1 ? (
                <Percent className="h-3 w-3" />
              ) : (
                <Wallet className="h-3 w-3" />
              )}
              Discount
            </div>
            <p className="text-lg font-bold leading-none text-foreground">{formatCouponDiscount(coupon)}</p>
            <p className="mt-1 text-[10px] leading-tight text-muted-foreground">
              {formatCouponDiscountDetail(coupon)}
            </p>
          </div>

          <div className="px-3 py-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Used
            </p>
            {canRead ? (
              <Link
                to={`/coupons/${coupon.id}#usage-history`}
                className="text-lg font-bold leading-none text-foreground transition-colors hover:text-primary"
              >
                {coupon.usageCount ?? 0}
                {coupon.totalUsageLimit ? (
                  <span className="text-sm font-medium text-muted-foreground">
                    {' '}
                    / {coupon.totalUsageLimit}
                  </span>
                ) : null}
              </Link>
            ) : (
              <p className="text-lg font-bold leading-none text-foreground">
                {coupon.usageCount ?? 0}
                {coupon.totalUsageLimit ? (
                  <span className="text-sm font-medium text-muted-foreground">
                    {' '}
                    / {coupon.totalUsageLimit}
                  </span>
                ) : null}
              </p>
            )}
            {usagePercent != null ? (
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-border/80">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    usagePercent >= 90 ? 'bg-amber-500' : 'bg-emerald-500',
                  )}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            ) : (
              <p className="mt-1 text-[10px] text-muted-foreground">Unlimited</p>
            )}
          </div>

          <div className="px-3 py-3">
            <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <CalendarRange className="h-3 w-3" />
              Valid
            </div>
            <p className="text-xs font-semibold leading-snug text-foreground">
              {formatCouponDate(coupon.startDate)}
            </p>
            <p className="text-[10px] text-muted-foreground">to {formatCouponDate(coupon.expiryDate)}</p>
          </div>
        </div>

        {(coupon.minBookingAmount != null && coupon.minBookingAmount > 0) ||
        (coupon.perUserUsageLimit != null && coupon.perUserUsageLimit > 0) ? (
          <div className="flex flex-wrap gap-1.5">
            {coupon.minBookingAmount != null && coupon.minBookingAmount > 0 ? (
              <span className="inline-flex items-center rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                Min. {formatCouponCurrency(coupon.minBookingAmount)}
              </span>
            ) : null}
            {coupon.perUserUsageLimit != null && coupon.perUserUsageLimit > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                <Mail className="h-3 w-3" />
                {coupon.perUserUsageLimit}× per email
              </span>
            ) : null}
          </div>
        ) : null}

        <div className="mt-auto overflow-hidden rounded-xl border border-border/60 bg-muted/20">
          <div className="flex divide-x divide-border/60">
            <CardActionLink to={`/coupons/${coupon.id}`} icon={Eye} label="View" />
            {canRead ? (
              <CardActionLink
                to={`/coupons/${coupon.id}#usage-history`}
                icon={History}
                label="Usages"
              />
            ) : null}
            {tab === 'active' && canUpdate ? (
              <CardActionLink to={`/coupons/${coupon.id}/edit`} icon={Edit} label="Edit" />
            ) : null}
            {tab === 'active' && canDelete ? (
              <CardActionButton
                icon={Trash2}
                label="Deactivate"
                destructive
                onClick={() => onDelete(coupon)}
              />
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
