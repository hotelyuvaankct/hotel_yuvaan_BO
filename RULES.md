# RULES.md — Hotel Backoffice Design & Code Rules

## Stack facts
- Vite + React Router (not Next.js)
- Icons: `lucide-react` only

## Non-negotiables
1. Never write raw Tailwind palette classes (`bg-blue-600`, `text-gray-500`, `bg-amber-400`, etc.) in
   feature code. Always use the tokens already defined in `tailwind.config.ts`: `background`, `foreground`,
   `card`, `popover`, `primary`, `brand` (real CTA color — prefer this over `primary` for main actions),
   `secondary`, `muted`, `accent`, `destructive` (= danger), `success`, `warning`, `gold` (VIP/premium only),
   `surface`, `sidebar-*`, `border`, `input`, `ring`, `overlay`.
2. Never hand-roll a `<table>`, `<button>`, `<input>`, or modal markup in a feature/page file.
   Always import from `src/components/ui/*`.
3. Border radius follows the fixed scale — do not invent new radius values:
   - inputs/small buttons: `rounded-sm`
   - buttons default/dropdowns: `rounded-lg`
   - cards/table containers: `rounded-xl`
   - modals/drawers: `rounded-2xl`
   - avatars/pills: `rounded-full`
4. Every list view (Bookings, Transactions, Settlements, Rooms, Room Types, Inventory, Coupons,
   Users) must render as:
   - `<DataTable>` on `md` breakpoint and above
   - Card-based list (see `docs/DESIGN_SYSTEM.md` §3 mobile convention) below `md`
   Do not build a separate one-off mobile component per feature — reuse `ResponsiveList`.
5. Status/state anywhere in the UI (booking status, payment status, role status) is always a `<Badge>`,
   never plain colored text.
6. All interactive elements need visible focus states (`focus-visible:ring-2 ring-ring`) — this
   is an admin tool used with keyboards, not a marketing site.
6b. Sidebar components only use `sidebar-*` tokens (`sidebar`, `sidebar-foreground`,
    `sidebar-primary`, `sidebar-accent`, `sidebar-border`) — never reuse general `primary`/`accent` there.
6c. Before adding any color to a component, check whether it's status (`success`/`warning`/`destructive`),
    brand action (`brand`), or structural (`card`/`popover`/`muted`/`accent`) — do not add a new token without
    updating this file first. `info`/`neutral` badges reuse `muted` (no dedicated `--info` token).
7. No inline style props, no arbitrary Tailwind values (`mt-[13px]`) unless there is genuinely no scale
   token that fits — and if so, add it to the scale instead of inlining it.
8. One icon library only (`lucide-react`). Do not mix icon sets.
9. Every new component goes in `components/ui` and must support the size/variant props already
   established by sibling components (don't invent a new prop naming convention per component).
10. Before creating a new component, check `components/ui` first — extend an existing one rather than
    duplicating.
11. Ask before deleting any existing file.
12. Work phase-by-phase from `docs/DESIGN_SYSTEM.md`; confirm before starting the next phase.

## Workflow for every change
0. **Read** `.cursor/skills/hotel-yuvaan-ui/SKILL.md` before UI work — reuse SoftFact, CopyableRow, StatusTimeline, InitialsAvatar, InfoChip, `formatCurrency` / dates from `src/lib/format.ts`, `copyToClipboard`, and **all enums + status→badge maps from `src/lib/enums.ts`**. Never copy local `statusTone` helpers into features. Update that skill when you add a new shared primitive.
1. State which existing components/tokens you're reusing before writing new code.
2. If a new visual pattern is genuinely needed, propose the token/variant addition to this file /
   `docs/DESIGN_SYSTEM.md` first.
3. Keep feature folders self-contained: a feature imports from `components/ui` and `lib`, never from
   another feature folder directly.
