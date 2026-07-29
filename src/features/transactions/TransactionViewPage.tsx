import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, CheckCircle2, Circle, Copy } from 'lucide-react';
import { api } from '@/lib/api';
import type { TransactionDetail } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { FullPageLoader } from '@/components/common/loading-state';

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
  const value = (status ?? '').toUpperCase();
  if (value === 'SUCCESS' || value === 'PAID' || value === 'CAPTURED') return 'success';
  if (value === 'PROCESSING' || value === 'PENDING' || value === 'CREATED') return 'warning';
  if (value === 'REFUNDED' || value === 'PARTIAL_REFUND') return 'warning';
  if (value === 'FAILED' || value === 'CANCELLED' || value === 'EXPIRED') return 'danger';
  return 'neutral';
}

function CopyableId({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value?: string | null;
  onCopy: (value: string) => void;
  copied: string | null;
}) {
  if (!value) {
    return (
      <p className="break-all">
        <span className="text-muted-foreground">{label}:</span> -
      </p>
    );
  }

  return (
    <p className="flex flex-wrap items-start gap-2 break-all">
      <span className="text-muted-foreground">{label}:</span>
      <button
        type="button"
        className="inline-flex max-w-full items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-xs text-foreground hover:bg-muted"
        title={`Copy ${label.toLowerCase()}`}
        onClick={() => onCopy(value)}
      >
        <span className="truncate">{value}</span>
        {copied === value ? (
          <Check className="h-3.5 w-3.5 shrink-0 text-success" />
        ) : (
          <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>
    </p>
  );
}

export function TransactionViewPage() {
  const { id } = useParams();
  const { session } = useAuth();
  const { showToast } = useToast();
  const canRead = hasPermission(session?.perms, 'payments', 'read');

  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  async function copyId(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(value);
      showToast('Copied', 'success');
      window.setTimeout(() => setCopiedId((current) => (current === value ? null : current)), 2000);
    } catch {
      showToast('Unable to copy', 'error');
    }
  }

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
          <CardContent>
            <EmptyState label="Transaction not found." />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>{transaction.id}</CardTitle>
            <CardDescription>
              <span className="inline-flex flex-wrap items-center gap-2">
                <Badge tone="neutral">{transaction.type}</Badge>
                <Badge tone={statusTone(transaction.statusLabel)}>{transaction.statusLabel || '-'}</Badge>
                <span>{formatDateTime(transaction.occurredAt)}</span>
              </span>
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transaction</CardTitle>
            <CardDescription>Payment status, timing, and settlement.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Amount:</span>{' '}
              {formatCurrency(transaction.amount)} {transaction.currency || 'INR'}
            </p>
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Status:</span>
              <Badge tone={statusTone(transaction.statusLabel)}>
                {transaction.statusLabel || '-'}
                {transaction.statusCode != null ? ` (${transaction.statusCode})` : ''}
              </Badge>
            </p>
            <p>
              <span className="text-muted-foreground">Gateway:</span> {transaction.gateway || '-'}
            </p>
            <p>
              <span className="text-muted-foreground">Channel:</span>{' '}
              {transaction.channel || transaction.gateway || '-'}
            </p>
            <p>
              <span className="text-muted-foreground">When:</span> {formatDateTime(transaction.occurredAt)}
            </p>
            <p>
              <span className="text-muted-foreground">Created:</span> {formatDateTime(transaction.createdAt)}
            </p>
            <p>
              <span className="text-muted-foreground">Updated:</span> {formatDateTime(transaction.updatedAt)}
            </p>
            <p>
              <span className="text-muted-foreground">Paid at:</span> {formatDateTime(transaction.paidAt)}
            </p>
            <p>
              <span className="text-muted-foreground">Initiated:</span> {formatDateTime(transaction.initiatedAt)}
            </p>
            <p>
              <span className="text-muted-foreground">Completed:</span> {formatDateTime(transaction.completedAt)}
            </p>
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Settled:</span>
              {transaction.settled ? (
                <span className="inline-flex items-center gap-1.5 text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs font-medium">Yes</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Circle className="h-4 w-4" />
                  <span className="text-xs font-medium">No</span>
                </span>
              )}
            </p>
            <CopyableId
              label="Settlement id"
              value={transaction.gatewaySettlementId}
              onCopy={(value) => void copyId(value)}
              copied={copiedId}
            />
            {transaction.paymentMethodLabel ? (
              <p>
                <span className="text-muted-foreground">Method:</span> {transaction.paymentMethodLabel}
              </p>
            ) : null}
            {transaction.receipt ? (
              <p>
                <span className="text-muted-foreground">Receipt:</span> {transaction.receipt}
              </p>
            ) : null}
            {transaction.notes ? (
              <p>
                <span className="text-muted-foreground">Notes:</span> {transaction.notes}
              </p>
            ) : null}
            {transaction.warning ? <p className="text-warning">{transaction.warning}</p> : null}
            {transaction.failureReason ? (
              <p className="text-destructive">{transaction.failureReason}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Booking & guest</CardTitle>
            <CardDescription>Linked booking and gateway identifiers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Booking:</span>{' '}
              {transaction.bookingId ? (
                <Link
                  to={`/bookings/${transaction.bookingId}`}
                  className="font-medium text-brand hover:text-brand-hover hover:underline"
                >
                  {transaction.bookingCode || transaction.bookingId}
                </Link>
              ) : (
                '-'
              )}
            </p>
            <p>
              <span className="text-muted-foreground">Guest:</span> {transaction.guestName || '-'}
            </p>
            <p>
              <span className="text-muted-foreground">Email:</span> {transaction.guestEmail || '-'}
            </p>
            <p>
              <span className="text-muted-foreground">Phone:</span> {transaction.guestPhone || '-'}
            </p>

            <p className="pt-2 font-medium">Gateway ids</p>
            <CopyableId
              label="Payment"
              value={transaction.gatewayPaymentId}
              onCopy={(value) => void copyId(value)}
              copied={copiedId}
            />
            <CopyableId
              label="Order"
              value={transaction.gatewayOrderId}
              onCopy={(value) => void copyId(value)}
              copied={copiedId}
            />
            <CopyableId
              label="Refund"
              value={transaction.gatewayRefundId}
              onCopy={(value) => void copyId(value)}
              copied={copiedId}
            />
            <p>
              <span className="text-muted-foreground">Local payment id:</span>{' '}
              {transaction.paymentId ?? '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      {transaction.type === 'REFUND' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Refund policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Refund %:</span> {transaction.refundPercent ?? '-'}
            </p>
            <p>
              <span className="text-muted-foreground">Hours before check-in:</span>{' '}
              {transaction.hoursBeforeCheckIn ?? '-'}
            </p>
            <p>
              <span className="text-muted-foreground">Cancelled by:</span> {transaction.cancelledBy || '-'}
            </p>
            {transaction.policySnapshot ? (
              <pre className="overflow-x-auto rounded-lg bg-muted/40 p-3 text-xs">
                {transaction.policySnapshot}
              </pre>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {transaction.bookingMoney ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Booking money breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>Subtotal: {formatCurrency(transaction.bookingMoney.subtotalAmount)}</p>
              <p>Discount: {formatCurrency(transaction.bookingMoney.discountAmount)}</p>
              <p>Room GST: {formatCurrency(transaction.bookingMoney.taxAmount)}</p>
              <p>Processing fee: {formatCurrency(transaction.bookingMoney.processingFeeAmount)}</p>
              <p>Fee GST: {formatCurrency(transaction.bookingMoney.processingFeeGstAmount)}</p>
              <p className="font-medium">Total: {formatCurrency(transaction.bookingMoney.totalAmount)}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {(transaction.linkedRefunds?.length ?? 0) > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linked refunds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-3">Id</th>
                    <th className="py-1 pr-3">Amount</th>
                    <th className="py-1 pr-3">Status</th>
                    <th className="py-1 pr-3">%</th>
                    <th className="py-1 pr-3">By</th>
                    <th className="py-1 pr-3">Gateway</th>
                    <th className="py-1">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {transaction.linkedRefunds?.map((refund) => (
                    <tr key={refund.id} className="border-t border-border/60">
                      <td className="py-1.5 pr-3">
                        <Link
                          to={`/transactions/REFUND-${refund.id}`}
                          className="font-medium text-brand hover:underline"
                        >
                          REFUND-{refund.id}
                        </Link>
                      </td>
                      <td className="py-1.5 pr-3">{formatCurrency(refund.amount)}</td>
                      <td className="py-1.5 pr-3">
                        <Badge tone={statusTone(refund.statusLabel)}>
                          {refund.statusLabel || refund.status || '-'}
                        </Badge>
                      </td>
                      <td className="py-1.5 pr-3">{refund.refundPercent ?? '-'}</td>
                      <td className="py-1.5 pr-3">{refund.cancelledBy || '-'}</td>
                      <td className="py-1.5 pr-3 font-mono text-xs">{refund.gatewayRefundId || '-'}</td>
                      <td className="py-1.5">
                        {formatDateTime(refund.completedAt || refund.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
