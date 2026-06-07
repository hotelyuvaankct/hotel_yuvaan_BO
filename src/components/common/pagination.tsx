import { Fragment } from 'react';
import { Button } from '@/components/ui/button';

interface PaginationProps {
  page: number;
  totalPages: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, loading, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-border pt-4 mt-4">
      <p className="text-sm text-muted-foreground">
        Page {totalPages === 0 ? 0 : page + 1} of {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || page === 0}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        {Array.from({ length: totalPages }, (_, i) => i)
          .filter((i) => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 2)
          .map((i, index, array) => (
            <Fragment key={i}>
              {index > 0 && i - array[index - 1] > 1 ? (
                <span className="self-center px-1 text-sm text-muted-foreground hidden sm:inline-block">...</span>
              ) : null}
              <Button
                type="button"
                variant={i === page ? 'gold' : 'outline'}
                size="sm"
                className="hidden sm:inline-flex w-9 px-0"
                onClick={() => onPageChange(i)}
              >
                {i + 1}
              </Button>
            </Fragment>
          ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={loading || page + 1 >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
