# Drea Ledger + Card Payment Requests — Design

Date: 2026-08-07

Two independent features requested by the site owner.

## 1. Drea ledger (`/admin/drea`)

A second bookkeeping page for the owner's wife's hairstyling business. It is
**completely isolated** from EVOQ: its own collection, its own routes, its own
summary. No EVOQ order ever contributes to its totals, and no Drea entry ever
appears in EVOQ revenue, expenses, dashboard, or analytics.

### Data

New collection `dreaentries`, model `DreaEntry`:

| Field         | Type                      | Notes                       |
| ------------- | ------------------------- | --------------------------- |
| `type`        | `'income' \| 'expense'`   | required                    |
| `description` | String, ≤500              | required, trimmed           |
| `amountCents` | Number ≥ 0                | required, always positive   |
| `date`        | Date                      | required, indexed desc      |

No categories — the owner chose description + amount only.

### API — `/api/admin/drea` (admin auth required)

- `GET /` — `?period=month|year|all`, `?from`, `?to`, `?type`, `?limit`
- `POST /` — `{ type, description, amount, date }`
- `DELETE /:id`
- `GET /summary` — `{ month, year, all }`, each
  `{ income, expense, net, incomeCount, expenseCount }` plus cents variants.
  Aggregated **only** over `DreaEntry`.

### UI

`DreaPage.tsx`, reusing the existing `KpiCard` / `DataTable` / `ConfirmDialog` /
`EmptyState` primitives so it matches the EVOQ expenses page. Period tabs
(month / year / all), three KPIs (Income, Expenses, Net), one add form with an
income/expense toggle, one combined ledger table with signed amounts. Sidebar
entry with a scissors icon, sitting below Expenses; command-palette nav item.

## 2. Card payment requests at checkout

Some clients can't Venmo. They flag it at checkout; the owner sees the flag in
the admin and invoices them separately through his wife's business.

### Checkout form

A checkbox under the ZIP field: *"I'd like to pay by credit card instead of
Venmo."* Checking it reveals a required phone input (`tel`, auto-formatted to
`(555) 123-4567`). Unchecked is the default and the form is unchanged for
everyone else.

### Confirmation popup

On submit with the box checked, a modal asks the client to confirm the number
they typed — *"We'll text your invoice link to (555) 123-4567. Is that
correct?"* — with **Yes, that's correct** / **Let me fix it**. Cancelling
returns focus to the phone field. Nothing is sent until they confirm.

### Order record

`Order` gains `paymentMethod: 'venmo' | 'card'` (default `venmo`) and
`customer.phone`. Phone is encrypted at rest like every other PII field —
`phone` is already listed in `CUSTOMER_PII_FIELDS`. Server-side validation
requires a 10–15 digit phone whenever `paymentMethod === 'card'`; the client
cannot skip it.

For card orders the API omits `venmoUrl` / `venmoPayment` from the response, so
there is no Venmo affordance to click. The success modal instead shows an
"Invoice on the way" panel naming the confirmed number. The buyer email's
payment instructions are swapped to matching copy.

### Admin surface

- Orders list: a "Card" chip next to the order number for card requests.
- Order detail Payment card: method, the phone as a `tel:` link, and a note that
  the client is waiting on an invoice link.
- Dashboard/analytics untouched — a card order is still an order.

## Out of scope

Actual card processing. The owner invoices manually; this feature only routes
the request and the phone number to him.
