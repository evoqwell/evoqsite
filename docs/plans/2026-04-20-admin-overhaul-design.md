# EVOQ Admin Dashboard Overhaul — Design

**Date:** 2026-04-20
**Author:** Lance (design + dev)
**Status:** Approved, ready for implementation planning

## Goal

Overhaul `admin.html` + `admin.js` into a polished, intuitive admin dashboard. Same feature surface as today (products, promo codes, orders, analytics), dramatically better experience.

## Decisions (summary)

| Area | Decision |
|---|---|
| Scope | UX overhaul, same features (not just polish; not new capabilities) |
| Stack | React 18 + TypeScript + Vite + Tailwind + shadcn/ui, admin-only |
| Aesthetic | Neutral admin (slate/white) with EVOQ brown accents |
| Landing | Dashboard with action-oriented KPIs |
| Time range scope | One selector at top of Dashboard drives all 4 KPIs + traffic chart |
| Detail pattern | Side drawer for Products/Promos; full-page route for Orders |
| Sidebar | Dashboard · Products · Promos · Orders · Analytics + Logout |
| Auth | Full-screen login page, "Remember me" checkbox (default off) |
| Orders UX | Operational work queue: filters, chips, bulk actions, detail page, sidebar badge |
| Products UX | List + drawer with search/sort/inline-edit/bulk actions |
| Uploads | Deferred — keep text-path inputs for image/COA |
| Device | Desktop-first, mobile-usable (read + quick actions) |

## Architecture

**Stack additions (new deps)**
- `react-router-dom` — admin-internal routing
- `@tanstack/react-query` — server state, caching, optimistic updates, refetch-on-focus
- `shadcn/ui` components (installed piecemeal): Button, Input, Table, Sheet, Dialog, DropdownMenu, Sonner, Badge, Tabs, Command, Select, Skeleton, Switch
- `lucide-react` — already installed, used for nav/row icons

**Entry point**
`admin.html` shrinks to `<div id="root"></div>` + `<script type="module" src="/src/admin/main.tsx"></script>`. Current `admin.js` retired. `lib/adminApi.js` stays and is wrapped in React Query hooks. `vite.config.ts` untouched.

**File layout**
```
src/admin/
  main.tsx                  # mounts React app
  App.tsx                   # routes
  shell/
    AdminShell.tsx          # sidebar + topbar + <Outlet/>
    Sidebar.tsx
    TopBar.tsx
    LoginScreen.tsx
  pages/
    DashboardPage.tsx
    ProductsPage.tsx
    PromosPage.tsx
    OrdersPage.tsx
    OrderDetailPage.tsx
    AnalyticsPage.tsx
  components/
    DataTable.tsx           # shared sortable/filterable
    StatusChip.tsx
    KpiCard.tsx
    EmptyState.tsx
    ConfirmDialog.tsx
    ProductDrawer.tsx
    PromoDrawer.tsx
  hooks/
    useAdminAuth.ts
    useProducts.ts          # React Query wrappers
    usePromos.ts
    useOrders.ts
    useAnalytics.ts
  lib/
    queryClient.ts
    fmt.ts                  # currency, date, relative time
```

**Routes**
- `/admin` (unauth → login; auth → redirect to dashboard)
- `/admin/dashboard`
- `/admin/products`
- `/admin/promos`
- `/admin/orders` (with `?status=pending` etc.)
- `/admin/orders/:id`
- `/admin/analytics`

## Design tokens

Extend `tailwind.config.js`:
- `brand-brown`: `#6b5f52`
- `brand-brown-dark`: `#4f463c`
- Base: `slate-50` bg, `white` cards, `slate-200` borders, `slate-900` text
- Status: `emerald` (shipped/active), `amber` (pending/processing), `red` (cancelled/inactive/low-stock), `blue` (info)

## Layout shell

**Login screen**
- Full-viewport `slate-50` bg, centered card
- EVOQ logo, "Admin access" heading, single token input, "Remember me" checkbox (default off), "Sign in" button
- Inline error under field. Token → `sessionStorage` (or `localStorage` if Remember me)
- On success → `/admin/dashboard`

**Admin shell (post-auth)**
- **Sidebar** 240px fixed left
  - EVOQ wordmark + "Admin" tag
  - Nav: Dashboard · Orders (count badge when pending+processing > 0) · Products · Promos · Analytics
  - Active state: brown left border + tinted bg
  - Bottom: Logout button
