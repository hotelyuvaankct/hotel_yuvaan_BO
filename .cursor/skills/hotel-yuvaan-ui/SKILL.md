---
name: hotel-yuvaan-ui
description: >-
  Hotel Yuvaan backoffice UI catalog — Button, BottomSheet, Modal, StatusTimeline,
  SoftFact, lists, forms, layout, formatters. MUST be read before any UI, page,
  listing, detail, form, dialog, sheet, or layout work in this repo.
---

# Hotel Yuvaan UI — full component catalog

**Before writing or changing any UI, read this skill and reuse what is listed.**  
Never hand-roll buttons, tables, modals, sheets, timelines, copy rows, currency formatters, or status badges in feature files.

Also follow `RULES.md` (design tokens, radius scale, no raw Tailwind palette colors).

## Mandatory first step

1. Read this skill.
2. Search `src/components/ui/`, `src/components/common/`, `src/components/layout/`, `src/lib/format.ts`, `src/lib/utils.ts`.
3. If nothing fits, add a shared primitive under `components/ui` (or `lib`), wire one call site, then **update this skill**.

---

## Actions & feedback

### `Button` — `src/components/ui/button.tsx`

```ts
import { Button } from '@/components/ui/button';
```

| Prop | Values | Notes |
|------|--------|-------|
| `variant` | `primary` · `secondary` · `outline` · `ghost` · `danger` | `gold` / `default` → `primary` |
| `size` | `sm` · `md` · `lg` · `icon` | Prefer `sm` in toolbars |
| `isLoading` | boolean | Shows spinner, disables |
| `leftIcon` / `rightIcon` | ReactNode | Optional |

**Rules**
- Primary CTA → `variant="primary"` (brand).
- Cancel booking / delete → `variant="danger"`.
- Icon-only refresh/export on mobile → `size="sm"` + `className="h-9 w-9 px-0"` + `aria-label`.
- Never raw `<button>` in features.

### `Badge` — `src/components/ui/badge.tsx`

| Prop | Values |
|------|--------|
| `tone` | `success` · `warning` · `danger` · `info` · `neutral` |

Show **label only** (e.g. `SUCCESS`) — never append raw `statusCode` like `(2)`.

### `useToast` — `src/components/ui/toast.tsx`

```ts
const { showToast } = useToast();
showToast('Saved', 'success'); // success | error | info | warning
```

### `useConfirm` — `src/components/ui/confirm-dialog.tsx`

```ts
const { confirm } = useConfirm();
const ok = await confirm({ title: '…', description: '…', confirmLabel: 'Confirm' });
```

Use for destructive / irreversible actions when a full sheet/modal is not needed.

---

## Overlays

### `BottomSheet` — `src/components/ui/bottom-sheet.tsx`

Mobile-first sheet (portal). Use for cancel flows, pickers, day details, mobile confirms.

```tsx
import { BottomSheet } from '@/components/ui/bottom-sheet';

<BottomSheet isOpen={open} onClose={() => setOpen(false)}>
  <BottomSheet.Header title="Confirm cancellation" />
  <BottomSheet.Body className="space-y-3">…</BottomSheet.Body>
  <BottomSheet.Footer className="justify-stretch gap-2 sm:justify-end">
    <Button variant="outline" onClick={onClose}>Close</Button>
    <Button variant="danger" onClick={onConfirm}>Cancel booking</Button>
  </BottomSheet.Footer>
</BottomSheet>
```

| Prop | Notes |
|------|-------|
| `isOpen` / `onClose` | Required |
| `preventDismiss` | Blocks Esc / overlay click |
| `maxHeight` | Default `90dvh` |

Compound: `Header` · `Body` · `Footer`. Date range picker already uses this on small screens.

### `Modal` — `src/components/ui/modal.tsx`

Centered dialog for desktop-oriented flows.

```tsx
<Modal isOpen={open} onClose={onClose} size="md"> {/* sm | md | lg | xl */}
  <Modal.Header title="…" />
  <Modal.Body>…</Modal.Body>
  <Modal.Footer>…</Modal.Footer>
</Modal>
```

**When to use which**
- Mobile-heavy / forms on phone → `BottomSheet`
- Desktop dialogs / wide content → `Modal`
- One-shot yes/no → `useConfirm`

---

## Detail / ledger building blocks

### `StatusTimeline` — `src/components/ui/status-timeline.tsx`

Payment / lifecycle stepper. **Mobile = vertical rail; `sm+` = horizontal.**

