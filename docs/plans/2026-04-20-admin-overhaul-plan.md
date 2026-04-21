# EVOQ Admin Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `admin.html` + `admin.js` with a polished React/Tailwind/shadcn admin at `/admin`, with sidebar navigation, a dashboard landing page, side-drawer edits for products/promos, a full-page order detail, and a data-driven analytics page.

**Architecture:** React 18 SPA mounted into `admin.html` via Vite. Routes live under `/admin/*` (client-side via `react-router-dom`). Server state handled by `@tanstack/react-query` wrapping the existing `lib/adminApi.js`. Styling via Tailwind + shadcn/ui with an EVOQ-brown accent over a neutral slate/white palette.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, react-router-dom, @tanstack/react-query, Chart.js (already loaded), lucide-react (already installed), Sonner (via shadcn), Vitest + React Testing Library (new, added in Phase 0 for pure-logic tests).

**Design doc:** `docs/plans/2026-04-20-admin-overhaul-design.md` (read first if you lack context)

---

## Reality adjustments (deviations from design doc)

Verified against the server code (`server/src/models/*.js`, `server/src/routes/adminAnalytics.js`, `lib/adminApi.js`). These trump the design doc where they conflict:

| Design assumption | Reality | Plan response |
|---|---|---|
| Order statuses: `pending / processing / shipped / delivered / cancelled` | DB enum: `pending_payment / paid / fulfilled / cancelled` | Use the 4 real statuses. Map labels: Pending payment · Paid · Fulfilled · Cancelled. Sidebar badge = count of `pending_payment` + `paid`. |
| Billing address, phone, tax, notes on orders | Not in `Order` schema | Skip entirely. Show `venmoNote` in the payment card if present. |
| Status history / timeline | Not tracked | Show "Created" and "Last updated" only; no timeline card. |
| Promo `isActive` exposed on GET | `PromoCode.toJSON` deletes `isActive`, BUT `server/src/routes/adminPromos.js` does its own mapping that DOES include `isActive`. So on the admin wire it's already present. | **Task 4.0 is NOT needed — DELETE IT.** The admin `GET /api/admin/promos` already returns `isActive`. Leave the `toJSON` transform alone to avoid affecting the public routes. |
| Analytics breakdown table "data-driven" | Server-aggregated time-series is hard-coded to `homepage` + `products` keys | `byPage` object is data-driven (use it for the table). Traffic chart overlays homepage vs. products (existing data). |
| **Admin list endpoints wrap responses in an object** | `GET /api/admin/products` → `{ products: [...] }`; `GET /api/admin/orders` → `{ orders: [...] }`; `GET /api/admin/promos` → `{ promos: [...] }` | Hooks use React Query `select` to unwrap to a bare array. See Task 2.1 — `useProducts` / `useOrders` / `usePromos` must all do `select: (data) => data?.<key> ?? []`. |
| **Admin order money is dollar floats, not cents** | `order.totals.{subtotal, discount, shipping, total}` are dollar floats; `item.{price, lineTotal}` are dollar floats. `totalCents` / `priceCents` / `lineTotalCents` do NOT exist on the wire. | `useOrders` normalizes in `select` by adding `*Cents` fields (round * 100) so the rest of the app keeps working in cents as designed. |
| Remember-me persistence | `adminApi.js` writes only to `sessionStorage` | On "Remember me" checked, also mirror to `localStorage` with the same keys; `restoreSession` reads from both (localStorage first, then sessionStorage). Task 1.9. |

---

## Execution notes

- **Not a git repo.** Skip `git commit` steps. Use manual verification checkpoints.
- **TDD applied pragmatically.** Pure logic (formatters, filters, reducers, auth helpers) gets TDD with Vitest. UI assembly tasks get a manual browser-verify checklist instead — React Testing Library tests for every component would cost 3× effort with marginal safety.
- **Dev server.** `npm run dev` starts Vite. `npm run server` starts the Express backend (needed for anything beyond static routing). Run both for full testing.
- **Type safety.** `npm run typecheck` must pass at the end of every phase.
- **Lint.** `npm run lint` must pass before declaring a phase done.
- **Don't touch the public-site HTML pages** (`index.html`, `shop.html`, etc.) — only `admin.html`.

---

## Phase 0: Foundations

Install dependencies, set up shadcn, theme Tailwind, create the fmt utilities, and wire up Vitest. No UI work yet.

### Task 0.1: Install new dependencies

**Files:** `package.json`

**Step 1: Install runtime deps**
Run:
```bash
cd /Users/lancefrazer/Desktop/evoqsite-main/evoqsite-main
npm install react-router-dom @tanstack/react-query clsx tailwind-merge class-variance-authority
```

**Step 2: Install dev deps (testing + tooling)**
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/node
```

**Step 3: Verify**
```bash
npm ls react-router-dom @tanstack/react-query vitest
```
Expected: all three print a version, no errors.

### Task 0.2: Add Vitest config + test script

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (scripts)
- Create: `src/test/setup.ts`

**Step 1: Create `vitest.config.ts`**
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
```

**Step 2: Create `src/test/setup.ts`**
```ts
import '@testing-library/jest-dom';
```

