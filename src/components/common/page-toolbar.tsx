import type { ReactNode } from 'react';
import { PageHeader } from '@/components/layout/page-header';

/** @deprecated Prefer `PageHeader` from `@/components/layout/page-header`. */
export function PageToolbar({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return <PageHeader title={title} description={description} actions={actions} />;
}
