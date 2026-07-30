import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Circle,
  Copy,
  Download,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { TransactionListItem, TransactionSummary } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { Pagination } from '@/components/common/pagination';
import { SelectField, fieldControlClass } from '@/components/ui/form-fields';
import { ResponsiveList } from '@/components/ui/responsive-list';
import type { DataTableColumn } from '@/components/ui/data-table';
import { cn, copyToClipboard } from '@/lib/utils';
import { formatCurrency, formatDateShort, formatDateTime } from '@/lib/format';
import { isRefundTransaction, paymentStatusTone } from '@/lib/enums';

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
    return <span className="font-mono text-xs text-muted-foreground">—</span>;
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

/** Compact ledger row — amount / type first, not guest-first like bookings. */
function TransactionLedgerCard({
  row,
  copiedId,
  onCopy,
}: {
  row: TransactionListItem;
  copiedId: string | null;
  onCopy: (value: string, event: MouseEvent) => void;
}) {
  const paymentId = gatewayIdForRow(row);
  const refund = isRefundTransaction(row.type);
  const TypeIcon = refund ? ArrowDownLeft : ArrowUpRight;

  return (
    <div className="min-w-0">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            refund ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success',
          )}
          aria-hidden
        >
          <TypeIcon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p
                className={cn(
                  'text-lg font-semibold tabular-nums tracking-tight',
                  refund ? 'text-destructive' : 'text-foreground',
                )}
              >
                {refund ? '−' : '+'}
                {formatCurrency(row.amount)}
              </p>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {row.type || 'TRX'} · {formatDateShort(row.occurredAt)}
              </p>
            </div>
            <Badge tone={paymentStatusTone(row.statusLabel)} className="shrink-0">
              {row.statusLabel || '—'}
            </Badge>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {row.bookingCode ? (
              row.bookingId ? (
                <Link
                  to={`/bookings/${row.bookingId}`}
                  className="font-medium text-brand hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {row.bookingCode}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{row.bookingCode}</span>
              )
            ) : null}
            {row.guestName ? (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">{row.guestName}</span>
              </>
            ) : null}
            <span aria-hidden>·</span>
            {row.settled ? (
              <span className="inline-flex items-center gap-1 text-success">
                <CheckCircle2 className="h-3 w-3" />
                Settled
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Circle className="h-3 w-3" />
                Open
              </span>
            )}
          </div>

          {paymentId ? (
            <button
              type="button"
              className="mt-2.5 flex w-full min-w-0 items-center gap-1.5 rounded-md border border-dashed border-border bg-muted/30 px-2 py-1.5 text-left font-mono text-[11px] text-muted-foreground"
              onClick={(e) => void onCopy(paymentId, e)}
            >
              <span className="min-w-0 flex-1 truncate">{paymentId}</span>
              {copiedId === paymentId ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-success" />
              ) : (
                <Copy className="h-3.5 w-3.5 shrink-0" />
              )}
            </button>
          ) : null}

          {row.warning ? <p className="mt-2 text-xs text-warning">{row.warning}</p> : null}
        </div>
      </div>
    </div>
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
    const ok = await copyToClipboard(value);
    if (!ok) {
      showToast('Unable to copy payment id', 'error');
      return;
    }
    setCopiedId(value);
    showToast('Payment id copied', 'success');
    window.setTimeout(() => setCopiedId((current) => (current === value ? null : current)), 2000);
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
        key: 'amount',
        header: 'Amount',
        render: (row) => {
          const refund = isRefundTransaction(row.type);
          const TypeIcon = refund ? ArrowDownLeft : ArrowUpRight;
          return (
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                  refund ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success',
                )}
              >
                <TypeIcon className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    'font-semibold tabular-nums',
                    refund ? 'text-destructive' : 'text-foreground',
                  )}
                >
                  {refund ? '−' : '+'}
                  {formatCurrency(row.amount)}
                </p>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {row.type || '—'}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        key: 'statusLabel',
        header: 'Status',
        render: (row) => <Badge tone={paymentStatusTone(row.statusLabel)}>{row.statusLabel || '—'}</Badge>,
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
            <span>{row.bookingCode || '—'}</span>
          ),
      },
      {
        key: 'guestName',
        header: 'Guest',
        render: (row) => <span className="text-sm text-muted-foreground">{row.guestName || '—'}</span>,
      },
      {
        key: 'settled',
        header: 'Settled',
        render: (row) =>
          row.settled ? (
            <span className="inline-flex items-center gap-1 text-sm text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Yes
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <Circle className="h-3.5 w-3.5" />
              No
            </span>
          ),
      },
      {
        key: 'occurredAt',
        header: 'When',
        render: (row) => (
          <span className="tabular-nums text-sm text-muted-foreground">{formatDateTime(row.occurredAt)}</span>
        ),
      },
      {
        key: 'gatewayPaymentId',
        header: 'Gateway id',
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
      {
        label: 'In',
        value: summary ? formatCurrency(summary.successfulPaymentAmount) : '—',
        sub: summary ? `${summary.successfulPayments} success` : '',
        tone: 'in' as const,
      },
      {
        label: 'Today',
        value: summary ? formatCurrency(summary.todayCaptureAmount) : '—',
        sub: summary ? `${summary.todayCaptures} captures` : '',
        tone: 'neutral' as const,
      },
      {
        label: 'Out',
        value: summary ? formatCurrency(summary.refundedAmount) : '—',
        sub: summary ? `${summary.refundCount} refunds` : '',
        tone: 'out' as const,
      },
      {
        label: 'Failed',
        value: summary ? String(summary.failedPayments) : '—',
        sub: summary ? `${summary.openOrders} open` : '',
        tone: 'warn' as const,
      },
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
    <div className="min-w-0 space-y-5 animate-fade-in-up">
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>Transactions</CardTitle>
            <CardDescription>
              {totalElements} ledger entr{totalElements === 1 ? 'y' : 'ies'}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 px-0 sm:w-auto sm:px-3"
              aria-label="Export page CSV"
              onClick={exportCsv}
              disabled={!rows.length}
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
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
          </div>
        </CardHeader>
        <CardContent className="min-w-0 space-y-4 overflow-hidden">
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
                    card.tone === 'warn' && 'text-warning',
                    card.tone === 'neutral' && 'text-foreground',
                  )}
                >
                  {card.value}
                </p>
                {card.sub ? <p className="mt-0.5 text-[11px] text-muted-foreground">{card.sub}</p> : null}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { value: '', label: 'All' },
              { value: 'PAYMENT', label: 'In' },
              { value: 'REFUND', label: 'Out' },
            ].map((chip) => (
              <button
                key={chip.value || 'all'}
                type="button"
                onClick={() => setType(chip.value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                  type === chip.value
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:text-foreground',
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SelectField
              variant="filter"
              label="Status"
              wrapperClassName="min-w-0"
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
            <div className="relative min-w-0">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Booking</label>
              <Search className="pointer-events-none absolute left-3 top-[2.125rem] h-4 w-4 text-muted-foreground" />
              <input
                value={bookingCode}
                onChange={(e) => setBookingCode(e.target.value)}
                placeholder="HYV…"
                className={cn(fieldControlClass, 'w-full min-w-0 pl-9 pr-10')}
              />
              {bookingCode ? (
                <button
                  type="button"
                  aria-label="Clear booking code"
                  className="absolute right-2 top-[2.05rem] rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setBookingCode('')}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <div className="relative min-w-0">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Gateway id</label>
              <input
                value={gatewayId}
                onChange={(e) => setGatewayId(e.target.value)}
                placeholder="pay_ / order_ / rfnd_"
                className={cn(fieldControlClass, 'w-full min-w-0 font-mono text-sm')}
              />
              {gatewayId ? (
                <button
                  type="button"
                  aria-label="Clear gateway id"
                  className="absolute right-2 top-[2.05rem] rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setGatewayId('')}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>

          <ResponsiveList
            columns={columns}
            data={rows}
            isLoading={loading}
            onRowClick={(row) => openDetail(row.id)}
            emptyState={
              <EmptyState label="No transactions. Try clearing filters or wait for new bookings to pay." />
            }
            renderMobileCard={(row) => (
              <TransactionLedgerCard row={row} copiedId={copiedId} onCopy={copyGatewayId} />
            )}
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
