import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Landmark } from 'lucide-react';
import { api } from '@/lib/api';
import type {
  SettlementDashboard,
  SettlementListItem,
} from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { FullPageLoader } from '@/components/common/loading-state';
import { Pagination } from '@/components/common/pagination';
import { SelectField, TextField } from '@/components/ui/form-fields';
import { ResponsiveList } from '@/components/ui/responsive-list';
import type { DataTableColumn } from '@/components/ui/data-table';

function formatCurrency(value?: number) {
  if (value == null) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function statusTone(status?: string): BadgeTone {
  const s = (status || '').toUpperCase();
  if (s === 'PROCESSED') return 'success';
  if (s === 'FAILED' || s === 'REVERSED') return 'danger';
  if (s === 'INITIATED' || s === 'PARTIALLY_PROCESSED' || s === 'CREATED') return 'warning';
  return 'neutral';
}

export function SettlementsPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const canRead = hasPermission(session?.perms, 'settlements', 'read');
  const canSettle = hasPermission(session?.perms, 'settlements', 'create');

  const [dashboard, setDashboard] = useState<SettlementDashboard | null>(null);
  const [rows, setRows] = useState<SettlementListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleFull, setSettleFull] = useState(true);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleDescription, setSettleDescription] = useState('');
  const [settling, setSettling] = useState(false);

  async function load(targetPage = page) {
    setLoading(true);
    try {
      const [dash, list] = await Promise.all([
        api.getSettlementDashboard(),
        api.listSettlements({
          page: targetPage,
          size: 20,
          kind: kind || undefined,
          status: status || undefined,
        }),
      ]);
      setDashboard(dash);
      setRows(list.content ?? []);
      setPage(list.number ?? targetPage);
      setTotalPages(list.totalPages ?? 0);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load settlements.', 'error');
    } finally {
      setLoading(false);
    }
  }

  function openDetail(id: number) {
    navigate(`/settlements/${id}`);
  }

  async function submitInstantSettle() {
    const confirmed = await confirm({
      title: settleFull ? 'Settle full available balance?' : 'Trigger Instant Settlement?',
      description:
        'Razorpay charges Instant Settlement fees + tax. PROCESSED means bank transfer initiated — match the UTR in your bank within a few hours.',
      confirmLabel: 'Settle now',
    });
    if (!confirmed) return;

    setSettling(true);
    try {
      const amount = settleFull ? undefined : Number(settleAmount);
      if (!settleFull && (!Number.isFinite(amount) || (amount ?? 0) < 1)) {
        showToast('Enter an amount of at least ₹1.', 'error');
        return;
      }
      const idempotencyKey =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `settle-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const created = await api.createInstantSettlement(
        {
          settleFullBalance: settleFull,
          amount,
          description: settleDescription.trim() || undefined,
        },
        idempotencyKey,
      );
      showToast(`Instant settlement ${created.gatewaySettlementId} created.`, 'success');
      setSettleOpen(false);
      setSettleAmount('');
      setSettleDescription('');
      await load(0);
      navigate(`/settlements/${created.id}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Instant settlement failed.', 'error');
    } finally {
      setSettling(false);
    }
  }

  useEffect(() => {
    if (!canRead) return;
    const timeout = window.setTimeout(() => void load(0), 200);
    return () => window.clearTimeout(timeout);
  }, [canRead, kind, status]);

  const columns = useMemo<Array<DataTableColumn<SettlementListItem>>>(
    () => [
      {
        key: 'gatewayCreatedAt',
        header: 'Created',
        render: (row) => formatDateTime(row.gatewayCreatedAt),
      },
      { key: 'kind', header: 'Kind' },
      {
        key: 'status',
        header: 'Status',
        render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge>,
      },
      {
        key: 'amount',
        header: 'Amount',
        numeric: true,
        render: (row) => <span className="font-medium">{formatCurrency(row.amount)}</span>,
      },
      {
        key: 'fees',
        header: 'Fees+Tax',
        numeric: true,
        render: (row) => formatCurrency((row.fees ?? 0) + (row.tax ?? 0)),
      },
      {
        key: 'utr',
        header: 'UTR',
        render: (row) => <span className="font-mono text-xs">{row.utr || '-'}</span>,
      },
      {
        key: 'gatewaySettlementId',
        header: 'Id',
        render: (row) => <span className="font-mono text-xs">{row.gatewaySettlementId}</span>,
      },
    ],
    [],
  );

  if (!canRead) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>Your role does not include Settlements read access.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) {
    return <FullPageLoader label="Loading settlements..." />;
  }

  const instantEnabled = dashboard?.instantSettlementsEnabled === true;
  const settleDisabled =
    !canSettle || !instantEnabled || (dashboard?.inFlightInstantCount ?? 0) > 0 || settling;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Settlements</CardTitle>
            <CardDescription>
              Razorpay → bank settlements. Recon syncs automatically from the backend. Review UTRs and
              trigger Instant Settlements when enabled.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              disabled={settleDisabled}
              onClick={() => setSettleOpen(true)}
              title={
                !canSettle
                  ? 'Missing create permission'
                  : !instantEnabled
                    ? 'Enable Instant Settlements in Razorpay Dashboard'
                    : (dashboard?.inFlightInstantCount ?? 0) > 0
                      ? 'Another Instant Settlement is in progress'
                      : undefined
              }
            >
              <Landmark className="h-4 w-4" />
              Settle now
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">Settled (processed)</p>
              <p className="mt-1 text-xl font-semibold">{formatCurrency(dashboard?.settledAmount)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {dashboard?.processedCount ?? 0} processed batches
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">Pending (estimate)</p>
              <p className="mt-1 text-xl font-semibold">
                {formatCurrency(dashboard?.pendingUnsettledEstimate)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{dashboard?.pendingNote}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">Last sync</p>
              <p className="mt-1 text-base font-semibold">{formatDateTime(dashboard?.lastSyncedAt)}</p>
              {dashboard?.lastSyncError ? (
                <p className="mt-1 text-xs text-destructive">{dashboard.lastSyncError}</p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Instant Settlements: {instantEnabled ? 'enabled' : 'not enabled / unknown'}
                </p>
              )}
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">Failed / reversed</p>
              <p className="mt-1 text-xl font-semibold">{dashboard?.failedCount ?? 0}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                In-flight Instant: {dashboard?.inFlightInstantCount ?? 0}
              </p>
            </div>
          </div>

          {!instantEnabled ? (
            <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              Instant Settlements is not enabled on this Razorpay account (or not yet probed). Settlement
              recon still syncs automatically from the backend. Enable Instant Settlements in the Razorpay
              Dashboard. Also subscribe webhook events <code>settlement.processed</code> /{' '}
              <code>settlement.failed</code>.
            </div>
          ) : null}

          {settleOpen ? (
            <div className="space-y-4 rounded-xl border border-border p-4">
              <div>
                <p className="text-base font-semibold">Settle now</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Instant Settlement fees apply. Description max 30 characters. Use Idempotency
                  automatically.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settleFull}
                  onChange={(e) => setSettleFull(e.target.checked)}
                />
                Settle full available balance
              </label>
              {!settleFull ? (
                <TextField
                  label="Amount (INR)"
                  type="number"
                  min={1}
                  step="0.01"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                />
              ) : null}
              <TextField
                label="Description"
                maxLength={30}
                value={settleDescription}
                onChange={(e) => setSettleDescription(e.target.value)}
                placeholder="Optional note"
              />
              <div className="flex gap-2">
                <Button variant="primary" disabled={settling} onClick={() => void submitInstantSettle()}>
                  Confirm settle
                </Button>
                <Button variant="outline" disabled={settling} onClick={() => setSettleOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}

          <div className="space-y-4">
            <p className="text-base font-semibold">Settlement history</p>
            <div className="grid gap-3 md:grid-cols-2">
              <SelectField
                label="Kind"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                placeholder="All kinds"
                options={[
                  { value: 'STANDARD', label: 'Standard' },
                  { value: 'INSTANT', label: 'Instant' },
                ]}
              />
              <SelectField
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="All statuses"
                options={[
                  { value: 'PROCESSED', label: 'Processed' },
                  { value: 'CREATED', label: 'Created' },
                  { value: 'INITIATED', label: 'Initiated' },
                  { value: 'FAILED', label: 'Failed' },
                  { value: 'REVERSED', label: 'Reversed' },
                ]}
              />
            </div>

            <ResponsiveList
              columns={columns}
              data={rows}
              onRowClick={(row) => openDetail(row.id)}
              emptyState={
                <EmptyState label="No settlements yet. Recon syncs automatically from the backend." />
              }
              renderMobileCard={(row) => (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="truncate font-mono text-sm font-semibold">{row.gatewaySettlementId}</p>
                    <Badge tone={statusTone(row.status)} className="shrink-0">
                      {row.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-y-1 text-sm">
                    <span className="text-muted-foreground">Created</span>
                    <span className="text-foreground">{formatDateTime(row.gatewayCreatedAt)}</span>
                    <span className="text-muted-foreground">Kind</span>
                    <span className="text-foreground">{row.kind}</span>
                    <span className="text-muted-foreground">Amount</span>
                    <span className="text-foreground">{formatCurrency(row.amount)}</span>
                    <span className="text-muted-foreground">Fees+Tax</span>
                    <span className="text-foreground">
                      {formatCurrency((row.fees ?? 0) + (row.tax ?? 0))}
                    </span>
                    <span className="text-muted-foreground">UTR</span>
                    <span className="font-mono text-xs text-foreground">{row.utr || '-'}</span>
                  </div>
                </div>
              )}
            />

            <Pagination
              page={page}
              totalPages={totalPages}
              loading={false}
              onPageChange={(next) => void load(next)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