```tsx
import { StatusTimeline } from '@/components/ui/status-timeline';

<StatusTimeline
  steps={[
    { key: 'created', label: 'Created', date: '26 Jul 2026', time: '11:57 pm' },
    { key: 'paid', label: 'Paid', date: '26 Jul 2026', time: '11:57 pm' },
  ]}
/>
```

| Step field | Use |
|------------|-----|
| `key` | React key |
| `label` | Step title |
| `date` / `time` | Preferred split |
| `caption` | Single-line alternative |

Do **not** reinvent green-dot timelines in feature files.

### `SoftFact` — `src/components/ui/soft-fact.tsx`

Muted label + value tile on detail pages.

```tsx
<SoftFact label="Gateway" value="RAZORPAY" />
<SoftFact label="Amount" value={formatCurrency(n)} highlight />
```

### `CopyableRow` / `CopyIconButton` — `src/components/ui/copyable.tsx`

Gateway ids, codes, references. Uses `copyToClipboard` (mobile-safe).

```tsx
<CopyableRow label="Payment" value={gatewayPaymentId} />
<CopyIconButton value={transaction.id} label="Copy id" />
```

### `InitialsAvatar` — `src/components/ui/initials-avatar.tsx`

```tsx
<InitialsAvatar name={guestName} size="sm" | "md" | "lg" tone="brand" | "danger" | "muted" />
```

### `InfoChip` — `src/components/ui/info-chip.tsx`

```tsx
<InfoChip icon={Mail} label={email} href={`mailto:${email}`} />
```

---

## Lists & tables

### `ResponsiveList` — `src/components/ui/responsive-list.tsx`

**Required** for every list page: `DataTable` on `md+`, card list below.

```tsx
<ResponsiveList
  columns={columns}
  data={rows}
  isLoading={loading}
  onRowClick={(row) => navigate(…)}
  renderMobileCard={(row) => <YourCard … />}
  emptyState={<EmptyState label="…" />}
/>
```

### `DataTable` — `src/components/ui/data-table.tsx`

Column shape: `{ key, header, render?, numeric?, align? }`. Prefer via `ResponsiveList`.

### `Pagination` — `src/components/common/pagination.tsx`

```tsx
<Pagination page={page} totalPages={totalPages} loading={loading} onPageChange={load} />
```

### `EmptyState` · `LoadingState` · `FullPageLoader` — `src/components/common/`

Use for empty lists, inline loading, and full-page loads.

---

## Forms & inputs

| Component | Path | Use |
|-----------|------|-----|
| `Input` | `ui/input.tsx` | Base text input |
| `TextField` | `ui/form-fields.tsx` | Labeled text |
| `PasswordField` | `ui/form-fields.tsx` | Password + show/hide |
| `SelectField` | `ui/form-fields.tsx` | Select (`variant="filter"` for toolbars) |
| `DateField` | `ui/form-fields.tsx` | Single date |
| `FieldShell` | `ui/form-fields.tsx` | Label / error / hint wrapper |
| `fieldControlClass` | `ui/form-fields.tsx` | Shared control styles for custom inputs |
| `DateRangePicker` | `ui/date-range-picker.tsx` | From–to dates; BottomSheet on mobile |

Never invent custom `<input>` / `<select>` styling in features — use these.

---

## Surfaces

### `Card` — `src/components/ui/card.tsx`

`Card` · `CardHeader` · `CardTitle` · `CardDescription` · `CardContent`  
Props: `padding`, `hoverable` (used by ResponsiveList mobile shells).

### `PageHeader` — `src/components/layout/page-header.tsx`

Title + description + actions. Breadcrumbs already in `AdminLayout` — keep `showBreadcrumbs={false}` unless intentional.

### `PageToolbar` — `src/components/common/page-toolbar.tsx`

Filter / action row chrome when needed.

---

## Layout & navigation

| Piece | Path | Notes |
|-------|------|-------|
| `AdminLayout` | `layout/admin-layout.tsx` | Sidebar + header + **page-top breadcrumbs** |
| `Header` | `layout/header.tsx` | Mobile: menu/logo/logout. Desktop: user + logout **only** (no crumbs) |
| `Sidebar` | `layout/sidebar.tsx` | Nav; use `sidebar-*` tokens only |
| `Breadcrumbs` | `common/breadcrumbs.tsx` | Rendered by AdminLayout above `<Outlet />` |
| `useBreadcrumbLabel` | `common/breadcrumb-labels.tsx` | Override id segment (booking code / `PAYMENT-37`) |
| `RootLayout` | `layout/root-layout.tsx` | Providers + scroll-to-top |