**Step 3: Add scripts to `package.json`**
Add under `scripts`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 4: Verify**
```bash
npm test
```
Expected: `No test files found` (that's fine; Vitest is wired up).

### Task 0.3: Extend Tailwind theme with EVOQ tokens

**Files:** `tailwind.config.js`

**Step 1: Replace the config**
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './admin.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          brown: '#6b5f52',
          'brown-dark': '#4f463c',
          cream: '#f5f1e9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

**Step 2: Verify**
```bash
npm run typecheck
```
Expected: PASS. (No TS files reference the tokens yet; this just verifies nothing regresses.)

### Task 0.4: Initialize shadcn/ui

**Files:**
- Create: `components.json`
- Create: `src/lib/utils.ts`
- Modify: `src/index.css` (or create if absent)
- Modify: `tsconfig.app.json` (path alias)
- Modify: `vite.config.ts` (path alias)

**Step 1: Run shadcn init (non-interactive equivalent by creating files manually to avoid prompts)**

Create `components.json`:
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

Create `src/lib/utils.ts`:
```ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Step 2: Create `src/index.css`** (full CSS variables block — standard shadcn new-york + slate)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 25 14% 37%;            /* brand brown in HSL */
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 25 14% 37%;
    --radius: 0.5rem;
  }
}

@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground; }
}
```

**Step 3: Add path alias to `tsconfig.app.json`**

Inside `compilerOptions`, add:
```json
"baseUrl": ".",
"paths": { "@/*": ["./src/*"] }
```

**Step 4: Add path alias to `vite.config.ts`**

Add to imports:
```ts
import path from 'path';
```

Inside the returned config object, add:
```ts
resolve: {
  alias: { '@': path.resolve(__dirname, './src') },
},
```

**Step 5: Update `tailwind.config.js` to add shadcn color tokens**

Merge into `theme.extend.colors`:
```js
border: 'hsl(var(--border))',
input: 'hsl(var(--input))',
ring: 'hsl(var(--ring))',
background: 'hsl(var(--background))',
foreground: 'hsl(var(--foreground))',
primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
```

Keep the existing `brand.*` keys.

**Step 6: Install the shadcn components we'll use**
```bash
npx shadcn@latest add button input label card dialog sheet dropdown-menu select badge table skeleton sonner tabs command switch separator tooltip checkbox
```

If the CLI prompts, accept defaults. Confirm files appear in `src/components/ui/`.

**Step 7: Verify**
```bash
npm run typecheck && npm run lint
```
Expected: PASS (shadcn components may warn on unused imports in `ui/*`; if lint fails on them, add `src/components/ui/**` to `eslint.config.js` ignores).

### Task 0.5: Create `fmt.ts` with full tests (TDD)

**Files:**
- Create: `src/admin/lib/fmt.ts`
- Create: `src/admin/lib/fmt.test.ts`

**Step 1: Write failing tests in `fmt.test.ts`**
```ts
import { describe, it, expect } from 'vitest';
import { formatCurrencyCents, formatRelativeTime, formatPercentDelta } from './fmt';

describe('formatCurrencyCents', () => {
  it('formats whole dollars', () => {
    expect(formatCurrencyCents(10000)).toBe('$100.00');
  });
  it('formats zero', () => {
    expect(formatCurrencyCents(0)).toBe('$0.00');
  });
  it('formats fractional cents', () => {
    expect(formatCurrencyCents(199)).toBe('$1.99');
  });
  it('handles null/undefined as $0.00', () => {
    expect(formatCurrencyCents(null)).toBe('$0.00');
    expect(formatCurrencyCents(undefined)).toBe('$0.00');
  });
});

describe('formatRelativeTime', () => {
  it('returns "just now" under 60s', () => {
    const now = new Date();
    expect(formatRelativeTime(now, now)).toBe('just now');
  });
  it('returns minutes under 1h', () => {
    const base = new Date('2026-04-20T12:00:00Z');
    const past = new Date('2026-04-20T11:55:00Z');
    expect(formatRelativeTime(past, base)).toBe('5m ago');
  });
  it('returns hours under 24h', () => {
    const base = new Date('2026-04-20T12:00:00Z');
    const past = new Date('2026-04-20T09:00:00Z');
    expect(formatRelativeTime(past, base)).toBe('3h ago');
  });
  it('returns days when older', () => {
    const base = new Date('2026-04-20T12:00:00Z');
    const past = new Date('2026-04-17T12:00:00Z');
    expect(formatRelativeTime(past, base)).toBe('3d ago');
  });
});

describe('formatPercentDelta', () => {
  it('formats positive delta with arrow', () => {
    expect(formatPercentDelta(120, 100)).toEqual({ text: '↑ 20%', direction: 'up' });
  });
  it('formats negative delta', () => {
    expect(formatPercentDelta(80, 100)).toEqual({ text: '↓ 20%', direction: 'down' });
  });
  it('handles prev=0 as no delta', () => {
    expect(formatPercentDelta(50, 0)).toEqual({ text: '—', direction: 'flat' });
  });
  it('handles zero delta', () => {
    expect(formatPercentDelta(100, 100)).toEqual({ text: '0%', direction: 'flat' });
  });
});
```

**Step 2: Run tests to verify they fail**
```bash
npm test -- fmt.test
```
Expected: FAIL (module does not exist).

**Step 3: Implement `fmt.ts`**
```ts
export function formatCurrencyCents(cents: number | null | undefined): string {
  const value = (cents ?? 0) / 100;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export function formatRelativeTime(date: Date | string, now: Date = new Date()): string {
  const then = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const diffS = Math.floor(diffMs / 1000);
  if (diffS < 60) return 'just now';
  const diffM = Math.floor(diffS / 60);
  if (diffM < 60) return `${diffM}m ago`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

export function formatPercentDelta(
  current: number,
  previous: number
): { text: string; direction: 'up' | 'down' | 'flat' } {
  if (previous === 0) return { text: '—', direction: 'flat' };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct > 0) return { text: `↑ ${pct}%`, direction: 'up' };
  if (pct < 0) return { text: `↓ ${Math.abs(pct)}%`, direction: 'down' };
  return { text: '0%', direction: 'flat' };
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
```

**Step 4: Run tests again**
```bash
npm test -- fmt.test
```
Expected: PASS (all 11 tests).

### Task 0.6: Create React Query client + provider shell

**Files:**
- Create: `src/admin/lib/queryClient.ts`

```ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});
```

No tests needed — pure config. Verified by typecheck.

### Task 0.7: Phase 0 verification

```bash
npm test && npm run typecheck && npm run lint
```
Expected: PASS all three. Commit not applicable (no git).

---

## Phase 1: Shell, routing, login, auth

Mount React into `admin.html`. Implement login page, admin shell (sidebar + topbar + outlet), auth gate, and logout. No real page content yet — each page is a placeholder.

### Task 1.1: Replace `admin.html` body with React root

**Files:** `admin.html`

**Step 1: Rewrite the file**

Keep the `<head>` (favicons, title, Chart.js CDN, meta tags). Replace the entire `<body>` and the inline `<style>` block with:

```html
<body class="antialiased">
  <div id="admin-root"></div>
  <script type="module" src="/src/admin/main.tsx"></script>
</body>
```

**Step 2: Remove the inline `<style>` block** (lines ~17–472 of the current admin.html, everything inside `<style>...</style>`). Remove the `<link rel="stylesheet" href="/styles.css">` (we want the admin isolated from the public stylesheet). Keep the Chart.js `<script>` CDN tag in `<head>` since DashboardPage and AnalyticsPage use it.

**Step 3: Verify**
```bash
npm run dev
```
Open `http://localhost:5173/admin.html` in the browser. Expected: blank page, no console errors. `#admin-root` exists in the DOM.

### Task 1.2: Create React entry + router skeleton

**Files:**
- Create: `src/admin/main.tsx`
- Create: `src/admin/App.tsx`
- Create: `src/admin/pages/DashboardPage.tsx` (placeholder)
- Create: `src/admin/pages/ProductsPage.tsx` (placeholder)
- Create: `src/admin/pages/PromosPage.tsx` (placeholder)
- Create: `src/admin/pages/OrdersPage.tsx` (placeholder)
- Create: `src/admin/pages/OrderDetailPage.tsx` (placeholder)
- Create: `src/admin/pages/AnalyticsPage.tsx` (placeholder)
- Create: `src/admin/shell/LoginScreen.tsx` (placeholder)
- Create: `src/admin/shell/AdminShell.tsx` (placeholder outlet)

**Step 1: `main.tsx`**
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { App } from './App';
import '../index.css';

ReactDOM.createRoot(document.getElementById('admin-root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
```

**Step 2: `App.tsx`**
```tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { AdminShell } from './shell/AdminShell';
import { LoginScreen } from './shell/LoginScreen';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPage } from './pages/ProductsPage';
import { PromosPage } from './pages/PromosPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

export function App() {
  return (
    <Routes>
      <Route path="/admin" element={<LoginScreen />} />
      <Route path="/admin.html" element={<Navigate to="/admin" replace />} />
      <Route element={<AdminShell />}>
        <Route path="/admin/dashboard" element={<DashboardPage />} />
        <Route path="/admin/products" element={<ProductsPage />} />
        <Route path="/admin/promos" element={<PromosPage />} />
        <Route path="/admin/orders" element={<OrdersPage />} />
        <Route path="/admin/orders/:id" element={<OrderDetailPage />} />
        <Route path="/admin/analytics" element={<AnalyticsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
```

**Step 3: Placeholder pages** (each file gets this pattern, substituting the name)
```tsx
export function DashboardPage() {
  return <div className="p-8"><h1 className="text-2xl font-semibold">Dashboard</h1></div>;
}
```
Repeat for Products, Promos, Orders, OrderDetail, Analytics.

**Step 4: Placeholder `LoginScreen.tsx`**
```tsx
export function LoginScreen() {
  return <div className="p-8">Login (placeholder)</div>;
}
```

**Step 5: Placeholder `AdminShell.tsx`**
```tsx
import { Outlet } from 'react-router-dom';
export function AdminShell() {
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 border-r bg-slate-50">Sidebar</aside>
      <main className="flex-1"><Outlet /></main>
    </div>
  );
}
```

**Step 6: Verify**

Because Vite's dev server serves each HTML file at its own URL, you need to serve `admin.html` via the `/admin` path for BrowserRouter to work. Since the multi-page setup serves `admin.html` at `/admin.html`, we have two choices:

(a) **Recommended**: add a catch-all Netlify redirect so `/admin/*` → `/admin.html`. In `netlify.toml` add:
```toml
[[redirects]]
  from = "/admin/*"
  to = "/admin.html"
  status = 200
```

(b) For local dev, also hit `/admin.html#/admin/dashboard` by switching to `HashRouter` — **skip this**; do (a) and use `npm run preview` for local verification.

Add a `server.fs` rewrite for Vite dev — modify `vite.config.ts` to include a middleware:
```ts
plugins: [
  react(),
  {
    name: 'admin-path-alias',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url?.startsWith('/admin') && !req.url.endsWith('.html') && !req.url.includes('.')) {
          req.url = '/admin.html';
        }
        next();
      });
    },
  },
  /* existing html-transform plugin */
]
```

(Place `admin-path-alias` before `html-transform`.)

Also add `@vitejs/plugin-react` to the plugins array:
```ts
import react from '@vitejs/plugin-react';
```

**Step 7: Run and verify**
```bash
npm run dev
```
- Open `http://localhost:5173/admin` → redirects to login placeholder ("Login (placeholder)")
- Open `http://localhost:5173/admin/dashboard` → renders AdminShell with "Sidebar" and "Dashboard" heading
- Open each of `/admin/products`, `/admin/promos`, `/admin/orders`, `/admin/orders/abc`, `/admin/analytics` → each renders its placeholder
- No console errors

### Task 1.3: Create `useAdminAuth` hook (TDD on pure logic)

**Files:**
- Create: `src/admin/hooks/useAdminAuth.ts`
- Create: `src/admin/hooks/useAdminAuth.test.ts`

Wrap the existing `lib/adminApi.js`. The hook exposes: `isAuthed`, `login(token, remember)`, `logout()`, `restore()`. Use React state + effects — no Zustand/Redux needed.

**Step 1: Write failing tests**
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdminAuth } from './useAdminAuth';

vi.mock('../../../lib/adminApi.js', () => ({
  adminLogin: vi.fn(),
  adminLogout: vi.fn(),
  restoreSession: vi.fn(),
  isAuthenticated: vi.fn(),
  setSessionCallbacks: vi.fn(),
}));

import * as adminApi from '../../../lib/adminApi.js';

describe('useAdminAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('starts unauthenticated when no session exists', () => {
    vi.mocked(adminApi.restoreSession).mockReturnValue(false);
    vi.mocked(adminApi.isAuthenticated).mockReturnValue(false);
    const { result } = renderHook(() => useAdminAuth());
    expect(result.current.isAuthed).toBe(false);
  });

  it('starts authenticated when session restored', () => {
    vi.mocked(adminApi.restoreSession).mockReturnValue(true);
    vi.mocked(adminApi.isAuthenticated).mockReturnValue(true);
    const { result } = renderHook(() => useAdminAuth());
    expect(result.current.isAuthed).toBe(true);
  });

  it('login sets authed and persists token to localStorage when remember=true', async () => {
    vi.mocked(adminApi.adminLogin).mockResolvedValue({ token: 'jwt', expiresAt: Date.now() + 10000 });
    vi.mocked(adminApi.isAuthenticated).mockReturnValue(true);
    const { result } = renderHook(() => useAdminAuth());
    await act(async () => {
      await result.current.login('tok', true);
    });
    expect(result.current.isAuthed).toBe(true);
    expect(localStorage.getItem('evoq_admin_remember')).toBe('1');
  });

  it('login does NOT set remember flag when remember=false', async () => {
    vi.mocked(adminApi.adminLogin).mockResolvedValue({ token: 'jwt', expiresAt: Date.now() + 10000 });
    vi.mocked(adminApi.isAuthenticated).mockReturnValue(true);
    const { result } = renderHook(() => useAdminAuth());
    await act(async () => {
      await result.current.login('tok', false);
    });
    expect(localStorage.getItem('evoq_admin_remember')).toBeNull();
  });

  it('logout clears authed state', async () => {
    vi.mocked(adminApi.restoreSession).mockReturnValue(true);
    vi.mocked(adminApi.isAuthenticated).mockReturnValue(true);
    vi.mocked(adminApi.adminLogout).mockResolvedValue(undefined);
    const { result } = renderHook(() => useAdminAuth());
    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.isAuthed).toBe(false);
    expect(localStorage.getItem('evoq_admin_remember')).toBeNull();
  });
});
```

**Step 2: Run tests — expect FAIL**
```bash
npm test -- useAdminAuth
```

**Step 3: Implement `useAdminAuth.ts`**
```ts
import { useCallback, useEffect, useState } from 'react';
import {
  adminLogin,
  adminLogout,
  restoreSession,
  isAuthenticated,
  setSessionCallbacks,
} from '../../../lib/adminApi.js';

