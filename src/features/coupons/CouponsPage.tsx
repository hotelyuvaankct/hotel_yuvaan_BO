import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Eye, History, Plus, RefreshCw, Search, Tag, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { Coupon } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { couponTypeOptions, optionLabel } from '@/lib/enums';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { PageToolbar } from '@/components/common/page-toolbar';
import { Pagination } from '@/components/common/pagination';
import { filterControlClass } from '@/components/ui/form-fields';
import { ResponsiveList } from '@/components/ui/responsive-list';
import type { DataTableColumn } from '@/components/ui/data-table';
import {
  couponExpiryStatus,
  formatCouponCurrency,
  formatCouponDate,
  formatCouponDiscount,
} from '@/lib/coupon-format';
import { cn } from '@/lib/utils';

type CouponTab = 'active' | 'deactivated';

const tabLabels: Record<CouponTab, string> = {
  active: 'Active',
  deactivated: 'Deactivated',
};

function couponTypeTone(couponType?: number): BadgeTone {
  return couponType === 1 ? 'success' : 'warning';
}

function CouponActions({
  coupon,
  tab,
  canRead,
  canUpdate,
  canDelete,
  onDelete,
}: {
  coupon: Coupon;
  tab: CouponTab;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onDelete: (coupon: Coupon) => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2" onClick={(e) => e.stopPropagation()}>
      <Button variant="outline" size="sm">
        <Link to={`/coupons/${coupon.id}`} className="inline-flex items-center gap-2">
          <Eye className="h-4 w-4" />
          View
        </Link>
      </Button>
      {canRead ? (
        <Button variant="outline" size="sm">
          <Link to={`/coupons/${coupon.id}#usage-history`} className="inline-flex items-center gap-2">
            <History className="h-4 w-4" />
            Usages
          </Link>
        </Button>
      ) : null}
      {tab === 'active' && canUpdate ? (
        <Button variant="outline" size="sm">
          <Link to={`/coupons/${coupon.id}/edit`} className="inline-flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit
          </Link>
        </Button>
      ) : null}
      {tab === 'active' && canDelete ? (
        <Button variant="ghost" size="icon" onClick={() => onDelete(coupon)} aria-label="Deactivate coupon">
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

export function CouponsPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const canCreate = hasPermission(session?.perms, 'coupons', 'create');
  const canRead = hasPermission(session?.perms, 'coupons', 'read');
  const canUpdate = hasPermission(session?.perms, 'coupons', 'update');
  const canDelete = hasPermission(session?.perms, 'coupons', 'delete');
  const [tab, setTab] = useState<CouponTab>('active');
  const [search, setSearch] = useState('');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  async function load(targetPage = page, activeTab = tab, activeSearch = search) {
    setLoading(true);
    try {
      const result = await api.listCoupons({
        tab: activeTab,
        search: activeSearch,
        page: targetPage,
        size: 9,
      });
      setCoupons(result.content ?? []);
      setPage(result.number ?? targetPage);
      setTotalPages(result.totalPages ?? 0);
      setTotalElements(result.totalElements ?? result.content?.length ?? 0);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load coupons.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function deleteCoupon(coupon: Coupon) {
    const confirmed = await confirm({
      title: 'Deactivate coupon?',
      description: `"${coupon.code}" will move to the deactivated tab and cannot be used for new bookings.`,
      confirmLabel: 'Deactivate coupon',
    });
    if (!confirmed) return;
    try {
      await api.deleteCoupon(coupon.id);
      showToast('Coupon deactivated.', 'success');
      await load(page, tab, search);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to deactivate coupon.', 'error');
    }
  }

  useEffect(() => {
    if (!canRead) return;
    const timeout = window.setTimeout(() => void load(0, tab, search), 250);
    return () => window.clearTimeout(timeout);
  }, [canRead, tab, search]);

  const columns = useMemo<Array<DataTableColumn<Coupon>>>(
    () => [
      {
        key: 'code',
        header: 'Code',
        render: (row) => (
          <div>
            <p className="font-mono font-medium">{row.code}</p>
            <p className="text-xs text-muted-foreground">{row.title}</p>
          </div>
        ),
      },
      {
        key: 'couponType',
        header: 'Type',
        render: (row) => (
          <Badge tone={couponTypeTone(row.couponType)}>{optionLabel(couponTypeOptions, row.couponType)}</Badge>
        ),
      },
      { key: 'hotelName', header: 'Hotel', render: (row) => row.hotelName || 'All hotels' },
      {
        key: 'discount',
        header: 'Discount',
        render: (row) => formatCouponDiscount(row),
      },
      {
        key: 'usageCount',
        header: 'Used',
        numeric: true,
        render: (row) =>
          row.totalUsageLimit
            ? `${row.usageCount ?? 0} / ${row.totalUsageLimit}`
            : String(row.usageCount ?? 0),
      },
      {
        key: 'expiryDate',
        header: 'Valid until',
        render: (row) => formatCouponDate(row.expiryDate),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        render: (row) => (
          <CouponActions
            coupon={row}
            tab={tab}
            canRead={canRead}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onDelete={(item) => void deleteCoupon(item)}
          />
        ),
      },
    ],
    [tab, canRead, canUpdate, canDelete],
  );

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

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageToolbar
        title="Coupons"
        description="Create discount codes with expiry dates, usage limits, and track redemptions per booking."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="primary" size="sm" disabled={!canCreate}>
              <Link to="/coupons/new" className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add coupon
              </Link>
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-gold-500" />
              <CardTitle className="text-base">Promo codes</CardTitle>
            </div>
            {!loading ? (
              <p className="text-sm text-muted-foreground">
                {totalElements} {tabLabels[tab].toLowerCase()} coupon{totalElements === 1 ? '' : 's'}
                {search ? ` matching "${search}"` : ''}
              </p>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex rounded-xl border border-border bg-muted/30 p-1">
              {(['active', 'deactivated'] as CouponTab[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    'rounded-lg px-4 py-2 text-sm font-medium transition-all',
                    tab === value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => {
                    setTab(value);
                    setPage(0);
                  }}
                >
                  {tabLabels[value]}
                </button>
              ))}
            </div>
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                className={cn(filterControlClass, 'pl-9')}
                placeholder="Search by code or title"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
              />
            </div>
          </div>

          <ResponsiveList
            columns={columns}
            data={coupons}
            isLoading={loading}
            emptyState={
              <EmptyState
                label={
                  search
                    ? `No ${tab} coupons match your search.`
                    : tab === 'active'
                      ? 'No active coupons yet. Create your first promo code.'
                      : 'No deactivated coupons found.'
                }
              />
            }
            renderMobileCard={(coupon) => {
              const expiryStatus = tab === 'active' ? couponExpiryStatus(coupon) : null;
              return (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="truncate font-mono font-semibold">{coupon.code}</p>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1">
                      <Badge tone={couponTypeTone(coupon.couponType)}>
                        {optionLabel(couponTypeOptions, coupon.couponType)}
                      </Badge>
                      {tab === 'deactivated' ? <Badge tone="neutral">Deactivated</Badge> : null}
                      {expiryStatus === 'expiring-soon' ? <Badge tone="warning">Expires soon</Badge> : null}
                      {expiryStatus === 'expired' ? <Badge tone="danger">Expired</Badge> : null}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-y-1 text-sm">
                    <span className="text-muted-foreground">Title</span>
                    <span className="text-foreground">{coupon.title}</span>
                    <span className="text-muted-foreground">Hotel</span>
                    <span className="text-foreground">{coupon.hotelName || 'All hotels'}</span>
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-foreground">{formatCouponDiscount(coupon)}</span>
                    <span className="text-muted-foreground">Used</span>
                    <span className="text-foreground">
                      {coupon.totalUsageLimit
                        ? `${coupon.usageCount ?? 0} / ${coupon.totalUsageLimit}`
                        : String(coupon.usageCount ?? 0)}
                    </span>
                    <span className="text-muted-foreground">Valid until</span>
                    <span className="text-foreground">{formatCouponDate(coupon.expiryDate)}</span>
                    {coupon.minBookingAmount != null && coupon.minBookingAmount > 0 ? (
                      <>
                        <span className="text-muted-foreground">Min booking</span>
                        <span className="text-foreground">{formatCouponCurrency(coupon.minBookingAmount)}</span>
                      </>
                    ) : null}
                  </div>
                  <CouponActions
                    coupon={coupon}
                    tab={tab}
                    canRead={canRead}
                    canUpdate={canUpdate}
                    canDelete={canDelete}
                    onDelete={(item) => void deleteCoupon(item)}
                  />
                </div>
              );
            }}
          />

          <Pagination page={page} totalPages={totalPages} loading={loading} onPageChange={(next) => void load(next)} />
        </CardContent>
      </Card>
    </div>
  );
}
