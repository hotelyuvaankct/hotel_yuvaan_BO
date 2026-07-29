import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingState } from '@/components/common/loading-state';

export type DataTableColumn<T> = {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T) => ReactNode;
  /** When true, applies tabular-nums + right align (currency/numbers). */
  numeric?: boolean;
};

type DataTableProps<T extends { id?: string | number }> = {
  columns: Array<DataTableColumn<T>>;
  data: T[];
  isLoading?: boolean;
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
  getRowId?: (row: T, index: number) => string | number;
};

export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  isLoading = false,
  emptyState,
  onRowClick,
  className,
  getRowId,
}: DataTableProps<T>) {
  return (
    <Card padding="none" className={cn('overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10 bg-muted text-muted-foreground">
            <tr className="border-b border-border">
              {columns.map((column) => {
                const align = column.numeric ? 'right' : column.align ?? 'left';
                return (
                  <th
                    key={column.key}
                    style={column.width ? { width: column.width } : undefined}
                    className={cn(
                      'h-11 px-4 text-xs font-medium uppercase tracking-wide',
                      align === 'right' && 'text-right',
                      align === 'center' && 'text-center',
                      align === 'left' && 'text-left',
                    )}
                  >
                    {column.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="p-6">
                  <LoadingState />
                </td>
              </tr>
            ) : null}
            {!isLoading && data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-6">
                  {emptyState ?? <EmptyState />}
                </td>
              </tr>
            ) : null}
            {!isLoading
              ? data.map((row, index) => {
                  const rowId = getRowId?.(row, index) ?? row.id ?? index;
                  return (
                    <tr
                      key={rowId}
                      className={cn(
                        'h-14 border-b border-border last:border-0',
                        onRowClick ? 'cursor-pointer hover:bg-accent/50' : 'hover:bg-accent/50',
                      )}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                      {columns.map((column) => {
                        const align = column.numeric ? 'right' : column.align ?? 'left';
                        const value =
                          column.render?.(row) ??
                          ((row as Record<string, unknown>)[column.key] as ReactNode);
                        return (
                          <td
                            key={column.key}
                            className={cn(
                              'px-4 py-3 text-foreground',
                              column.numeric && 'tabular-nums',
                              align === 'right' && 'text-right',
                              align === 'center' && 'text-center',
                            )}
                          >
                            {value}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