const REMEMBER_KEY = 'evoq_admin_remember';

export function useAdminAuth() {
  const [isAuthed, setIsAuthed] = useState(() => {
    const restored = restoreSession();
    return restored && isAuthenticated();
  });

  useEffect(() => {
    setSessionCallbacks({
      onExpired: () => setIsAuthed(false),
    });
  }, []);

  const login = useCallback(async (token: string, remember: boolean) => {
    await adminLogin(token);
    if (remember) {
      try { localStorage.setItem(REMEMBER_KEY, '1'); } catch {}
    } else {
      try { localStorage.removeItem(REMEMBER_KEY); } catch {}
    }
    setIsAuthed(isAuthenticated());
  }, []);

  const logout = useCallback(async () => {
    await adminLogout();
    try { localStorage.removeItem(REMEMBER_KEY); } catch {}
    setIsAuthed(false);
  }, []);

  return { isAuthed, login, logout };
}
```

**Step 4: Run tests — expect PASS**
```bash
npm test -- useAdminAuth
```

### Task 1.4: Extend `lib/adminApi.js` to honor Remember me

**Files:** `lib/adminApi.js`

**Step 1: Modify `setToken` and `restoreSession`** to also write/read from `localStorage` when the remember flag is set.

In `setToken`, after the `sessionStorage.setItem` block, add:
```js
try {
  if (localStorage.getItem('evoq_admin_remember') === '1') {
    localStorage.setItem('evoq_admin_jwt', token);
    localStorage.setItem('evoq_admin_jwt_expires', String(expiresAt));
  }
} catch (e) {
  // Ignore storage errors
}
```

In `clearToken`, after the `sessionStorage.removeItem` block, add:
```js
try {
  localStorage.removeItem('evoq_admin_jwt');
  localStorage.removeItem('evoq_admin_jwt_expires');
} catch (e) {}
```

In `restoreSession`, replace the body with:
```js
export function restoreSession() {
  try {
    const storages = [localStorage, sessionStorage];
    for (const storage of storages) {
      const savedToken = storage.getItem('evoq_admin_jwt');
      const savedExpires = storage.getItem('evoq_admin_jwt_expires');
      if (savedToken && savedExpires) {
        const expiresAt = parseInt(savedExpires, 10);
        if (Date.now() < expiresAt) {
          jwtToken = savedToken;
          tokenExpiresAt = expiresAt;
          scheduleTokenRefresh();
          return true;
        }
      }
    }
    clearToken();
  } catch (e) {
    // Ignore
  }
  return false;
}
```

**Step 2: Verify** — run the existing `useAdminAuth` tests again; they should still pass since they mock the module. Manual browser test deferred to Task 1.6 (full login flow).

### Task 1.5: Build the real LoginScreen

**Files:** `src/admin/shell/LoginScreen.tsx`

**Step 1: Replace placeholder**
```tsx
import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminAuth } from '../hooks/useAdminAuth';

