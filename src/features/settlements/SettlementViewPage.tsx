import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle2, Circle, Copy } from 'lucide-react';
import { api } from '@/lib/api';
import type { SettlementDetail } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { FullPageLoader } from '@/components/common/loading-state';
import { PageToolbar } from '@/components/common/page-toolbar';

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

function CopyableValue({
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
      <p>
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

export function SettlementViewPage() {
  const { id } = useParams();
  const settlementId = Number(id);
  const navigate = useNavigate();
  const { session } = useAuth();
  const { showToast } = useToast();
  const canRead = hasPermission(session?.perms, 'settlements', 'read');

  const [settlement, setSettlement] = useState<SettlementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  async function copyValue(value: string) {
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
    return <EmptyState label="You do not have permission to view settlements." />;
  }

  if (loading) {
    return <FullPageLoader label="Loading settlement…" />;
  }

  if (!settlement) {
    return (
      <div className="space-y-4">
        <PageToolbar
          title="Settlement"
          description="Settlement details"
          actions={
            <Button variant="outline" onClick={() => navigate('/settlements')}>
              <ArrowLeft className="h-4 w-4" />
              Back to settlements
            </Button>
          }
        />
        <EmptyState label="Settlement not found." />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      <PageToolbar
        title={settlement.gatewaySettlementId}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{settlement.kind}</Badge>
            <Badge tone={statusTone(settlement.status)}>{settlement.status}</Badge>
            <span>{formatDateTime(settlement.gatewayCreatedAt)}</span>
          </span>
        }
        actions={
          <Button variant="outline" onClick={() => navigate('/settlements')}>
            <ArrowLeft className="h-4 w-4" />
            Back to settlements
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Settlement</CardTitle>
            <CardDescription>Amount, fees, and bank credit details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Amount:</span> {formatCurrency(settlement.amount)}
            </p>
            <p>
              <span className="text-muted-foreground">Net:</span> {formatCurrency(settlement.netAmount)}
            </p>
            <p>
              <span className="text-muted-foreground">Fees:</span> {formatCurrency(settlement.fees)}
              {' · '}
              <span className="text-muted-foreground">Tax:</span> {formatCurrency(settlement.tax)}
            </p>
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Status:</span>
              <Badge tone={statusTone(settlement.status)}>{settlement.status}</Badge>
            </p>
            <p>
              <span className="text-muted-foreground">Kind:</span> {settlement.kind}
            </p>
            <p>
              <span className="text-muted-foreground">Created:</span>{' '}
              {formatDateTime(settlement.gatewayCreatedAt)}
            </p>
            <CopyableValue
              label="Settlement id"
              value={settlement.gatewaySettlementId}
              onCopy={(value) => void copyValue(value)}
              copied={copiedId}
            />
            <CopyableValue
              label="UTR"
              value={settlement.utr}
              onCopy={(value) => void copyValue(value)}
              copied={copiedId}
            />
            {settlement.bankCreditNote ? (
              <p className="text-muted-foreground">{settlement.bankCreditNote}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
            <CardDescription>Quick recon snapshot for this batch.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Line items:</span> {settlement.items?.length ?? 0}
            </p>
            <p>
              <span className="text-muted-foreground">Local id:</span> {settlement.id}
            </p>
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground">Processed:</span>
              {(settlement.status || '').toUpperCase() === 'PROCESSED' ? (
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
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recon line items</CardTitle>
          <CardDescription>Payments and refunds included in this settlement.</CardDescription>
        </CardHeader>
        <CardContent>
          {(settlement.items ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No recon line items yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Entity</th>
                    <th className="px-3 py-2">Booking</th>
                    <th className="px-3 py-2">Credit</th>
                    <th className="px-3 py-2">Debit</th>
                    <th className="px-3 py-2">Settled</th>
                  </tr>
                </thead>
                <tbody>
                  {settlement.items.map((item) => (
                    <tr key={item.id} className="border-t border-border/70">
                      <td className="px-3 py-2">{item.entityType}</td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {item.entityType?.toUpperCase() === 'PAYMENT' && item.paymentId != null ? (
                          <Link
                            to={`/transactions/PAYMENT-${item.paymentId}`}
                            className="font-medium text-brand hover:underline"
                          >
                            {item.entityId}
                          </Link>
                        ) : (
                          item.entityId
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {item.bookingId ? (
                          <Link
                            to={`/bookings/${item.bookingId}`}
                            className="font-medium text-brand hover:underline"
                          >
                            {item.bookingCode || item.bookingId}
                          </Link>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-3 py-2">{formatCurrency(item.credit)}</td>
                      <td className="px-3 py-2">{formatCurrency(item.debit)}</td>
                      <td className="px-3 py-2">
                        {item.settled ? (
                          <span className="inline-flex items-center gap-1.5 text-success" title="Settled">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-xs font-medium">
                              Yes{item.onHold ? ' (hold)' : ''}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground" title="Not settled">
                            <Circle className="h-4 w-4" />
                            <span className="text-xs font-medium">
                              No{item.onHold ? ' (hold)' : ''}
                            </span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
