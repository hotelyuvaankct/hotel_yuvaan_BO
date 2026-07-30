import type { ReactNode } from 'react';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingState } from '@/components/common/loading-state';
import { cn } from '@/lib/utils';

type ResponsiveListProps<T extends { id?: string | number }> = {
  columns: Array<DataTableColumn<T>>;
  data: T[];
  isLoading?: boolean;
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
  renderMobileCard: (row: T) => ReactNode;
  getRowId?: (row: T, index: number) => string | number;
  className?: string;
};

/**
 * One data source, two renderers:
 * - md+ → DataTable
 * - <md → card list via renderMobileCard
 */
export function ResponsiveList<T extends { id?: string | number }>({
  columns,
  data,
  isLoading = false,
  emptyState,
  onRowClick,
  renderMobileCard,
  getRowId,
  className,
}: ResponsiveListProps<T>) {
  return (
    <div className={className}>
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          emptyState={emptyState}
          onRowClick={onRowClick}
          getRowId={getRowId}
        />
      </div>

      <div className="grid min-w-0 gap-3 md:hidden">
        {isLoading ? <LoadingState /> : null}
        {!isLoading && data.length === 0 ? emptyState ?? <EmptyState /> : null}
        {!isLoading
          ? data.map((row, index) => {
              const rowId = getRowId?.(row, index) ?? row.id ?? index;
              return (
                <Card
                  key={rowId}
                  padding="none"
                  hoverable={Boolean(onRowClick)}
                  className={cn(
                    'min-w-0 w-full px-4 py-4',
                    onRowClick && 'cursor-pointer',
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {renderMobileCard(row)}
                </Card>
              );
            })
          : null}
      </div>
    </div>
  );
}

export type { ResponsiveListProps };