export function LoginScreen() {
  const { isAuthed, login } = useAdminAuth();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthed) return <Navigate to="/admin/dashboard" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(token, remember);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError((err as Error).message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-brand-brown" />
            <CardTitle className="text-xl">EVOQ · Admin</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Admin access token</Label>
              <Input
                id="token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                autoComplete="current-password"
                required
                autoFocus
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(v === true)} />
              <Label htmlFor="remember" className="cursor-pointer">Remember me on this device</Label>
            </div>
            <Button type="submit" className="w-full" disabled={loading || !token}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Verify in browser**
- `npm run server` (separate terminal) — backend must be up for login to work
- `npm run dev`
- Visit `/admin` → centered login card on slate background
- Empty submit disabled (Sign in button greyed)
- Wrong token → "Signing in…" briefly → error message appears under field
- Correct token → redirected to `/admin/dashboard`
- Refresh with Remember me → still authed (localStorage); without → logged out (sessionStorage cleared on tab close, persists across reloads in same tab)

### Task 1.6: Auth gate for AdminShell

**Files:** `src/admin/shell/AdminShell.tsx`

**Step 1: Replace placeholder**
```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Toaster } from '@/components/ui/sonner';

export function AdminShell() {
  const { isAuthed } = useAdminAuth();
  if (!isAuthed) return <Navigate to="/admin" replace />;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 min-w-0"><Outlet /></main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}
```

### Task 1.7: Sidebar component

**Files:** `src/admin/shell/Sidebar.tsx`

```tsx
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Package, Tag, BarChart3, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { useNavigate } from 'react-router-dom';

const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/promos', label: 'Promos', icon: Tag },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

export function Sidebar() {
  const { logout } = useAdminAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/admin', { replace: true });
  }

  return (
    <aside className="w-60 shrink-0 border-r bg-white flex flex-col">
      <div className="h-14 border-b flex items-center px-4 gap-2">
        <div className="h-6 w-6 rounded bg-brand-brown" />
        <span className="font-semibold">EVOQ</span>
        <span className="text-xs text-muted-foreground ml-auto uppercase tracking-wider">Admin</span>
      </div>
      <nav className="flex-1 py-4 px-2 space-y-1">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                'text-slate-700 hover:bg-slate-100',
                isActive && 'bg-slate-100 text-brand-brown-dark font-medium border-l-2 border-brand-brown -ml-[2px] pl-[calc(0.75rem-2px)]'
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-2 border-t">
        <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-3" />
          Log out
        </Button>
      </div>
    </aside>
  );
}
```

### Task 1.8: TopBar component (with breadcrumb derived from route)

**Files:** `src/admin/shell/TopBar.tsx`

```tsx
import { useLocation, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

const TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  orders: 'Orders',
  products: 'Products',
  promos: 'Promos',
  analytics: 'Analytics',
};

export function TopBar() {
  const location = useLocation();
  const params = useParams();
  const parts = location.pathname.split('/').filter(Boolean); // ['admin','orders','123']
  const section = parts[1] ?? 'dashboard';
  const title = TITLES[section] ?? '';

  const crumb = params.id ? `${title} › #${params.id}` : title;

  return (
    <header className="h-14 bg-white border-b px-6 flex items-center justify-between">
      <h1 className="font-semibold text-slate-900">{crumb}</h1>
      <Button variant="outline" size="sm" className="text-muted-foreground" disabled>
        <Search className="h-3.5 w-3.5 mr-2" />
        <span className="text-xs">⌘K</span>
      </Button>
    </header>
  );
}
```

⌘K is wired in Phase 7. For now, button is disabled and placeholder.

### Task 1.9: Phase 1 verification

```bash
npm test && npm run typecheck && npm run lint
```

Browser verification:
- `/admin` → login card
- Wrong token → error visible
- Correct token → `/admin/dashboard` with sidebar + topbar
- Click each nav item → routes change, active state highlights correct item, page title updates
- Click "Log out" → back to login, reload stays on login
- Login with Remember me → hard refresh → still authed
- Login without Remember me → close tab, reopen → back to login

---

## Phase 2: Dashboard

Build the dashboard landing page: time-range selector, KPI cards, "Orders to fulfill" + "Needs attention" action stacks, traffic chart.

### Task 2.1: `useAnalytics` and `useOrders` React Query hooks

**Files:**
- Create: `src/admin/hooks/useAnalytics.ts`
- Create: `src/admin/hooks/useOrders.ts`
- Create: `src/admin/hooks/useProducts.ts`

Each hook wraps the existing `lib/adminApi.js` function. Token is not needed as an argument when a JWT is already in place (the `adminFetch` helper reads from module state), so pass `null`.

```ts
// useAnalytics.ts
import { useQuery } from '@tanstack/react-query';
import { fetchAdminAnalytics } from '../../../lib/adminApi.js';

export type AnalyticsRange = 'daily' | 'week' | 'month' | '3months' | 'all';

export function useAnalytics(range: AnalyticsRange) {
  return useQuery({
    queryKey: ['analytics', range],
    queryFn: () => fetchAdminAnalytics(null, range),
    staleTime: 60_000,
  });
}
```

```ts
// useOrders.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdminOrders,
  updateAdminOrderStatus,
  deleteAdminOrder,
} from '../../../lib/adminApi.js';

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => fetchAdminOrders(null),
    refetchInterval: 30_000,
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderNumber, status }: { orderNumber: string; status: string }) =>
      updateAdminOrderStatus(null, orderNumber, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderNumber: string) => deleteAdminOrder(null, orderNumber),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}
```

```ts
// useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
} from '../../../lib/adminApi.js';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => fetchAdminProducts(null),
    staleTime: 60_000,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => createAdminProduct(null, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sku, payload }: { sku: string; payload: Record<string, unknown> }) =>
      updateAdminProduct(null, sku, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sku: string) => deleteAdminProduct(null, sku),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
}
```

Pattern repeats for promos in Phase 4.

### Task 2.2: KpiCard component

**Files:** `src/admin/components/KpiCard.tsx`

```tsx
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowUp, ArrowDown } from 'lucide-react';

type Props = {
  label: string;
  value: string;
  delta?: { text: string; direction: 'up' | 'down' | 'flat' };
};

