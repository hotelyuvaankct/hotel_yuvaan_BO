import { useEffect, useMemo, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  ExternalLink,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { TransactionDetail } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
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
import { useState } from 'react';
import { isRefundTransaction, paymentStatusTone } from '@/lib/enums';

function MetaCell({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 border-b border-border/70 py-3 last:border-0 sm:border-b-0 sm:border-r sm:px-4 sm:py-0 sm:last:border-r-0 sm:first:pl-0 sm:last:pr-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

export function TransactionViewPage() {
  const { id } = useParams();
  const { session } = useAuth();
  const { showToast } = useToast();
  const canRead = hasPermission(session?.perms, 'payments', 'read');

  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const crumbLabel = (() => {
    if (!transaction) return null;
    const rawId = transaction.id?.trim();
    if (rawId && !/^HYV/i.test(rawId)) return rawId;
    if (transaction.type && transaction.sourceId != null) {
      return `${transaction.type}-${transaction.sourceId}`;
    }
    return transaction.type || 'Transaction';
  })();
  const crumbPath = id ? `/transactions/${id}` : undefined;
  useBreadcrumbLabel(crumbPath, crumbLabel);
  useBreadcrumbLabel(id, crumbLabel);

  useEffect(() => {
    async function load() {
      if (!canRead || !id) return;
      setLoading(true);
      try {
        setTransaction(await api.getTransaction(id));
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Unable to load transaction.', 'error');
        setTransaction(null);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [canRead, id, showToast]);

  const timeline = useMemo(() => {
    if (!transaction) return [];
    return [
      { key: 'created', label: 'Created', at: transaction.createdAt },
      { key: 'initiated', label: 'Initiated', at: transaction.initiatedAt },
      { key: 'paid', label: 'Paid', at: transaction.paidAt },
      { key: 'completed', label: 'Completed', at: transaction.completedAt },
      { key: 'occurred', label: 'Occurred', at: transaction.occurredAt },
    ]
      .filter((step): step is { key: string; label: string; at: string } => Boolean(step.at))
      .map((step) => ({
        key: step.key,
        label: step.label,
        date: formatDate(step.at),
        time: formatTimeOnly(step.at),
      }));
  }, [transaction]);

  if (!canRead) {
    return <EmptyState label="You do not have permission to view transactions." />;
  }

  if (loading) {
    return <FullPageLoader label="Loading transaction…" />;
  }

  if (!transaction) {
    return (
      <div className="space-y-4 animate-fade-in-up">
        <Card>
          <CardHeader>
            <CardTitle>Transaction</CardTitle>
            <CardDescription>Transaction details</CardDescription>
          </CardHeader>
          <div className="p-6">
            <EmptyState label="Transaction not found." />
          </div>
        </Card>
      </div>
    );
  }

  const refund = isRefundTransaction(transaction.type);
  const TypeIcon = refund ? ArrowDownLeft : ArrowUpRight;
  const money = transaction.bookingMoney;
  const hasGatewayIds = Boolean(
    transaction.gatewayPaymentId ||
      transaction.gatewayOrderId ||
      transaction.gatewayRefundId ||
      transaction.gatewaySettlementId ||
      transaction.paymentId != null ||
      transaction.receipt,
  );

  return (
    <div className="min-w-0 space-y-4 animate-fade-in-up">
      <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
        <div
          className={cn(
            'flex items-center gap-2 border-b border-border px-4 py-2.5 sm:px-5',
            refund ? 'bg-destructive/5' : 'bg-success/5',
          )}
        >
          <TypeIcon className={cn('h-4 w-4', refund ? 'text-destructive' : 'text-success')} />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {transaction.type} · TRX
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Badge tone={paymentStatusTone(transaction.statusLabel)}>
              {transaction.statusLabel || '—'}
            </Badge>
            {transaction.settled ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Settled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                <Circle className="h-3.5 w-3.5" />
                Unsettled
              </span>
            )}
          </div>
        </div>

        <div className="px-4 py-5 sm:px-5 sm:py-6">
          <p
            className={cn(
              'text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl',
              refund ? 'text-destructive' : 'text-foreground',
            )}
          >
            {refund ? '−' : '+'}
            {formatCurrency(transaction.amount)}
            <span className="ml-2 text-sm font-medium text-muted-foreground">
              {transaction.currency || 'INR'}
            </span>
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
              {transaction.id}
            </code>
            <CopyIconButton value={transaction.id} label="Copy transaction id" />
          </div>
        </div>

        <div className="grid gap-0 border-t border-border px-4 py-3 sm:grid-cols-4 sm:px-5 sm:py-4">
          <MetaCell
            label="Booking"
            value={
              transaction.bookingId ? (
                <Link
                  to={`/bookings/${transaction.bookingId}`}
                  className="inline-flex items-center gap-1 text-brand hover:underline"
                >
                  {transaction.bookingCode || `#${transaction.bookingId}`}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              ) : (
                transaction.bookingCode || '—'
              )
            }
          />
          <MetaCell label="Guest" value={transaction.guestName || '—'} />
          <MetaCell label="Gateway" value={transaction.gateway || transaction.channel || '—'} />
          <MetaCell label="Method" value={transaction.paymentMethodLabel || '—'} />
        </div>

        {(transaction.warning || transaction.failureReason) && (
          <div className="space-y-2 border-t border-border px-4 py-3 sm:px-5">
            {transaction.warning ? <p className="text-sm text-warning">{transaction.warning}</p> : null}
            {transaction.failureReason ? (
              <p className="text-sm text-destructive">{transaction.failureReason}</p>
            ) : null}
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Gateway references
          </h2>
          <div className="mt-2">
            <CopyableRow label="Payment" value={transaction.gatewayPaymentId} />
            <CopyableRow label="Order" value={transaction.gatewayOrderId} />
            <CopyableRow label="Refund" value={transaction.gatewayRefundId} />
            <CopyableRow label="Settlement" value={transaction.gatewaySettlementId} />
            {transaction.paymentId != null ? (
              <CopyableRow label="Local" value={String(transaction.paymentId)} />
            ) : null}
            <CopyableRow label="Receipt" value={transaction.receipt} />
            {!hasGatewayIds ? (
              <p className="py-3 text-sm text-muted-foreground">No gateway ids on this entry.</p>
            ) : null}
          </div>

          {(transaction.guestEmail || transaction.guestPhone || transaction.notes) && (
            <div className="mt-4 border-t border-border pt-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contact / notes
              </h2>
              <div className="mt-2 space-y-1.5 text-sm">
                {transaction.guestEmail ? (
                  <a href={`mailto:${transaction.guestEmail}`} className="block text-brand hover:underline">
                    {transaction.guestEmail}
                  </a>
                ) : null}
                {transaction.guestPhone ? (
                  <a href={`tel:${transaction.guestPhone}`} className="block text-brand hover:underline">
                    {transaction.guestPhone}
                  </a>
                ) : null}
                {transaction.notes ? (
                  <p className="text-muted-foreground">{transaction.notes}</p>
                ) : null}
              </div>
            </div>
          )}
        </section>

        <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Timeline
          </h2>
          <StatusTimeline className="mt-4" steps={timeline} />
        </section>
      </div>

      {refund ? (
        <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Refund policy
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <SoftFact
              label="Refund %"
              value={transaction.refundPercent != null ? `${transaction.refundPercent}%` : '—'}
            />
            <SoftFact
              label="Hours before CI"
              value={
                transaction.hoursBeforeCheckIn != null ? String(transaction.hoursBeforeCheckIn) : '—'
              }
            />
            <SoftFact label="Cancelled by" value={transaction.cancelledBy || '—'} />
          </div>
          {transaction.policySnapshot ? (
            <pre className="mt-4 overflow-x-auto rounded-lg border border-border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed">
              {transaction.policySnapshot}
            </pre>
          ) : null}
        </section>
      ) : null}

      {money ? (
        <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card p-4 sm:p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Booking money
          </h2>
          <div className="mt-3 divide-y divide-border/70">
            {(
              [
                ['Subtotal', money.subtotalAmount],
                ['Discount', money.discountAmount],
                ['Room GST', money.taxAmount],
                ['Processing fee', money.processingFeeAmount],
                ['Fee GST', money.processingFeeGstAmount],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 py-2 text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium tabular-nums">{formatCurrency(value)}</span>
              </div>
            ))}
            <div className="flex justify-between gap-3 py-2.5 text-sm">
              <span className="font-semibold">Total</span>
              <span className="font-semibold tabular-nums">{formatCurrency(money.totalAmount)}</span>
            </div>
          </div>
        </section>
      ) : null}

      {(transaction.linkedRefunds?.length ?? 0) > 0 ? (
        <section className="min-w-0 space-y-2">
          <h2 className="px-0.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Linked refunds ({transaction.linkedRefunds!.length})
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {transaction.linkedRefunds?.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/transactions/REFUND-${item.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition-colors hover:bg-muted/40 sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="font-semibold tabular-nums text-destructive">
                      −{formatCurrency(item.amount)}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                      REFUND-{item.id}
                      {item.gatewayRefundId ? ` · ${item.gatewayRefundId}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={paymentStatusTone(item.statusLabel)}>
                      {item.statusLabel || item.status || '—'}
                    </Badge>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {formatDateTime(item.completedAt || item.createdAt)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
