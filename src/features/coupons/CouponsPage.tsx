import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, RefreshCw, Search, Tag } from 'lucide-react';
import { api } from '@/lib/api';
import type { Coupon } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingState } from '@/components/common/loading-state';
import { Pagination } from '@/components/common/pagination';
import { filterControlClass } from '@/components/ui/form-fields';
import { CouponListCard } from '@/features/coupons/components/coupon-list-card';
import { cn } from '@/lib/utils';

type CouponTab = 'active' | 'deactivated';

const tabLabels: Record<CouponTab, string> = {
  active: 'Active',
  deactivated: 'Deactivated',
};

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
    <div className="min-w-0 space-y-6 animate-fade-in-up">
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="flex-col items-stretch gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div>
            <CardTitle>Coupons</CardTitle>
            <CardDescription className="hidden sm:block">
              Create discount codes with expiry dates, usage limits, and track redemptions per booking.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="h-9 w-9 px-0 sm:w-auto sm:px-3" aria-label="Refresh" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="primary" size="sm" className="h-9 w-9 px-0 sm:w-auto sm:px-3" aria-label="Add coupon" disabled={!canCreate}>
              <Link to="/coupons/new" className="inline-flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add coupon</span>
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
            <div className="min-w-0 space-y-1.5">
              <p className="text-sm font-medium text-foreground">Status</p>
              <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex shrink-0 rounded-xl border border-border bg-muted/30 p-1">
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
                  {!loading ? (
                    <p className="inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground">
                      <Tag className="h-3.5 w-3.5" />
                      {totalElements} {tabLabels[tab].toLowerCase()} coupon
                      {totalElements === 1 ? '' : 's'}
                      {search ? ` matching "${search}"` : ''}
                    </p>
                  ) : null}
              </div>
            </div>

            <div className="w-full space-y-1.5 lg:max-w-sm lg:shrink-0">
              <label className="block text-sm font-medium text-foreground" htmlFor="coupon-search">
                Search
              </label>
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="coupon-search"
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
          </div>

          {loading ? <LoadingState label="Loading coupons..." /> : null}

          {!loading && coupons.length === 0 ? (
            <EmptyState
              label={
                search
                  ? `No ${tab} coupons match your search.`
                  : tab === 'active'
                    ? 'No active coupons yet. Create your first promo code.'
                    : 'No deactivated coupons found.'
              }
            />
          ) : null}

          {!loading && coupons.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {coupons.map((coupon) => (
                <CouponListCard
                  key={coupon.id}
                  coupon={coupon}
                  tab={tab}
                  canRead={canRead}
                  canUpdate={canUpdate}
                  canDelete={canDelete}
                  onDelete={(item) => void deleteCoupon(item)}
                />
              ))}
            </div>
          ) : null}

          <Pagination
            page={page}
            totalPages={totalPages}
            loading={loading}
            onPageChange={(next) => void load(next)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
