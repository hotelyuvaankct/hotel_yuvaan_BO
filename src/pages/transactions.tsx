import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, CheckCircle2, Circle, Copy, Download, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import type { TransactionListItem, TransactionSummary } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingState } from '@/components/common/loading-state';
import { PageToolbar } from '@/components/common/page-toolbar';
import { Pagination } from '@/components/common/pagination';
import { SelectField, TextField } from '@/components/ui/form-fields';

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

function statusVariant(status?: string): 'gold' | 'success' | 'warning' | 'danger' | 'secondary' {
  const value = (status ?? '').toUpperCase();
  if (value === 'SUCCESS' || value === 'PAID' || value === 'CAPTURED') return 'success';
  if (value === 'PROCESSING' || value === 'PENDING' || value === 'CREATED') return 'warning';
  if (value === 'REFUNDED' || value === 'PARTIAL_REFUND') return 'gold';
  if (value === 'FAILED' || value === 'CANCELLED' || value === 'EXPIRED') return 'danger';
  return 'secondary';
}

function gatewayIdForRow(row: TransactionListItem) {
  if (row.type === 'REFUND') {
    return row.gatewayRefundId || row.gatewayPaymentId || '';
  }
  return row.gatewayPaymentId || row.gatewayOrderId || row.gatewayRefundId || '';
}

export function TransactionsPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { showToast } = useToast();
  const canRead = hasPermission(session?.perms, 'payments', 'read');

  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [rows, setRows] = useState<TransactionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [bookingCode, setBookingCode] = useState('');
  const [gatewayId, setGatewayId] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyGatewayId(value: string, event: MouseEvent) {
    event.stopPropagation();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(value);
      showToast('Payment id copied', 'success');
      window.setTimeout(() => setCopiedId((current) => (current === value ? null : current)), 2000);
    } catch {
      showToast('Unable to copy payment id', 'error');
    }
  }

  async function load(targetPage = page) {
    setLoading(true);
    try {
      const [list, sum] = await Promise.all([
        api.listTransactions({
          page: targetPage,
          size: 20,
          type: type || undefined,
          status: status || undefined,
          bookingCode: bookingCode || undefined,
          gatewayId: gatewayId || undefined,
        }),
        api.getTransactionSummary(),
      ]);
      setRows(list.content ?? []);
      setPage(list.number ?? targetPage);
      setTotalPages(list.totalPages ?? 0);
      setTotalElements(list.totalElements ?? 0);
      setSummary(sum);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to load transactions.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(id: string) {
    navigate(`/transactions/${encodeURIComponent(id)}`);
  }

  function exportCsv() {
    const header = [
      'id',
      'type',
      'bookingCode',
      'guestName',
      'amount',
      'status',
      'gatewayPaymentId',
      'gatewayRefundId',
      'occurredAt',
    ];
    const lines = rows.map((row) =>
      [
        row.id,
        row.type,
        row.bookingCode ?? '',
        row.guestName ?? '',
        row.amount,
        row.statusLabel ?? '',
        row.gatewayPaymentId ?? '',
        row.gatewayRefundId ?? '',
        row.occurredAt ?? '',
      ]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(','),
    );
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-page-${page + 1}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (!canRead) return;
    const timeout = window.setTimeout(() => void load(0), 250);
    return () => window.clearTimeout(timeout);
  }, [canRead, type, status, bookingCode, gatewayId]);

  const kpiCards = useMemo(
    () => [
      { label: 'Successful payments', value: summary ? formatCurrency(summary.successfulPaymentAmount) : '-', sub: summary ? `${summary.successfulPayments} txns` : '' },
      { label: "Today's captures", value: summary ? formatCurrency(summary.todayCaptureAmount) : '-', sub: summary ? `${summary.todayCaptures} today` : '' },
      { label: 'Refunded', value: summary ? formatCurrency(summary.refundedAmount) : '-', sub: summary ? `${summary.refundCount} refunds` : '' },
      { label: 'Failed / open orders', value: summary ? String(summary.failedPayments) : '-', sub: summary ? `${summary.openOrders} open orders` : '' },
    ],
    [summary],
  );

  if (!canRead) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>Your role does not include Transactions (payments) read access.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageToolbar
        title="Transactions"
        description="All platform payments, refunds, and checkout orders linked to bookings."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
              <Download className="h-4 w-4" />
              Export page CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-xl">{card.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Ledger</CardTitle>
            {!loading ? (
              <p className="text-sm text-muted-foreground">{totalElements} transaction{totalElements === 1 ? '' : 's'}</p>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <SelectField
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="All types"
              options={[
                { value: 'PAYMENT', label: 'Payment' },
                { value: 'REFUND', label: 'Refund' },
              ]}
            />
            <SelectField
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="All statuses"
              options={[
                { value: 'SUCCESS', label: 'Success' },
                { value: 'FAILED', label: 'Failed' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'PROCESSING', label: 'Processing' },
                { value: 'REFUNDED', label: 'Refunded' },
              ]}
            />
            <TextField
              label="Booking code"
              value={bookingCode}
              onChange={(e) => setBookingCode(e.target.value)}
              placeholder="HYV..."
            />
            <TextField
              label="Gateway id"
              value={gatewayId}
              onChange={(e) => setGatewayId(e.target.value)}
              placeholder="pay_ / order_ / rfnd_"
            />
          </div>

          {loading ? (
            <LoadingState label="Loading transactions…" />
          ) : rows.length === 0 ? (
            <EmptyState label="No transactions. Try clearing filters or wait for new bookings to pay." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">When</th>
                    <th className="px-3 py-2">Booking</th>
                    <th className="px-3 py-2">Guest</th>
                    <th className="px-3 py-2">Amount</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Settled</th>
                    <th className="px-3 py-2">Payment id</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const paymentId = gatewayIdForRow(row);
                    return (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-t border-border/70 hover:bg-muted/30"
                      onClick={() => void openDetail(row.id)}
                    >
                      <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(row.occurredAt)}</td>
                      <td className="px-3 py-2">
                        {row.bookingId ? (
                          <Link
                            to={`/bookings/${row.bookingId}`}
                            className="font-medium text-sky-700 hover:text-sky-800 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {row.bookingCode || row.bookingId}
                          </Link>
                        ) : (
                          row.bookingCode || '-'
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{row.guestName || '-'}</div>
                        <div className="text-xs text-muted-foreground">{row.guestEmail || ''}</div>
                      </td>
                      <td className="px-3 py-2 font-medium">{formatCurrency(row.amount)}</td>
                      <td className="px-3 py-2">
                        <Badge variant={statusVariant(row.statusLabel)}>
                          {row.statusLabel || '-'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        {row.settled ? (
                          <span
                            className="inline-flex items-center gap-1.5 text-emerald-700"
                            title="Settled"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-xs font-medium">Yes</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 text-muted-foreground"
                            title="Not settled"
                          >
                            <Circle className="h-4 w-4" />
                            <span className="text-xs font-medium">No</span>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {paymentId ? (
                          <button
                            type="button"
                            className="inline-flex max-w-full items-center gap-1.5 rounded-md px-1.5 py-1 font-mono text-xs text-slate-700 hover:bg-muted"
                            title="Copy payment id"
                            onClick={(event) => void copyGatewayId(paymentId, event)}
                          >
                            <span className="truncate">{paymentId}</span>
                            {copiedId === paymentId ? (
                              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            )}
                          </button>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground">-</span>
                        )}
                        {row.warning ? <div className="text-warning">{row.warning}</div> : null}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

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
