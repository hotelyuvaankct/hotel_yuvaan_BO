import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Landmark,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { SettlementDetail, SettlementItem } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { settlementStatusTone } from '@/lib/enums';
import { formatCurrency, formatDate, formatDateTime, formatTimeOnly } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { useBreadcrumbLabel } from '@/components/common/breadcrumb-labels';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CopyableRow, CopyIconButton } from '@/components/ui/copyable';
import { SoftFact } from '@/components/ui/soft-fact';
import { StatusTimeline } from '@/components/ui/status-timeline';
import { EmptyState } from '@/components/common/empty-state';
import { FullPageLoader } from '@/components/common/loading-state';

function isInstant(kind?: string) {
  return (kind ?? '').toUpperCase() === 'INSTANT';
}

function isProcessed(status?: string) {
  return (status ?? '').toUpperCase() === 'PROCESSED';
}

function MetaCell({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 border-b border-border/70 py-3 last:border-0 sm:border-b-0 sm:border-r sm:px-4 sm:py-0 sm:last:border-r-0 sm:first:pl-0 sm:last:pr-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function ReconLineCard({ item }: { item: SettlementItem }) {
  const isPayment = (item.entityType ?? '').toUpperCase() === 'PAYMENT';
  const TypeIcon = isPayment ? ArrowUpRight : ArrowDownLeft;
  const href =
    isPayment && item.paymentId != null
      ? `/transactions/PAYMENT-${item.paymentId}`
      : item.refundId != null
        ? `/transactions/REFUND-${item.refundId}`
        : null;

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
              isPayment ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive',
            )}
          >
            <TypeIcon className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {item.entityType || 'Line'}
            </p>
            <p className="truncate font-mono text-xs text-foreground">{item.entityId}</p>
          </div>
        </div>
        {item.settled ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Settled{item.onHold ? ' (hold)' : ''}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <Circle className="h-3.5 w-3.5" />
            Open{item.onHold ? ' (hold)' : ''}
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Credit</p>
          <p className="font-medium tabular-nums text-success">{formatCurrency(item.credit)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Debit</p>
          <p className="font-medium tabular-nums text-destructive">{formatCurrency(item.debit)}</p>
        </div>
      </div>

      {item.bookingId ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Booking{' '}
          <Link
            to={`/bookings/${item.bookingId}`}
            className="font-medium text-brand hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {item.bookingCode || item.bookingId}
          </Link>
        </p>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        to={href}
        className="block min-w-0 rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md"
      >
        {body}
      </Link>
    );
  }

  return (
    <div className="min-w-0 rounded-xl border border-border bg-card p-4">{body}</div>
  );
}

export function SettlementViewPage() {
  const { id } = useParams();
  const settlementId = Number(id);
  const { session } = useAuth();
  const { showToast } = useToast();
  const canRead = hasPermission(session?.perms, 'settlements', 'read');

  const [settlement, setSettlement] = useState<SettlementDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const crumbLabel = settlement?.gatewaySettlementId || (id ? `SETTLE-${id}` : null);
  const crumbPath = id ? `/settlements/${id}` : undefined;
  useBreadcrumbLabel(crumbPath, crumbLabel);
  useBreadcrumbLabel(id, crumbLabel);

  useEffect(() => {
    async function load() {
      if (!canRead || !Number.isFinite(settlementId) || settlementId <= 0) return;
      setLoading(true);
      try {
        setSettlement(await api.getSettlement(settlementId));
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Unable to load settlement.', 'error');
        setSettlement(null);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [canRead, settlementId, showToast]);

  const timeline = useMemo(() => {
    if (!settlement) return [];
    return [
      { key: 'created', label: 'Created', at: settlement.gatewayCreatedAt },
      { key: 'synced', label: 'Last synced', at: settlement.lastSyncedAt },
    ]
      .filter((step): step is { key: string; label: string; at: string } => Boolean(step.at))
      .map((step) => ({
        key: step.key,
        label: step.label,
        date: formatDate(step.at),
        time: formatTimeOnly(step.at),
      }));
  }, [settlement]);

  if (!canRead) {
    return <EmptyState label="You do not have permission to view settlements." />;
  }

  if (loading) {
    return <FullPageLoader label="Loading settlement…" />;
  }

  if (!settlement) {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <Card>
          <CardHeader>
            <CardTitle>Settlement</CardTitle>
            <CardDescription>Settlement details</CardDescription>
          </CardHeader>
          <div className="p-6">
            <EmptyState label="Settlement not found." />
          </div>
        </Card>
      </div>
    );
  }

  const instant = isInstant(settlement.kind);
  const processed = isProcessed(settlement.status);
  const TypeIcon = instant ? Zap : Landmark;
  const items = settlement.items ?? [];

  return (
    <div className="min-w-0 space-y-4 animate-fade-in-up">
      <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
        <div
          className={cn(
            'flex items-center gap-2 border-b border-border px-4 py-2.5 sm:px-5',
            processed ? 'bg-success/5' : 'bg-muted/30',
          )}
        >
          <TypeIcon className={cn('h-4 w-4', processed ? 'text-success' : 'text-muted-foreground')} />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {settlement.kind} · SETTLE
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Badge tone={settlementStatusTone(settlement.status)}>{settlement.status}</Badge>
            {processed ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Bank credit initiated
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                <Circle className="h-3.5 w-3.5" />
                Not processed
              </span>
            )}
          </div>
        </div>

        <div className="px-4 py-5 sm:px-5 sm:py-6">
          <p className="text-3xl font-semibold tracking-tight tabular-nums text-foreground sm:text-4xl">
            {formatCurrency(settlement.amount)}
            <span className="ml-2 text-sm font-medium text-muted-foreground">
              {settlement.currency || 'INR'}
            </span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
              {settlement.gatewaySettlementId}
            </code>
            <CopyIconButton value={settlement.gatewaySettlementId} label="Copy settlement id" />
          </div>
        </div>

        <div className="grid gap-0 border-t border-border px-4 py-3 sm:grid-cols-4 sm:px-5 sm:py-4">
          <MetaCell label="Net" value={formatCurrency(settlement.netAmount)} />
          <MetaCell label="Fees" value={formatCurrency(settlement.fees)} />
          <MetaCell label="Tax" value={formatCurrency(settlement.tax)} />
          <MetaCell label="Lines" value={String(items.length)} />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Bank references
          </h2>
          <div className="mt-2">
            <CopyableRow label="Settlement" value={settlement.gatewaySettlementId} />
            <CopyableRow label="UTR" value={settlement.utr} />
            <CopyableRow label="Local id" value={String(settlement.id)} />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SoftFact
              label="Amount requested"
              value={formatCurrency(settlement.amountRequested ?? settlement.amount)}
            />
            <SoftFact
              label="Amount settled"
              value={formatCurrency(settlement.amountSettled)}
              highlight
            />
            <SoftFact label="Pending" value={formatCurrency(settlement.amountPending)} />
            <SoftFact label="Reversed" value={formatCurrency(settlement.amountReversed)} />
          </div>

          {settlement.description ? (
            <div className="mt-4 rounded-xl bg-muted/40 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Description
              </p>
              <p className="mt-0.5 text-sm text-foreground">{settlement.description}</p>
            </div>
          ) : null}

          {settlement.bankCreditNote ? (
            <p className="mt-3 text-sm text-muted-foreground">{settlement.bankCreditNote}</p>
          ) : null}
        </section>

        <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Timeline
          </h2>
          <StatusTimeline className="mt-4" steps={timeline} />
        </section>
      </div>

      <section className="min-w-0 space-y-3">
        <div className="px-0.5">
          <h2 className="text-base font-semibold text-foreground">Recon line items</h2>
          <p className="text-xs text-muted-foreground">
            {items.length === 0
              ? 'No payments or refunds in this batch yet'
              : `${items.length} payment/refund line${items.length === 1 ? '' : 's'}`}
          </p>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-6">
            <EmptyState label="No recon line items yet." />
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <li key={item.id}>
                <ReconLineCard item={item} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