**Breadcrumb rules**
- Live at **top of page content**, not in desktop header.
- Bookings detail → booking code.
- Transactions detail → trx id (`PAYMENT-37`), **never** booking code.

---

## Enums & status → badge mapping — `src/lib/enums.ts`

**Single source of truth.** Do not redefine status tones or option arrays in feature files.

| Export | Use |
|--------|-----|
| `Status`, `BookingStatus`, `RoomStatus`, `Gender`, `BookingSource`, `CouponType`, `DiscountType` | Numeric enums |
| `*Options` arrays | Selects + `optionLabel` |
| `bookingStatusTone` / `bookingStatusDisplayLabel` | Booking badges / list labels |
| `paymentStatusTone` | Transaction / payment string statuses |
| `settlementStatusTone` | Settlement string statuses |
| `recordStatusTone` | Active / Inactive / Pending records |
| `userStatusTone` | User account status |
| `roomAvailabilityTone` | Available / Occupied / … |
| `isRefundTransaction` | Payment vs refund |
| `optionLabel(options, value)` | Resolve label |

```ts
import {
  BookingStatus,
  bookingStatusTone,
  paymentStatusTone,
  optionLabel,
  bookingStatusOptions,
} from '@/lib/enums';

<Badge tone={bookingStatusTone(status)}>{optionLabel(bookingStatusOptions, status)}</Badge>
```

`Status` / `RoomStatus` are also re-exported from `@/lib/constants` for older imports.

## Shared helpers

### `src/lib/format.ts`

| Helper | Use |
|--------|-----|
| `formatCurrency(value, { maximumFractionDigits? })` | Money |
| `formatDateTime` | Date + time |
| `formatDate` | Day + month + year |
| `formatDayMonth` | Compact stay (`27 Jul`) |
| `formatDateShort` | Day + month + time |
| `formatTimeOnly` | Timeline time |
| `guestInitials` | Prefer `InitialsAvatar` |

### `src/lib/utils.ts`

| Helper | Use |
|--------|-----|
| `cn(…)` | className merge |
| `copyToClipboard(text)` | Mobile-safe copy (prefer CopyableRow / CopyIconButton) |

---

## Feature UX direction

| Area | Feel | Building blocks |
|------|------|-----------------|
| Bookings | Hospitality | InitialsAvatar, stay strip, SoftFact, InfoChip, BottomSheet cancel |
| Transactions | Ledger | Amount-first, StatusTimeline, CopyableRow, SoftFact |
| Settlements | Ledger | Same as transactions |
| Lists (all) | ResponsiveList + Pagination + Badge |

Do not clone booking guest cards into transactions.

---

## Decision cheat-sheet

| Need | Use |
|------|-----|
| Click action | `Button` |
| Status label | `Badge` |
| Mobile overlay form / confirm | `BottomSheet` |
| Desktop dialog | `Modal` |
| Simple yes/no | `useConfirm` |
| Toast feedback | `useToast` |
| Lifecycle steps | `StatusTimeline` |
| Label/value tile | `SoftFact` |
| Copyable id | `CopyableRow` / `CopyIconButton` |
| Guest avatar | `InitialsAvatar` |
| Contact pill | `InfoChip` |
| List page | `ResponsiveList` |
| Money / dates | `@/lib/format` |
| Date range filter | `DateRangePicker` |

---

## When adding something reusable

1. Add under `src/components/ui/*` (or `common` / `lib`).
2. Wire ≥1 call site.
3. Document it **in this skill**.
4. Run `graphify update .`.

## Quick imports

```ts
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Modal } from '@/components/ui/modal';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { SoftFact } from '@/components/ui/soft-fact';
import { StatusTimeline } from '@/components/ui/status-timeline';
import { CopyableRow, CopyIconButton } from '@/components/ui/copyable';
import { InitialsAvatar } from '@/components/ui/initials-avatar';
import { InfoChip } from '@/components/ui/info-chip';
import { ResponsiveList } from '@/components/ui/responsive-list';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { TextField, SelectField } from '@/components/ui/form-fields';
import { useToast } from '@/components/ui/toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { Pagination } from '@/components/common/pagination';
import { useBreadcrumbLabel } from '@/components/common/breadcrumb-labels';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format';
import { cn, copyToClipboard } from '@/lib/utils';
import {
  BookingStatus,
  bookingStatusTone,
  paymentStatusTone,
  settlementStatusTone,
  optionLabel,
} from '@/lib/enums';
```
