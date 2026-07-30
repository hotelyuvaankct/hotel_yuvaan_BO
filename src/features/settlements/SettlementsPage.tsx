import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Landmark,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { SettlementDashboard, SettlementListItem } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { settlementStatusTone } from '@/lib/enums';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { Pagination } from '@/components/common/pagination';
import { SelectField, TextField } from '@/components/ui/form-fields';
import { ResponsiveList } from '@/components/ui/responsive-list';
import type { DataTableColumn } from '@/components/ui/data-table';

function isInstant(kind?: string) {
  return (kind ?? '').toUpperCase() === 'INSTANT';
}

function SettlementLedgerCard({ row }: { row: SettlementListItem }) {
  const instant = isInstant(row.kind);
  const TypeIcon = instant ? Zap : Landmark;
  const fees = (row.fees ?? 0) + (row.tax ?? 0);

  return (
    <div className="flex min-w-0 items-start gap-3">
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          instant ? 'bg-warning/15 text-warning' : 'bg-success/10 text-success',
        )}
        aria-hidden
      >
        <TypeIcon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {row.kind || 'SETTLE'}
          </p>
          <Badge tone={settlementStatusTone(row.status)} className="shrink-0">
            {row.status}
          </Badge>
        </div>

        <div>
          <p className="text-lg font-semibold tabular-nums tracking-tight text-foreground">
            {formatCurrency(row.amount)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {formatDateTime(row.gatewayCreatedAt)}
          </p>
        </div>

        <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>Net {formatCurrency(row.netAmount)}</span>
          <span aria-hidden>·</span>
          <span>Fees {formatCurrency(fees)}</span>
        </div>

        {row.utr ? (
          <p className="truncate font-mono text-[11px] text-muted-foreground">UTR {row.utr}</p>
        ) : null}
        <p className="truncate font-mono text-[11px] text-muted-foreground">
          {row.gatewaySettlementId}
        </p>
      </div>
    </div>
  );
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
  const [totalElements, setTotalElements] = useState(0);
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
      setTotalElements(list.totalElements ?? 0);
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
        key: 'amount',
        header: 'Amount',
        render: (row) => {
          const instant = isInstant(row.kind);
          const TypeIcon = instant ? Zap : Landmark;
          return (
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                  instant ? 'bg-warning/15 text-warning' : 'bg-success/10 text-success',
                )}
              >
                <TypeIcon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold tabular-nums">{formatCurrency(row.amount)}</p>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {row.kind || '—'}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => <Badge tone={settlementStatusTone(row.status)}>{row.status}</Badge>,
      },
      {
        key: 'netAmount',
        header: 'Net',
        numeric: true,
        render: (row) => (
          <span className="tabular-nums text-sm">{formatCurrency(row.netAmount)}</span>
        ),
      },
      {
        key: 'fees',
        header: 'Fees+Tax',
        numeric: true,
        render: (row) => (
          <span className="tabular-nums text-sm text-muted-foreground">
            {formatCurrency((row.fees ?? 0) + (row.tax ?? 0))}
          </span>
        ),
      },
      {
        key: 'utr',
        header: 'UTR',
        render: (row) => (
          <span className="font-mono text-xs text-muted-foreground">{row.utr || '—'}</span>
        ),
      },
      {
        key: 'gatewayCreatedAt',
        header: 'When',
        render: (row) => (
          <span className="tabular-nums text-sm text-muted-foreground">
            {formatDateTime(row.gatewayCreatedAt)}
          </span>
        ),
      },
      {
        key: 'gatewaySettlementId',
        header: 'Gateway id',
        render: (row) => (
          <span className="font-mono text-xs text-muted-foreground">{row.gatewaySettlementId}</span>
        ),
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

  const instantEnabled = dashboard?.instantSettlementsEnabled === true;
  const settleDisabled =
    !canSettle || !instantEnabled || (dashboard?.inFlightInstantCount ?? 0) > 0 || settling;

  const kpiCards = [
    {
      label: 'Settled',
      value: formatCurrency(dashboard?.settledAmount),
      sub: `${dashboard?.processedCount ?? 0} processed`,
      tone: 'in' as const,
    },
    {
      label: 'Pending',
      value: formatCurrency(dashboard?.pendingUnsettledEstimate),
      sub: dashboard?.pendingNote || 'Estimate',
      tone: 'neutral' as const,
    },
    {
      label: 'Failed',
      value: String(dashboard?.failedCount ?? 0),
      sub: `In-flight: ${dashboard?.inFlightInstantCount ?? 0}`,
      tone: 'out' as const,
    },
    {
      label: 'Last sync',
      value: dashboard?.lastSyncedAt ? formatDateTime(dashboard.lastSyncedAt) : '—',
      sub: instantEnabled ? 'Instant enabled' : 'Instant off / unknown',
      tone: 'warn' as const,
    },
  ];

  return (
    <div className="min-w-0 space-y-5 animate-fade-in-up">
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>Settlements</CardTitle>
            <CardDescription>
              {totalElements} ledger entr{totalElements === 1 ? 'y' : 'ies'} · Razorpay → bank
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 px-0 sm:w-auto sm:px-3"
              aria-label="Refresh"
              onClick={() => void load()}
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="h-9 w-9 px-0 sm:w-auto sm:px-3"
              aria-label="Settle now"
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
              <span className="hidden sm:inline">Settle now</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="min-w-0 space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
            {kpiCards.map((card) => (
              <div
                key={card.label}
                className="min-w-0 rounded-lg border border-border bg-background px-3 py-2.5"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {card.label}
                </p>
                <p
                  className={cn(
                    'mt-1 text-base font-semibold tabular-nums tracking-tight sm:text-lg',
                    card.tone === 'in' && 'text-success',
                    card.tone === 'out' && 'text-destructive',
                    card.tone === 'warn' && 'text-foreground',
                    card.tone === 'neutral' && 'text-foreground',
                  )}
                >
                  {card.value}
                </p>
                {card.sub ? (
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{card.sub}</p>
                ) : null}
              </div>
            ))}
          </div>

          {dashboard?.lastSyncError ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {dashboard.lastSyncError}
            </div>
          ) : null}

          {!instantEnabled ? (
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground">
              Instant Settlements is not enabled on this Razorpay account. Recon still syncs from the
              backend. Enable Instant Settlements in Razorpay and subscribe to{' '}
              <code className="text-xs">settlement.processed</code> /{' '}
              <code className="text-xs">settlement.failed</code>.
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {[
              { value: '', label: 'All' },
              { value: 'STANDARD', label: 'Standard' },
              { value: 'INSTANT', label: 'Instant' },
            ].map((chip) => (
              <button
                key={chip.value || 'all'}
                type="button"
                onClick={() => setKind(chip.value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                  kind === chip.value
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:text-foreground',
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <SelectField
            variant="filter"
            label="Status"
            wrapperClassName="max-w-xs"
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

          <ResponsiveList
            columns={columns}
            data={rows}
            isLoading={loading}
            onRowClick={(row) => openDetail(row.id)}
            emptyState={
              <EmptyState label="No settlements yet. Recon syncs automatically from the backend." />
            }
            renderMobileCard={(row) => <SettlementLedgerCard row={row} />}
          />

          <Pagination
            page={page}
            totalPages={totalPages}
            loading={loading}
            onPageChange={(next) => void load(next)}
          />
        </CardContent>
      </Card>

      <BottomSheet isOpen={settleOpen} onClose={() => !settling && setSettleOpen(false)}>
        <BottomSheet.Header title="Settle now" />
        <BottomSheet.Body className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Instant Settlement fees apply. Description max 30 characters.
          </p>
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
        </BottomSheet.Body>
        <BottomSheet.Footer className="justify-stretch gap-2 sm:justify-end">
          <Button
            variant="outline"
            className="flex-1 sm:flex-none"
            disabled={settling}
            onClick={() => setSettleOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            className="flex-1 sm:flex-none"
            disabled={settling}
            isLoading={settling}
            onClick={() => void submitInstantSettle()}
          >
            Confirm settle
          </Button>
        </BottomSheet.Footer>
      </BottomSheet>
    </div>
  );
}