export function KpiCard({ label, value, delta }: Props) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-3xl font-semibold mt-1 tabular-nums">{value}</div>
        {delta && (
          <div
            className={cn(
              'mt-2 text-xs flex items-center gap-1',
              delta.direction === 'up' && 'text-emerald-600',
              delta.direction === 'down' && 'text-red-600',
              delta.direction === 'flat' && 'text-muted-foreground'
            )}
          >
            {delta.direction === 'up' && <ArrowUp className="h-3 w-3" />}
            {delta.direction === 'down' && <ArrowDown className="h-3 w-3" />}
            <span>{delta.text} vs prev</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Task 2.3: Dashboard page — full build

**Files:**
- Create: `src/admin/components/EmptyState.tsx` (used on Dashboard and later pages)
- Replace: `src/admin/pages/DashboardPage.tsx`

**Step 1: EmptyState**
```tsx
import type { LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

type Props = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="text-center py-10 px-4">
      {Icon && <Icon className="h-8 w-8 mx-auto text-muted-foreground mb-3" />}
      <div className="font-medium">{title}</div>
      {description && <div className="text-sm text-muted-foreground mt-1">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

**Step 2: DashboardPage**
```tsx
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { KpiCard } from '../components/KpiCard';
import { EmptyState } from '../components/EmptyState';
import { useAnalytics, type AnalyticsRange } from '../hooks/useAnalytics';
import { useOrders } from '../hooks/useOrders';
import { useProducts } from '../hooks/useProducts';
import { formatCurrencyCents, formatRelativeTime } from '../lib/fmt';

const RANGE_LABELS: Record<AnalyticsRange, string> = {
  daily: 'Today',
  week: 'This week',
  month: 'This month',
  '3months': 'Last 3 months',
  all: 'All time',
};

const LOW_STOCK_THRESHOLD = 5;
const PENDING_STATUSES = ['pending_payment', 'paid'];

export function DashboardPage() {
  const [range, setRange] = useState<AnalyticsRange>('month');

  const analytics = useAnalytics(range);
  const orders = useOrders();
  const products = useProducts();

  const ordersInRange = useMemo(() => {
    if (!orders.data || !analytics.data?.startDate) return [];
    const start = new Date(analytics.data.startDate).getTime();
    const end = new Date(analytics.data.endDate).getTime();
    return orders.data.filter((o: any) => {
      const t = new Date(o.createdAt).getTime();
      return t >= start && t <= end;
    });
  }, [orders.data, analytics.data]);

  const revenueCents = ordersInRange
    .filter((o: any) => o.status !== 'cancelled')
    .reduce((sum: number, o: any) => sum + (o.totals?.totalCents ?? 0), 0);

  const uniqueVisitors = analytics.data?.uniqueVisitors ?? 0;
  const orderCount = ordersInRange.length;
  const conversion = uniqueVisitors > 0 ? (orderCount / uniqueVisitors) * 100 : 0;

  const pending = orders.data?.filter((o: any) => PENDING_STATUSES.includes(o.status)) ?? [];
  const lowStock = products.data?.filter((p: any) => (p.stock ?? 0) < LOW_STOCK_THRESHOLD && p.status === 'active') ?? [];

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Overview for {RANGE_LABELS[range].toLowerCase()}</p>
        </div>
        <Select value={range} onValueChange={(v) => setRange(v as AnalyticsRange)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(RANGE_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {analytics.isLoading ? (
          <>
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </>
        ) : (
          <>
            <KpiCard label="Revenue" value={formatCurrencyCents(revenueCents)} />
            <KpiCard label="Orders" value={String(orderCount)} />
            <KpiCard label="Visitors" value={uniqueVisitors.toLocaleString()} />
            <KpiCard label="Conversion" value={`${conversion.toFixed(1)}%`} />
          </>
        )}
      </div>

      {/* Action stacks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Orders to fulfill</CardTitle>
            <Link to="/admin/orders?status=pending_payment,paid" className="text-sm text-brand-brown hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {orders.isLoading ? (
              <div className="space-y-2"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
            ) : pending.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="You're all caught up." />
            ) : (
              <ul className="divide-y">
                {pending.slice(0, 5).map((o: any) => (
                  <li key={o.orderNumber}>
                    <Link to={`/admin/orders/${o.orderNumber}`} className="flex items-center justify-between py-3 hover:bg-slate-50 -mx-2 px-2 rounded">
                      <div className="min-w-0">
                        <div className="font-mono text-sm">#{o.orderNumber}</div>
                        <div className="text-sm text-muted-foreground truncate">{o.customer?.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium tabular-nums">{formatCurrencyCents(o.totals?.totalCents)}</div>
                        <div className="text-xs text-muted-foreground">{formatRelativeTime(o.createdAt)}</div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Needs attention</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Low stock (&lt; {LOW_STOCK_THRESHOLD})</div>
              {products.isLoading ? (
                <Skeleton className="h-10" />
              ) : lowStock.length === 0 ? (
                <div className="text-sm text-muted-foreground">Everything's well stocked.</div>
              ) : (
                <ul className="space-y-2">
                  {lowStock.slice(0, 5).map((p: any) => (
                    <li key={p.sku} className="flex items-center justify-between text-sm">
                      <Link to={`/admin/products?sku=${p.sku}`} className="hover:underline">{p.name}</Link>
                      <Badge variant="destructive">{p.stock ?? 0} left</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Traffic chart */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Traffic</CardTitle></CardHeader>
        <CardContent>
          <TrafficChart analytics={analytics.data} />
        </CardContent>
      </Card>
    </div>
  );
}
```

### Task 2.4: Extract TrafficChart component

**Files:**
- Create: `src/admin/components/TrafficChart.tsx`

This wraps the existing Chart.js CDN-loaded library. Chart.js is already globally available via the script tag in `admin.html` — no npm install needed.

**Step 1: Add a global type declaration**

In `src/admin/env.d.ts` (create if absent):
```ts
declare const Chart: any;
```

**Step 2: Component**
```tsx
import { useEffect, useRef } from 'react';

type TsPoint = { label: string; pageViews: number; uniqueVisitors: number };

type Props = {
  analytics: {
    timeSeries?: { homepage?: TsPoint[]; products?: TsPoint[] };
  } | undefined;
};

export function TrafficChart({ analytics }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current || !analytics) return;

    const home = analytics.timeSeries?.homepage ?? [];
    const prods = analytics.timeSeries?.products ?? [];
    const labels = Array.from(new Set([...home, ...prods].map((p) => p.label)));

    const dataFor = (series: TsPoint[], field: 'pageViews' | 'uniqueVisitors') =>
      labels.map((l) => series.find((p) => p.label === l)?.[field] ?? 0);

    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Homepage views', data: dataFor(home, 'pageViews'), borderColor: '#6b5f52', backgroundColor: 'rgba(107,95,82,0.1)', tension: 0.25, fill: true },
          { label: 'Products views', data: dataFor(prods, 'pageViews'), borderColor: '#4f463c', backgroundColor: 'rgba(79,70,60,0.1)', tension: 0.25, fill: true },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });

    return () => {
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }
    };
  }, [analytics]);

  return (
    <div className="h-[300px] relative">
      <canvas ref={canvasRef} />
    </div>
  );
}
```

### Task 2.5: Phase 2 verification

```bash
npm test && npm run typecheck && npm run lint
```

Browser verification:
- `/admin/dashboard` renders 4 KPI cards with real numbers
- Change range dropdown → KPIs + chart update
- Pending orders list shows up to 5 `pending_payment`/`paid` orders (or empty state)
- Low-stock card shows products with stock < 5 (or reassuring message)
- Traffic chart renders both series and is responsive
- Click a pending order → navigates to `/admin/orders/:id` (placeholder for now)

---

## Phase 3: Products page

### Task 3.1: DataTable component (shared, generic)

**Files:** `src/admin/components/DataTable.tsx`

```tsx
import { type ReactNode, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Column<T> = {
  key: string;
  header: string;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  cell: (row: T) => ReactNode;
  className?: string;
};

type Props<T> = {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selected?: Set<string>;
  onSelectedChange?: (next: Set<string>) => void;
  empty?: ReactNode;
};

export function DataTable<T>({ rows, columns, rowKey, onRowClick, selectable, selected, onSelectedChange, empty }: Props<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = sortKey
    ? [...rows].sort((a, b) => {
        const col = columns.find((c) => c.key === sortKey);
        if (!col?.sortValue) return 0;
        const av = col.sortValue(a);
        const bv = col.sortValue(b);
        if (av === bv) return 0;
        const cmp = av < bv ? -1 : 1;
        return sortDir === 'asc' ? cmp : -cmp;
      })
    : rows;

  function toggleSort(key: string) {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); return; }
    if (sortDir === 'asc') { setSortDir('desc'); return; }
    setSortKey(null);
  }

  const allSelected = selectable && rows.length > 0 && rows.every((r) => selected?.has(rowKey(r)));

  function toggleAll(checked: boolean) {
    if (!onSelectedChange) return;
    if (checked) onSelectedChange(new Set(rows.map(rowKey)));
    else onSelectedChange(new Set());
  }

  function toggleRow(key: string, checked: boolean) {
    if (!onSelectedChange) return;
    const next = new Set(selected);
    if (checked) next.add(key); else next.delete(key);
    onSelectedChange(next);
  }

  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <div className="rounded-md border bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            {selectable && (
              <TableHead className="w-10">
                <Checkbox checked={!!allSelected} onCheckedChange={(v) => toggleAll(v === true)} />
              </TableHead>
            )}
            {columns.map((c) => (
              <TableHead key={c.key} className={c.className}>
                {c.sortable ? (
                  <button onClick={() => toggleSort(c.key)} className="flex items-center gap-1 hover:text-foreground">
                    {c.header}
                    {sortKey === c.key ? (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
                  </button>
                ) : c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => {
            const k = rowKey(row);
            return (
              <TableRow
                key={k}
                className={cn(onRowClick && 'cursor-pointer')}
                onClick={(e) => {
                  // Don't trigger row click when clicking inside a checkbox or link
                  if ((e.target as HTMLElement).closest('button, a, input, [role="checkbox"]')) return;
                  onRowClick?.(row);
                }}
              >
                {selectable && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selected?.has(k) ?? false} onCheckedChange={(v) => toggleRow(k, v === true)} />
                  </TableCell>
                )}
                {columns.map((c) => (
                  <TableCell key={c.key} className={c.className}>{c.cell(row)}</TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
```

### Task 3.2: StatusChip component

**Files:** `src/admin/components/StatusChip.tsx`

```tsx
import { cn } from '@/lib/utils';

const VARIANTS: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  coming_soon: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  inactive: 'bg-slate-100 text-slate-600 ring-slate-600/20',

  pending_payment: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  paid: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  fulfilled: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  cancelled: 'bg-red-50 text-red-700 ring-red-600/20',
};

const LABELS: Record<string, string> = {
  active: 'Active',
  coming_soon: 'Coming soon',
  inactive: 'Inactive',
  pending_payment: 'Pending payment',
  paid: 'Paid',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
};

export function StatusChip({ status }: { status: string }) {
  const cls = VARIANTS[status] ?? 'bg-slate-100 text-slate-600 ring-slate-600/20';
  const label = LABELS[status] ?? status;
  return <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs ring-1 ring-inset', cls)}>{label}</span>;
}
```

### Task 3.3: ConfirmDialog component

**Files:** `src/admin/components/ConfirmDialog.tsx`

```tsx
import { useState, type ReactNode } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmText?: string;
  confirmVariant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
  typeToConfirm?: string;
};

export function ConfirmDialog({ open, onOpenChange, title, description, confirmText = 'Confirm', confirmVariant = 'default', onConfirm, typeToConfirm }: Props) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const canConfirm = !typeToConfirm || value === typeToConfirm;

  async function handle() {
    setBusy(true);
    try { await onConfirm(); onOpenChange(false); setValue(''); } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setValue(''); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {typeToConfirm && (
          <div className="space-y-2">
            <div className="text-sm">Type <code className="bg-slate-100 px-1 rounded">{typeToConfirm}</code> to confirm.</div>
            <Input value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant={confirmVariant} disabled={!canConfirm || busy} onClick={handle}>
            {busy ? 'Working…' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Task 3.4: ProductDrawer

**Files:** `src/admin/components/ProductDrawer.tsx`

```tsx
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from './ConfirmDialog';
import { useCreateProduct, useUpdateProduct, useDeleteProduct } from '../hooks/useProducts';
import { toast } from 'sonner';

export type ProductDraft = {
  sku: string; name: string; price: number; stock: number;
  description: string; image: string; categories: string;
  coa: string; status: 'active' | 'coming_soon' | 'inactive';
};

const EMPTY: ProductDraft = { sku: '', name: '', price: 0, stock: 0, description: '', image: '', categories: '', coa: '', status: 'active' };

function fromProduct(p: any): ProductDraft {
  return {
    sku: p.sku, name: p.name, price: p.price, stock: p.stock ?? 0,
    description: p.description ?? '', image: p.image ?? '',
    categories: Array.isArray(p.categories) ? p.categories.join(', ') : '',
    coa: p.coa ?? '', status: p.status,
  };
}

type Props = { open: boolean; onOpenChange: (v: boolean) => void; product: any | null };

export function ProductDrawer({ open, onOpenChange, product }: Props) {
  const isNew = !product;
  const [draft, setDraft] = useState<ProductDraft>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const create = useCreateProduct();
  const update = useUpdateProduct();
  const del = useDeleteProduct();

  useEffect(() => {
    if (open) { setDraft(product ? fromProduct(product) : EMPTY); setDirty(false); }
  }, [open, product]);

  function set<K extends keyof ProductDraft>(k: K, v: ProductDraft[K]) {
    setDraft((d) => ({ ...d, [k]: v })); setDirty(true);
  }

  async function save() {
    const payload = {
      sku: draft.sku, name: draft.name, description: draft.description,
      priceCents: Math.round(Number(draft.price) * 100),
      image: draft.image,
      categories: draft.categories.split(',').map((c) => c.trim()).filter(Boolean),
      coa: draft.coa, stock: Number(draft.stock), status: draft.status,
    };
    try {
      if (isNew) await create.mutateAsync(payload);
      else await update.mutateAsync({ sku: product.sku, payload });
      toast.success(isNew ? 'Product created' : 'Product updated');
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function handleDelete() {
    try {
      await del.mutateAsync(product.sku);
      toast.success('Product deleted');
      onOpenChange(false);
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col">
        <SheetHeader><SheetTitle>{isNew ? 'Add product' : `Edit ${product?.name ?? ''}`}</SheetTitle></SheetHeader>
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>SKU</Label><Input value={draft.sku} onChange={(e) => set('sku', e.target.value)} disabled={!isNew} /></div>
            <div className="space-y-1.5"><Label>Name</Label><Input value={draft.name} onChange={(e) => set('name', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Price (USD)</Label><Input type="number" step="0.01" min="0" value={draft.price} onChange={(e) => set('price', Number(e.target.value))} /></div>
            <div className="space-y-1.5"><Label>Stock</Label><Input type="number" min="0" value={draft.stock} onChange={(e) => set('stock', Number(e.target.value))} /></div>
          </div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea rows={3} value={draft.description} onChange={(e) => set('description', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Image path</Label><Input value={draft.image} onChange={(e) => set('image', e.target.value)} placeholder="/images/file.webp" /></div>
            <div className="space-y-1.5"><Label>Categories</Label><Input value={draft.categories} onChange={(e) => set('categories', e.target.value)} placeholder="Peptide, Premium" /></div>
            <div className="space-y-1.5 col-span-2"><Label>COA path</Label><Input value={draft.coa} onChange={(e) => set('coa', e.target.value)} placeholder="/COAs/filename.pdf" /></div>
            <div className="space-y-1.5 col-span-2">
              <Label>Status</Label>
              <Select value={draft.status} onValueChange={(v) => set('status', v as ProductDraft['status'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="coming_soon">Coming soon</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <SheetFooter className="gap-2 pt-4 border-t">
          {!isNew && <Button variant="destructive" onClick={() => setConfirmDelete(true)}>Delete</Button>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={!dirty && !isNew}>{isNew ? 'Create' : 'Save'}</Button>
        </SheetFooter>
      </SheetContent>
      {!isNew && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`Delete ${product?.name ?? 'product'}?`}
          description="This cannot be undone."
          confirmText="Delete"
          confirmVariant="destructive"
          onConfirm={handleDelete}
          typeToConfirm={product?.sku}
        />
      )}
    </Sheet>
  );
}
```

(Requires `textarea` shadcn component — add via `npx shadcn@latest add textarea` if not already.)

### Task 3.5: ProductsPage full build

**Files:** `src/admin/pages/ProductsPage.tsx`

```tsx
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Plus, Search, Package } from 'lucide-react';
import { DataTable, type Column } from '../components/DataTable';
import { StatusChip } from '../components/StatusChip';
import { EmptyState } from '../components/EmptyState';
import { ProductDrawer } from '../components/ProductDrawer';
import { useProducts } from '../hooks/useProducts';
import { formatCurrencyCents } from '../lib/fmt';
import { Skeleton } from '@/components/ui/skeleton';

export function ProductsPage() {
  const { data, isLoading } = useProducts();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [drawer, setDrawer] = useState<{ open: boolean; product: any | null }>({ open: false, product: null });

  const rows = useMemo(() => {
    let list = (data ?? []) as any[];
    if (q) {
      const ql = q.toLowerCase();
      list = list.filter((p) => p.name?.toLowerCase().includes(ql) || p.sku?.toLowerCase().includes(ql));
    }
    if (status !== 'all') list = list.filter((p) => p.status === status);
    return list;
  }, [data, q, status]);

  const columns: Column<any>[] = [
    {
      key: 'image', header: '',
      cell: (p) => p.image ? <img src={p.image} alt="" className="h-10 w-10 rounded object-cover bg-slate-100" /> : <div className="h-10 w-10 rounded bg-slate-100" />,
      className: 'w-14',
    },
    {
      key: 'name', header: 'Name', sortable: true, sortValue: (p) => p.name ?? '',
      cell: (p) => <div className="min-w-0"><div className="font-medium truncate">{p.name}</div><div className="text-xs text-muted-foreground">{p.sku}</div></div>,
    },
    { key: 'price', header: 'Price', sortable: true, sortValue: (p) => p.price ?? 0, cell: (p) => <span className="tabular-nums">${(p.price ?? 0).toFixed(2)}</span>, className: 'w-24' },
    {
      key: 'stock', header: 'Stock', sortable: true, sortValue: (p) => p.stock ?? 0,
      cell: (p) => {
        const low = (p.stock ?? 0) < 5;
        return <span className={`tabular-nums ${low ? 'text-red-600' : ''}`}>{p.stock ?? 0}{low && ' ●'}</span>;
      },
      className: 'w-20',
    },
    { key: 'status', header: 'Status', cell: (p) => <StatusChip status={p.status} />, className: 'w-32' },
  ];

  return (
    <div className="p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-semibold">Products</h2>
          <p className="text-sm text-muted-foreground">{rows.length} of {data?.length ?? 0}</p>
        </div>
        <Button onClick={() => setDrawer({ open: true, product: null })}>
          <Plus className="h-4 w-4 mr-2" /> Add product
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or SKU…" className="pl-8" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="coming_soon">Coming soon</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Skeleton className="h-80" />
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(p) => p.sku}
          onRowClick={(p) => setDrawer({ open: true, product: p })}
          empty={<EmptyState icon={Package} title="No products match" description="Clear filters or add a new product." />}
        />
      )}

      <ProductDrawer open={drawer.open} onOpenChange={(v) => setDrawer({ ...drawer, open: v })} product={drawer.product} />
    </div>
  );
}
```

### Task 3.6: Phase 3 verification

```bash
npm test && npm run typecheck && npm run lint
```

Browser:
- `/admin/products` lists all products in a table with thumbnails
- Search filters live as you type
- Status filter narrows the list
- Click row → drawer opens with populated fields
- Edit + Save → toast, drawer closes, table updates (optimistic via React Query invalidate)
- Delete requires typing SKU → on confirm, row disappears
- Add product button opens empty drawer; Create → new row appears
- Column sort on Name / Price / Stock toggles asc/desc/none
- Low stock (< 5) renders in red with dot

---

## Phase 4: Promos page

### Task 4.0: SKIPPED — server already exposes `isActive` on the admin route

Confirmed during Phase 2: `server/src/routes/adminPromos.js` does its own `.map(promo => ({ code, discountType, discountValue, description, isActive }))` that bypasses the model's `toJSON` transform. So `isActive` is already on the wire for admin `GET /api/admin/promos`. No server change needed. Do NOT touch `server/src/models/PromoCode.js`.

### Task 4.1: usePromos hooks

**Files:** `src/admin/hooks/usePromos.ts` — same pattern as useProducts (query, create, update, delete).

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdminPromos, createAdminPromo, updateAdminPromo, deleteAdminPromo,
} from '../../../lib/adminApi.js';

type RawPromo = {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  description?: string;
  isActive?: boolean;
};

export function usePromos() {
  return useQuery({
    queryKey: ['promos'],
    queryFn: () => fetchAdminPromos(null),
    staleTime: 60_000,
    select: (data: unknown) => (data as { promos?: RawPromo[] } | null)?.promos ?? [],
  });
}
export function useCreatePromo() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (payload: any) => createAdminPromo(null, payload), onSuccess: () => qc.invalidateQueries({ queryKey: ['promos'] }) });
}
export function useUpdatePromo() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ code, payload }: { code: string; payload: any }) => updateAdminPromo(null, code, payload), onSuccess: () => qc.invalidateQueries({ queryKey: ['promos'] }) });
}
export function useDeletePromo() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (code: string) => deleteAdminPromo(null, code), onSuccess: () => qc.invalidateQueries({ queryKey: ['promos'] }) });
}
```

### Task 4.2: PromoDrawer

**Files:** `src/admin/components/PromoDrawer.tsx`

Mirrors `ProductDrawer`. Fields: `code`, `discountType` (percentage/fixed), `discountValue`, `description`, `isActive`. `code` is read-only when editing (it's the primary key). Delete requires typing the code to confirm.

(Use `Switch` shadcn component for `isActive`.)

### Task 4.3: PromosPage

**Files:** `src/admin/pages/PromosPage.tsx`

Same shape as ProductsPage. Columns: checkbox · code (mono) · type · value · active `Switch` (inline toggle, calls `useUpdatePromo` with just `{ isActive }`) · description · row menu. Search by code. Row click → PromoDrawer.

Inline switch implementation detail — optimistic update:
```tsx
const update = useUpdatePromo();
// inside cell:
<Switch
  checked={!!p.isActive}
  onCheckedChange={(checked) => {
    update.mutate({ code: p.code, payload: { isActive: checked } }, {
      onSuccess: () => toast.success(checked ? 'Promo activated' : 'Promo deactivated'),
      onError: (e: any) => toast.error(e.message),
    });
  }}
  onClick={(e) => e.stopPropagation()}
