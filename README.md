# EVOQ Wellness Storefront

Production-ready storefront for EVOQ Wellness combining a static frontend with a minimal Node/Express API backed by MongoDB. Customers browse products, add them to a local cart, and submit orders that are verified server-side before being queued for Venmo payment and email notification.

## Features
- Server-validated checkout with promo code enforcement and calculated Venmo totals
- MongoDB product, promo, and order collections with simple seed script
- Transactional emails dispatched from the API via EmailJS (no client-side keys in the bundle)
- Static marketing pages with shared cart state, age gate, and responsive design
- Token-protected admin dashboard for managing catalog, promo codes, and order status
- Dynamic stock status with automatic out-of-stock indicators on the storefront
- Configurable flat-rate shipping and Venmo handle via environment variables

## Tech Stack
- **Frontend:** HTML5, CSS3, ES Modules, Vite build pipeline
- **Backend:** Node.js, Express, Mongoose
- **Database:** MongoDB (Atlas or self-hosted)

## Prerequisites
- Node.js 18+
- npm 9+
- MongoDB connection string (Atlas recommended)
- EmailJS service, template, and public key values (server-side usage)

## Setup

1. **Install dependencies**
   ```bash
   # Frontend (root)
   npm install

   # Backend
   cd server
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp server/.env.example server/.env
   # edit server/.env with your secrets
   ```

   | Variable | Description |
   |----------|-------------|
   | `MONGODB_URI` | Mongo connection string |
   | `VENMO_USERNAME` | Venmo business or personal username |
   | `ADMIN_EMAIL` | Internal address to receive new order alerts |
   | `FROM_EMAIL` | Friendly from address for customer emails |
   | `EMAILJS_SERVICE_ID` | EmailJS service ID |
   | `EMAILJS_BUYER_TEMPLATE_ID` | Template ID for buyer confirmation |
   | `EMAILJS_ADMIN_TEMPLATE_ID` | Template ID for internal notification |
   | `EMAILJS_PUBLIC_KEY` | EmailJS public key (`user_id`) |
   | `EMAILJS_ACCESS_TOKEN` | *(optional)* access token if using private key security |
   | `ADMIN_ACCESS_TOKEN` | Secret token required to reach the admin API and dashboard |
   | `SHIPPING_FLAT_RATE_CENTS` | (optional) flat-rate shipping in cents (default 1000 = $10) |

   Frontend build-time variables (set in `.env` or Netlify UI):

   | Variable | Description |
   |----------|-------------|
   | `VITE_SITE_URL` | Canonical site URL used in meta tags |
   | `VITE_API_BASE_URL` | Base URL for the API (e.g. `https://api.example.com`). Leave empty to use same-origin `/api`. |

3. **Seed product and promo data**
   ```bash
   npm run seed        # runs server/seed/seed.js via npm --prefix server
   ```

4. **Run locally**
   ```bash
   # Terminal 1 - API
   npm run server      # starts Express on PORT (defaults to 5000)

   # Terminal 2 - Frontend
   VITE_API_BASE_URL=http://localhost:5000 npm run dev
   ```

## Deployment

| Component | Recommendation |
|-----------|----------------|
| Frontend  | Netlify, Vercel, or static hosting serving `dist/` |
| Backend   | Render, Fly.io, Railway, or traditional VPS running `node server/src/index.js` |
| Database  | MongoDB Atlas with IP allow list and user-scoped credentials |

Configure CORS/HTTPS so the frontend can reach the API. For serverless platforms, adapt server/src/app.js to the platform's handler signature.

## Admin Dashboard
- Visit `/admin.html` while running the dev server (or the deployed build).
- Enter the value of `ADMIN_ACCESS_TOKEN` to unlock the dashboard.
- Manage products and promo codes directly from the UI; changes persist to MongoDB.
- Set a product's stock to 0 to mark it out of stock; the storefront will display a sold-out badge and disable checkout.
- Review incoming orders and update their status (`pending_payment`, `paid`, `fulfilled`, `cancelled`). Status changes are saved immediately.

## Data Management
- Product and promo definitions live in MongoDB; use the seed script or admin dashboard as a starting point.
- Each product uses `sku` as a stable IDâ€”avoid reusing the same SKU across different items.
- Orders are recorded with status `pending_payment`. Update status to `paid` once Venmo confirms payment so fulfillment can track progress.

## Testing Checklist
- `GET /api/products` returns active catalog and shipping rate
- Cart badge updates across pages (desktop & mobile)
- Checkout flow posts to `/api/orders`, server returns Venmo link and order number
- Promo codes validate against database, including rejection of inactive codes
- Emails delivered to both buyer and admin with full order summary
- Cart clears and confirmation modal displays after successful order
- Age gate still blocks under-21 visitors for 24 hours

## Project Scripts
| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build optimized frontend into `dist/` |
| `npm run preview` | Preview built frontend locally |
| `npm run server` | Launch Express API (`npm --prefix server start`) |
| `npm run seed` | Seed Mongo with starter products and promo codes |

Backend-specific scripts live under `server/package.json` if you prefer to work in that directory directly.

## Notes
- All secrets now live on the server; the browser bundle contains no API keys.
- Default shipping is $10; adjust `SHIPPING_FLAT_RATE_CENTS` to change.
- Large product imagery has not been re-encoded yet; consider swapping in optimized assets to improve Core Web Vitals.

---
Maintained by EVOQ Wellness. Contributions welcome via pull request. Reach out to `orders@evoqwellness.com` for operational questions.




