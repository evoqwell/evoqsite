# EVOQ Wellness Storefront

Static HTML/vanilla-JS storefront (Vite build, Netlify) + Express/Mongoose API (Railway) + MongoDB Atlas. React/TypeScript admin SPA under `src/admin` served at `/admin`. Public pages: `index.html`, `shop.html`, `checkout.html`, `about.html`, `contact.html` with page scripts (`script.js`, `shop.js`, `checkout.js`) and shared modules in `lib/`.

The admin also hosts **Drea Hair** (`/admin/drea`), a standalone income/expense ledger for the owner's wife's hairstyling business. It uses its own `DreaEntry` collection and never mixes with EVOQ revenue, expenses, or analytics — keep it that way.

Checkout is Venmo by default; customers who can't use Venmo tick a box, confirm a phone number, and the order is stored with `paymentMethod: 'card'` so the owner can invoice them by hand. The site never processes cards.

Date-only fields (`<input type="date">`) must be parsed with `server/src/utils/dateOnly.js` — `new Date('2026-08-01')` is UTC midnight, which lands in the previous day/month under the Pacific timezone pinned in `config/tz.js`.

## Design Context

### Users
Mixed audience: curious first-time visitors researching wellness/peptide products (often arriving via social or word of mouth) alongside informed repeat buyers who want to reorder quickly. Both groups shop on a range of devices; no single device class dominates. The site is age-gated and products link to certificates of analysis (COAs), so trust and legitimacy signals matter to both groups.

### Brand Personality
Calm, premium, minimal. The interface should feel like an upscale wellness ritual — serene, unhurried, confident. It should evoke trust through restraint and quality of finish rather than loud claims. Checkout is manual (Venmo), so the experience must feel credible enough to offset the informal payment method.

### Aesthetic Direction
The owner explicitly likes the site's existing aesthetic: warm earthy palette (bone #F5F1E9, sand #D9CDBF, stone #8A7D6E, charcoal #333), Cormorant Garamond display serif paired with DM Sans, light theme, generous whitespace, soft shadows. Critiques and new work should refine and extend this direction, not replace it. Avoid: dark mode, neon/AI-gradient palettes, glassmorphism, anything clinical-cold or loud.

### Design Principles
1. **Refine, don't reinvent** — the established zen-premium look is the brand; polish within it.
2. **Trust through finish** — consistent spacing, typography, and states signal legitimacy (critical for a Venmo-checkout store).
3. **Serve two speeds** — first-timers need orientation and reassurance (COAs, about, guidance); repeat buyers need the fastest possible path to reorder.
4. **Calm motion** — subtle, decelerating transitions (ease-out-expo); nothing bouncy or attention-grabbing.
5. **Every word earns its place** — quiet, confident microcopy; no hype language.
