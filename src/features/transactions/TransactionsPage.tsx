import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, CheckCircle2, Circle, Copy, Download, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import type { TransactionListItem, TransactionSummary } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
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
  const value = (status ?? '').toUpperCase();
  if (value === 'SUCCESS' || value === 'PAID' || value === 'CAPTURED') return 'success';
  if (value === 'PROCESSING' || value === 'PENDING' || value === 'CREATED') return 'warning';
  if (value === 'REFUNDED' || value === 'PARTIAL_REFUND') return 'info';
  if (value === 'FAILED' || value === 'CANCELLED' || value === 'EXPIRED') return 'danger';
  return 'neutral';
}

function gatewayIdForRow(row: TransactionListItem) {
  if (row.type === 'REFUND') {
    return row.gatewayRefundId || row.gatewayPaymentId || '';
  }
  return row.gatewayPaymentId || row.gatewayOrderId || row.gatewayRefundId || '';
}

function GatewayIdCell({
  paymentId,
  copiedId,
  onCopy,
}: {
  paymentId: string;
  copiedId: string | null;
  onCopy: (value: string, event: MouseEvent) => void;
}) {
  if (!paymentId) {
    return <span className="font-mono text-xs text-muted-foreground">-</span>;
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-auto max-w-full px-1.5 py-1 font-mono text-xs"
      title="Copy payment id"
      onClick={(event) => void onCopy(paymentId, event)}
    >
      <span className="truncate">{paymentId}</span>
      {copiedId === paymentId ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-success" />
      ) : (
        <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}
    </Button>
  );
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

  function openDetail(id: string) {
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

  const columns = useMemo<Array<DataTableColumn<TransactionListItem>>>(
    () => [
      {
        key: 'occurredAt',
        header: 'When',
        render: (row) => formatDateTime(row.occurredAt),
      },
      {
        key: 'bookingCode',
        header: 'Booking',
        render: (row) =>
          row.bookingId ? (
            <Link
              to={`/bookings/${row.bookingId}`}
              className="font-medium text-brand hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {row.bookingCode || row.bookingId}
            </Link>
          ) : (
            row.bookingCode || '-'
          ),
      },
      {
        key: 'guestName',
        header: 'Guest',
        render: (row) => (
          <div>
            <div className="font-medium">{row.guestName || '-'}</div>
            <div className="text-xs text-muted-foreground">{row.guestEmail || ''}</div>
          </div>
        ),
      },
      {
        key: 'amount',
        header: 'Amount',
        numeric: true,
        render: (row) => <span className="font-medium">{formatCurrency(row.amount)}</span>,
      },
      {
        key: 'statusLabel',
        header: 'Status',
        render: (row) => (
          <Badge tone={statusTone(row.statusLabel)}>{row.statusLabel || '-'}</Badge>
        ),
      },
      {
        key: 'settled',
        header: 'Settled',
        render: (row) =>
          row.settled ? (
            <Badge tone="success">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Yes
            </Badge>
          ) : (
            <Badge tone="neutral">
              <Circle className="mr-1 h-3 w-3" />
              No
            </Badge>
          ),
      },
      {
        key: 'gatewayPaymentId',
        header: 'Payment id',
        render: (row) => {
          const paymentId = gatewayIdForRow(row);
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <GatewayIdCell paymentId={paymentId} copiedId={copiedId} onCopy={copyGatewayId} />
              {row.warning ? <div className="text-xs text-warning">{row.warning}</div> : null}
            </div>
          );
        },
      },
    ],
    [copiedId],
  );

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
      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>
              All platform payments, refunds, and checkout orders linked to bookings.
              {!loading ? ` ${totalElements} transaction${totalElements === 1 ? '' : 's'} in ledger.` : ''}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
              <Download className="h-4 w-4" />
              Export page CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <div className="grid gap-3 md:grid-cols-4">
            <SelectField
              variant="filter"
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
              variant="filter"
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

          <ResponsiveList
            columns={columns}
            data={rows}
            isLoading={loading}
            onRowClick={(row) => openDetail(row.id)}
            emptyState={
              <EmptyState label="No transactions. Try clearing filters or wait for new bookings to pay." />
            }
            renderMobileCard={(row) => {
              const paymentId = gatewayIdForRow(row);
              return (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="truncate font-semibold">{row.bookingCode || row.id}</p>
                    <Badge tone={statusTone(row.statusLabel)} className="shrink-0">
                      {row.statusLabel || '-'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-y-1 text-sm">
                    <span className="text-muted-foreground">When</span>
                    <span className="text-foreground">{formatDateTime(row.occurredAt)}</span>
                    <span className="text-muted-foreground">Guest</span>
                    <span className="text-foreground">{row.guestName || '-'}</span>
                    <span className="text-muted-foreground">Amount</span>
                    <span className="text-foreground">{formatCurrency(row.amount)}</span>
                    <span className="text-muted-foreground">Settled</span>
                    <span className="text-foreground">{row.settled ? 'Yes' : 'No'}</span>
                    <span className="text-muted-foreground">Payment id</span>
                    <span className="truncate font-mono text-xs text-foreground">{paymentId || '-'}</span>
                  </div>
                  {row.warning ? <p className="text-xs text-warning">{row.warning}</p> : null}
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {paymentId ? (
                      <Button variant="outline" size="sm" onClick={(e) => void copyGatewayId(paymentId, e)}>
                        <Copy className="h-4 w-4" />
                        Copy id
                      </Button>
                    ) : null}
                    <Button variant="outline" size="sm" onClick={() => openDetail(row.id)}>
                      View
                    </Button>
                  </div>
                </div>
              );
            }}
          />

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