- **Top bar** 56px
  - Breadcrumb / page title left
  - `⌘K` search button right (global command palette: jump to product/promo/order by name/SKU/#)
- **Content** `max-w-[1400px]`, padded
- **Mobile (<768px)**: sidebar → hamburger `Sheet`, top bar shrinks

**Toasts** — `Sonner` top-right, 4s auto-dismiss. Replaces the current static status banner. Wired via React Query `onSuccess`/`onError`.

## Dashboard

**Header**: "Dashboard" title · "Last updated Xm ago" subtitle · time-range `<Select>` (Today / This week / This month / All time; default This month). Range scopes everything below.

**KPI row** (4 cards)
- Revenue · Orders · Visitors · Conversion (orders ÷ unique visitors)
- Each card: label, large number, delta vs. previous period (green/red arrow)

**Action stacks** (two columns)
- **Orders to fulfill** — latest 5 pending/processing orders. Row → `/admin/orders/:id`. Empty: "You're all caught up."
- **Needs attention** — low stock (products under threshold; constant for now: 5). Click → product drawer.

**Traffic chart** — full-width card, Chart.js line chart (visitors + page views), same range as selector.

**Refetch** — React Query refetchOnWindowFocus + 60s interval for dashboard queries.

## Products page

**Header**: "Products" · search (name/SKU) · status filter · category filter · `+ Add product` button.

**Table columns**: checkbox · thumbnail · name + SKU · price · stock · status chip · row menu.

**Row click** → `ProductDrawer` (shadcn Sheet, ~520px, right).
Drawer fields = today's fields: SKU, name, price, stock, description, image path, categories, COA path, status.
Footer: Cancel · Delete (red, confirm required — type SKU) · Save (brand brown, disabled until dirty).

**Inline edit**: price and stock cells editable on click; optimistic update, toast on revert.

**Bulk**: selection reveals bar — Set status ▾ / Delete / Clear. Destructive actions confirmed.

**Sort**: clickable column headers.

**Stock warning**: amber dot when stock < 5.

**Empty state**: illustration + "No products yet" + add CTA.

## Promos page

Same pattern as Products.

**Columns**: code · type (% / $) · value · active toggle (inline `Switch`, no drawer needed to flip) · description · row menu.

**PromoDrawer** for full edits. Bulk: activate / deactivate / delete.

## Orders

### List (`/admin/orders`)
- Header: title · search (order #, customer, email) · status chip toggles with counts (All · New · Processing · Shipped · Delivered · Cancelled) · date range
- Columns: checkbox · order # (mono) · customer name + email · items count · total · status chip · placed (relative time, full on hover) · row menu
- Row click → `/admin/orders/:id`
- Filters sync to URL
- Sidebar "Orders" badge = count of pending + processing (30s poll)
- Bulk: mark shipped / mark delivered / export CSV / delete
- Pagination: keep 10/page (numeric), styled
- Mobile: rows become stacked cards

### Detail (`/admin/orders/:id`)
- Header: back link · `#1042` · status chip · placed timestamp · Print · Delete · status `<Select>`
- **Left (main)**:
  - Line items card (image, name, SKU, qty, unit price, line total)
  - Totals card (subtotal, discount + promo code, shipping, tax, total)
  - Status history / timeline (best-effort from existing schema; skip if data unavailable)
- **Right (aside)**:
  - Customer (name, email → mailto, phone)
  - Shipping address
  - Billing address (if different)
  - Payment (method, last-4, amount)
  - Notes (only if schema supports)
- Missing-field policy: skip if absent; add schema field only when clearly justified

## Analytics page

- Header: title · time-range selector (independent of Dashboard's)
- KPI row: Unique visitors · Page views · Avg. pages/visit · Bounce rate (fall back to 2 cards if data unavailable)
- Full-width traffic chart with series toggles (visitors / views)
- Breakdown **table** driven by whatever keys `fetchAdminAnalytics` returns (replaces hard-coded Homepage/Products cards)

## Cross-cutting polish

- **Loading**: `Skeleton` for first load; subtle top progress bar for refetches
- **Empty states**: shared `EmptyState` component everywhere
- **Errors**: React Query `onError` → red toast with message + Retry; global `ErrorBoundary` on shell
- **Confirmations**: `ConfirmDialog` for destructive actions; product/promo delete requires typing SKU/code
- **Keyboard**: `⌘K` command palette, `/` focuses page search, `Esc` closes drawers/dialogs, `g+d/p/o` nav jumps (nice-to-have)
- **A11y**: semantic tables, `aria-live` on toasts, focus traps in drawers/dialogs (shadcn defaults)

## Rollout sequence

1. Shell + login + routing + auth persistence
2. Dashboard
3. Products page
4. Promos page
5. Orders list + detail
6. Analytics page
7. Polish: empty states, keyboard shortcuts, mobile sweep, ⌘K

## Explicitly out of scope

File uploads (image/COA) · customer management · user accounts/roles · activity log · fulfillment integrations · refund flow · rich-text product descriptions · product variants · settings page.

## Open items to resolve during build

- Confirm order schema fields (tax, billing address, notes, status history) — adapt per "skip or justify" policy
- Confirm `fetchAdminAnalytics` return shape so breakdown table knows its columns
- Pick exact shadcn component set and install
- Decide on `react-query` devtools inclusion (dev-only, likely yes)