/>
```

### Task 4.4: Phase 4 verification

```bash
npm test && npm run typecheck && npm run lint
```

Browser:
- `/admin/promos` shows codes with live active switch
- Flipping switch saves immediately with toast
- Row click opens drawer with all fields
- Create / update / delete round-trip to server correctly
- Deleted promo disappears from list

---

## Phase 5: Orders list + detail

### Task 5.1: Orders list page with URL-synced filters

**Files:** `src/admin/pages/OrdersPage.tsx`

Chip toggles for status: All · Pending payment · Paid · Fulfilled · Cancelled. Sync to `?status=` query param. Search by order number, customer name, or email.

Use `useSearchParams` from react-router-dom.

Columns: checkbox · order # (mono) · customer (name + email stacked) · items count · total · status chip · placed (relative time) · row menu.

Row click → `navigate(\`/admin/orders/\${o.orderNumber}\`)`.

Skip complex pagination for now; if orders list > 50, add a "Load more" button at the bottom (backend currently returns all — verify limit in `server/src/routes/adminOrders.js`).

Sidebar badge requirement: update `Sidebar.tsx` to fetch `useOrders()` and show a badge next to the Orders item when `pending_payment` + `paid` count > 0.

In Sidebar:
```tsx
import { useOrders } from '../hooks/useOrders';
// inside component:
const orders = useOrders();
const pendingCount = orders.data?.filter((o: any) => ['pending_payment', 'paid'].includes(o.status)).length ?? 0;
// in NAV map, for Orders:
<NavLink ...>
  <Icon ... />
  {label}
  {to === '/admin/orders' && pendingCount > 0 && (
    <Badge variant="destructive" className="ml-auto">{pendingCount}</Badge>
  )}
</NavLink>
```

### Task 5.2: Order detail page

**Files:** `src/admin/pages/OrderDetailPage.tsx`

Route: `/admin/orders/:id`. Two-column (left main, right aside). Header: back link, order number, status chip, Delete button, status `<Select>` (Pending payment / Paid / Fulfilled / Cancelled).

Left column:
- **Items** card: table of `order.items` (sku, name, qty, unit price from `priceCents`, line total from `lineTotalCents`)
- **Totals** card: subtotal, discount (show promo code if `order.promoCode`), shipping, total — all from `order.totals.*Cents` via `formatCurrencyCents`

Right column:
- **Customer**: name, email (mailto link)
- **Shipping address**: address, city, state, zip
- **Payment**: if `order.venmoNote` exists, show "Venmo" + the note; else show "—"

Fetch via direct React Query on the list endpoint and filter client-side (simpler than a new GET-by-id hook; list is small). If the list is large enough to matter, add a `fetchAdminOrder(id)` function to `adminApi.js` and a `useOrder(id)` hook.

Actions:
- Status `<Select>` onChange → `useUpdateOrderStatus().mutateAsync(...)` + optimistic toast
- Delete button → ConfirmDialog (type the order number to confirm) → `useDeleteOrder()` → navigate back to `/admin/orders`

### Task 5.3: Phase 5 verification

```bash
npm test && npm run typecheck && npm run lint
```

Browser:
- `/admin/orders` loads list, filters work, chips show counts
- URL updates as filters change (`/admin/orders?status=paid`)
- Sidebar "Orders" item shows badge with pending count
- Row click → order detail
- Change status → saves, toast, chip updates
- Delete order → confirm, redirect, row gone from list
- Order detail handles orders with no `venmoNote`, no `promoCode` without crashing

---

## Phase 6: Analytics page

### Task 6.1: AnalyticsPage

**Files:** `src/admin/pages/AnalyticsPage.tsx`

```tsx
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '../components/KpiCard';
import { TrafficChart } from '../components/TrafficChart';
import { useAnalytics, type AnalyticsRange } from '../hooks/useAnalytics';

const LABELS: Record<AnalyticsRange, string> = { daily: 'Today', week: 'Last 7 days', month: 'Last 30 days', '3months': 'Last 3 months', all: 'All time' };

export function AnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>('week');
  const { data, isLoading } = useAnalytics(range);

  const byPage = data?.byPage ?? {};
  const total = data?.totalPageViews ?? 0;
  const breakdownRows = Object.entries(byPage).map(([page, v]: [string, any]) => ({
    page, ...v, pct: total > 0 ? (v.pageViews / total) * 100 : 0,
  })).sort((a, b) => b.pageViews - a.pageViews);

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Analytics</h2>
        <Select value={range} onValueChange={(v) => setRange(v as AnalyticsRange)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isLoading ? (
          <><Skeleton className="h-28" /><Skeleton className="h-28" /></>
        ) : (
          <>
            <KpiCard label="Unique visitors" value={(data?.uniqueVisitors ?? 0).toLocaleString()} />
            <KpiCard label="Page views" value={(data?.totalPageViews ?? 0).toLocaleString()} />
          </>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>Traffic over time</CardTitle></CardHeader>
        <CardContent><TrafficChart analytics={data} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Breakdown by page</CardTitle></CardHeader>
        <CardContent>
          {breakdownRows.length === 0 ? (
            <p className="text-muted-foreground text-sm">No data in this range.</p>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="p-3">Page</th>
                    <th className="p-3">Visitors</th>
                    <th className="p-3">Views</th>
                    <th className="p-3 w-40">% of total</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdownRows.map((r) => (
                    <tr key={r.page} className="border-t">
                      <td className="p-3 capitalize">{r.page}</td>
                      <td className="p-3 tabular-nums">{r.uniqueVisitors.toLocaleString()}</td>
                      <td className="p-3 tabular-nums">{r.pageViews.toLocaleString()}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded bg-slate-100 overflow-hidden">
                            <div className="h-full bg-brand-brown" style={{ width: `${r.pct}%` }} />
                          </div>
                          <span className="tabular-nums w-10 text-right">{r.pct.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

### Task 6.2: Phase 6 verification

```bash
npm test && npm run typecheck && npm run lint
```

Browser:
- `/admin/analytics` renders with range selector defaulted to Last 7 days
- KPIs and chart update on range change
- Breakdown table lists every page returned by the API with correct percentages
- Empty range → "No data in this range."

---

## Phase 7: Polish pass

### Task 7.1: Cmd+K command palette

**Files:** `src/admin/shell/CommandPalette.tsx`, wire into `AdminShell` and `TopBar`.

Use shadcn `Command` (`CommandDialog`). Trigger on ⌘K / Ctrl+K. Items:
- Go to Dashboard / Orders / Products / Promos / Analytics
- For each loaded product: "Edit {name}" → navigate to `/admin/products?sku={sku}` (and ProductsPage reads `?sku` on mount to open its drawer)
- For each loaded promo: "Edit {code}"
- For each loaded order: "Open order #{number}"

Keyboard listener in `AdminShell` opens the palette.

### Task 7.2: Products page respects `?sku=` deep link

**Files:** `src/admin/pages/ProductsPage.tsx`

On mount, read `useSearchParams()` for `sku`. If present, find the product and open the drawer with it.

### Task 7.3: Mobile sidebar (Sheet)

**Files:** `src/admin/shell/AdminShell.tsx`, `src/admin/shell/TopBar.tsx`

Below 768px:
- Sidebar hidden by default
- TopBar shows a hamburger button that opens sidebar in a shadcn `Sheet` from the left
- Close on nav

Add a `useMobileNav` boolean state in AdminShell, pass a toggle to TopBar.

### Task 7.4: Responsive DataTable → stacked cards on mobile

**Files:** `src/admin/components/DataTable.tsx`

Add an optional `mobileCard?: (row: T) => ReactNode` prop. Below 640px, render `mobileCard` output as a stacked list instead of table rows. Apply to Orders list first (highest priority mobile use case). Products/Promos optional.

### Task 7.5: Global ErrorBoundary

**Files:** `src/admin/shell/ErrorBoundary.tsx`, wrap around `App` in `main.tsx`.

Class component catching render errors, showing a centered recovery card with "Reload" button.

### Task 7.6: Keyboard shortcuts

- `/` focuses the search input on the current page (if one exists)
- `Esc` is already wired by shadcn Dialog/Sheet
- `g` then `d / o / p / r / a` jumps to Dashboard/Orders/Products/pRomos/Analytics (nice-to-have; ship if it feels natural)

Implement as a hook `useKeyboardShortcuts()` used once in `AdminShell`.

### Task 7.7: Final audit pass

- Every page has loading skeletons and empty states
- Every mutation shows a success/error toast
- Every destructive action goes through ConfirmDialog
- All images have `alt`
- All form labels properly associated via shadcn Label + htmlFor
- No console errors on any page
- Tab key navigation works through forms and tables

### Task 7.8: Final verification

```bash
npm test && npm run typecheck && npm run lint && npm run build
```

Browser smoke test on production build (`npm run preview`):
- Login → dashboard → sidebar active states correct
- Create + edit + delete a test product
- Create + toggle + delete a test promo
- Open an order → change status → delete
- Analytics range sweep
- Mobile viewport (DevTools responsive mode at 375px): sidebar hamburger works, orders list readable as cards

---

## Out of scope (do not implement)

File uploads · customer management · user accounts/roles · activity log · fulfillment integrations · refund flow · rich-text product descriptions · product variants · settings page · multi-currency.

## Done

When the final audit passes and all four commands (`npm test`, `npm run typecheck`, `npm run lint`, `npm run build`) succeed, mark the overhaul complete and remove `admin.js` and the old inline `<style>` from `admin.html` (already done in Task 1.1, but confirm nothing references them — grep for `admin.js` in the codebase).
