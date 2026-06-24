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
import { CouponListCard } from '@/components/coupons/coupon-list-card';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingState } from '@/components/common/loading-state';
import { PageToolbar } from '@/components/common/page-toolbar';
import { Pagination } from '@/components/common/pagination';
import { filterControlClass } from '@/components/ui/form-fields';
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
            <Button variant="gold" size="sm" disabled={!canCreate} asChild>
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

          <div className="space-y-4">
            {loading ? <LoadingState /> : null}
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
              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
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
          </div>

          <Pagination page={page} totalPages={totalPages} loading={loading} onPageChange={(next) => void load(next)} />
        </CardContent>
      </Card>
    </div>
  );
}
