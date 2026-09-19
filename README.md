<div align="center">

# MANIESTA LABEL

**Premium contemporary fashion · Made in Pakistan**

[![Live Site](https://img.shields.io/badge/live-manieste--label.netlify.app-0E0E0E?style=for-the-badge)](https://manieste-label.netlify.app)
[![Firebase](https://img.shields.io/badge/firebase-auth%20%2B%20firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](#firebase)
[![Cloudinary](https://img.shields.io/badge/cloudinary-image%20cdn-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)](#image-management)
[![PWA](https://img.shields.io/badge/pwa-installable-B8896A?style=for-the-badge)](#progressive-web-app)

A production-ready ecommerce storefront for **MANIESTA LABEL** — a premium contemporary fashion house based in Karachi, Pakistan.

Built with vanilla HTML, CSS, and JavaScript. Firebase for authentication, database, and backend services. Cloudinary for image hosting.

[Live Site](https://manieste-label.netlify.app) · [Report Bug](../../issues) · [Request Feature](../../issues)

</div>

---

## Overview

MANIESTA LABEL is a design-first ecommerce storefront built around a small, deliberate catalogue — drop shoulders, overshirts, hoodies, and studio sets. This repository contains the full stack: customer storefront, authentication, cart, wishlist, checkout, order management, and an admin CMS.

The frontend is intentionally framework-free. It ships as static files, deploys anywhere in seconds, and uses Firebase services only where they add real value.

---

## Features

### Customer Storefront
- **Editorial homepage** — hero, featured, category grid, editorial block, new arrivals, best sellers, brand story, newsletter
- **Collection listing** with filter drawer, active filter chips, sort, grid density toggle, load-more pagination
- **Product detail** — image gallery, zoom on hover, variant picker, size guide, trust row, recently viewed
- **Deep-linked filters** — `?cat=T-Shirts&col=Atelier&sort=price-asc` restores full state
- **Search overlay** — `Ctrl+K` shortcut, live results, dedicated results page
- **Cart drawer** — slide-in, focus-trapped, live subtotal
- **Wishlist** — persistent, movable to cart

### Authentication & Accounts
- Email/password sign in, register, and password reset
- Google sign-in
- Session persistence across browser restarts
- Account dashboard with orders and addresses
- Header dropdown menu for signed-in users (My Account, My Orders, Wishlist, Sign Out)
- Password reset email delivery via Firebase Auth

### Checkout & Orders
- Full checkout form (contact, shipping address, country, notes)
- Firestore-backed order creation with item snapshots
- Order confirmation page with items, address, totals
- Order history in the account dashboard
- Guest cart merges into Firestore on sign-in
- Cart and wishlist sync between devices

### Admin CMS (`/admin.html`)
- **Dashboard** — stat cards (total orders, pending, shipped, delivered, revenue)
- **Products** — full CRUD, draft/publish/archive workflow, Cloudinary image upload, search, filter, pagination
- **Orders** — filter by status, view details, update status (pending → confirmed → processing → shipped → delivered / cancelled)
- **Role-based access** — only users with `role: admin` in Firestore can access

### Technical
- **Firebase Authentication** — email/password + Google
- **Cloud Firestore** — products, users, orders, cart, wishlist
- **Firestore Security Rules** — role-gated writes, user-scoped reads, no client-side admin escalation
- **Cloudinary** — CDN-backed image hosting, 25 GB free, no card required
- **PWA** — installable, offline-capable service worker, web app manifest
- **Responsive** — 320px to 1920px, mobile-first
- **Accessibility** — keyboard nav, focus traps, ARIA labels, reduced-motion support
- **SEO** — metadata, Open Graph, JSON-LD, sitemap, robots.txt

---

## Tech Stack

| Layer | Technology |
|---|---|
| Markup | HTML5 (semantic) |
| Styles | CSS3 — custom design system in `assets/css/manieste.css` |
| Behaviour | Vanilla JavaScript (ES modules for Firebase) |
| Auth | Firebase Authentication v10 (modular SDK) |
| Database | Cloud Firestore |
| Image CDN | Cloudinary |
| Icons | Font Awesome 5.15.1 |
| Fonts | Cormorant Garamond + Inter (Google Fonts) |
| PWA | Service worker + Web App Manifest |
| Hosting | Netlify (auto-deploy from `main`) |

**No build step. No package manager. Clone and open.**

---

## Project Structure

```
manieste-label/
├── index.html                      Homepage
├── shop.html                       Collection listing
├── product.html                    Product detail (?p=slug)
├── search.html                     Search results
├── cart.html                       Shopping bag
├── wishlist.html                   Saved pieces
├── account.html                    Sign in / register / orders / addresses
├── checkout.html                   Checkout form
├── order-confirmation.html         Post-purchase (?order=id)
├── admin.html                      Admin CMS (role-gated)
├── about.html · contact.html       Editorial
├── shipping.html · returns.html    Customer info
├── faq.html                        FAQ (24 questions)
├── privacy.html · terms.html       Legal
├── 404.html                        Not found
│
├── assets/
│   ├── css/
│   │   ├── manieste.css            Design system
│   │   ├── manieste-pages.css      Page layouts + admin styles
│   │   ├── manieste-animations.css Motion system
│   │   └── manieste-states.css     Loading / empty / error states
│   │
│   ├── js/
│   │   ├── main.js                 Storefront core
│   │   ├── manieste-phase2.js      Drawers, modals, search overlay
│   │   ├── manieste-phase3.js      Search page, account tabs
│   │   ├── manieste-phase4.js      PDP: zoom, JSON-LD, recently viewed
│   │   ├── manieste-phase5.js      Shop filters, chips, density
│   │   ├── manieste-phase8.js      A11y, live regions, prefetch
│   │   ├── manieste-responsive.js  Mobile overrides
│   │   ├── manieste-animations.js  Scroll reveals, stagger
│   │   ├── manieste-states.js      Skeleton loader orchestrator
│   │   └── firebase/
│   │       ├── firebase-config.js      Public config + feature flags
│   │       ├── firebase-init.js        Lazy SDK loader
│   │       ├── auth.js                 Auth wrapper
│   │       ├── auth-ui.js              Account page + header state
│   │       ├── header-auth.js          User dropdown menu
│   │       ├── products.js             Products bridge (cache/Firestore/JSON)
│   │       ├── cart-sync.js            Guest ↔ Firestore cart/wishlist sync
│   │       ├── orders.js               Order create / get / list
│   │       ├── checkout.js             Checkout flow
│   │       ├── order-confirmation.js   Confirmation page
│   │       ├── admin.js                Admin dashboard
│   │       └── admin-products.js       Product CRUD + Cloudinary upload
│   │
│   ├── data/
│   │   └── products.json           Seed data (7 products, 5 collections, 4 categories)
│   │
│   ├── img/                        Product photography
│   │   └── icons/                  PWA icons
│   │
│   └── webfonts/                   Font Awesome webfonts
│
├── manifest.json                   PWA manifest
├── sw.js                           Service worker
├── robots.txt                      SEO
├── sitemap.xml                     SEO
├── _redirects                      Netlify 404 routing
├── FIREBASE_ARCHITECTURE.md        Backend documentation
├── CREDITS.md                      Third-party licenses
└── README.md                       This file
```

---

## Quick Start

### Local development

Any static server works. `file://` won't work — the browser blocks `fetch()` for `products.json`.

```bash
# Option A — Python
python -m http.server 8000

# Option B — Node
npx serve .

# Option C — VS Code Live Server
# Right-click index.html → Open with Live Server
```

Open `http://localhost:8000`.

---

## Firebase Setup

If you fork this project, replace the config in `assets/js/firebase/firebase-config.js`:

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "...",
  appId: "..."
};

export const FEATURES = {
  AUTH:      true,
  FIRESTORE: true,
  STORAGE:   false,
  ANALYTICS: false
};
```

Then in the Firebase Console:

1. **Authentication** → enable Email/Password and Google
2. **Authentication → Settings → Authorized domains** → add `localhost`, `127.0.0.1`, and your Netlify domain
3. **Firestore Database** → create in `asia-south1` (Mumbai)
4. **Firestore Rules** → paste the rules from `FIREBASE_ARCHITECTURE.md`
5. **Create the composite index** for `orders` (`userId` ASC, `createdAt` DESC)

Full backend documentation is in [`FIREBASE_ARCHITECTURE.md`](FIREBASE_ARCHITECTURE.md).

---

## Cloudinary Setup

Image uploads in the admin use Cloudinary (free forever plan).

1. Sign up at [cloudinary.com](https://cloudinary.com) — no card required
2. Copy your **cloud name** from the dashboard
3. **Settings → Upload → Upload presets → Add upload preset**
   - Preset name: `manieste_unsigned`
   - Signing mode: **Unsigned**
   - Folder: `manieste/products`
   - Save
4. In `assets/js/firebase/admin-products.js`, set:
   ```js
   const CLOUDINARY_CLOUD_NAME = 'your-cloud-name';
   const CLOUDINARY_UPLOAD_PRESET = 'manieste_unsigned';
   ```

---

## Making Yourself Admin

Firestore rules prevent users from self-promoting to admin. It must be done manually once:

1. Firebase Console → **Authentication → Users** → copy your UID
2. **Firestore → Data → Start collection** `users`
3. Document ID: paste your UID
4. Add field: `role` (string) = `admin`
5. Sign out and back in on your site

You can now open `/admin.html`.

---

## Managing Products

### Create a product

1. `/admin.html` → **Products** → **+ New product**
2. Fill in:
   - Name, slug (auto-generated from name), short + full description
   - Price, compare-at price (optional)
   - Category, collection, stock
   - Sizes (multi-select)
   - Colors (name + hex)
   - Flags: Featured, Best seller, New arrival
3. Upload images via Cloudinary widget (or paste image URLs)
4. **Save as draft** or **Create & publish**

### Publishing workflow

| Status | Behavior |
|---|---|
| `draft` | Only visible in admin |
| `published` | Visible on storefront (shop, homepage, search) |
| `archived` | Hidden from public listings, still in admin |

Toggle with **Publish** / **Unpublish** buttons on the product row.

---

## Managing Orders

Admin → **Orders** tab:

- Filter by status (pending, confirmed, processing, shipped, delivered, cancelled)
- Click any order → view details in modal
- Change status via dropdown → saves immediately to Firestore

Order statuses persist. Customers cannot modify their own orders after creation.

---

## Firestore Data Model

### `products/{productId}`

```js
{
  name, slug, description, shortDesc,
  price, salePrice, category, collection,
  sizes: ["S", "M", "L", "XL"],
  colors: [{ name, hex }],
  images: ["https://res.cloudinary.com/..."],
  stock, inStock, rating, reviews, badge,
  featured, bestseller, newArrival,
  status: "draft" | "published" | "archived",
  createdAt, updatedAt
}
```

### `users/{uid}`

```js
{
  role: "customer" | "admin",
  cart: [{ key, id, name, slug, price, image, size, color, qty }],
  wishlist: ["productId"],
  updatedAt
}
```

### `orders/{orderId}`

```js
{
  userId, userEmail,
  customer: { name, email, phone },
  shippingAddress: { line1, line2, city, country, postalCode },
  items: [{ id, name, slug, price, image, size, color, qty }],
  subtotal, shipping, discount, total, currency,
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled",
  notes,
  createdAt, updatedAt
}
```

Full schemas and security rules are in [`FIREBASE_ARCHITECTURE.md`](FIREBASE_ARCHITECTURE.md).

---

## Deployment

Deployed on **Netlify**, auto-built from the `main` branch.

| Setting | Value |
|---|---|
| Build command | *(none)* |
| Publish directory | `.` |

Any push to `main` triggers a fresh deploy in ~20 seconds.

### Deploy your own

1. Fork this repo
2. [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
3. Connect your GitHub account
4. Set **Publish directory** to `.`
5. Deploy

**After deploy:** Add your Netlify URL to Firebase:
**Authentication → Settings → Authorized domains → Add domain**

Without this, Google sign-in fails on the live site. Email/password still works.

---

## Progressive Web App

Installable on Android (Chrome), iOS (Safari 16.4+), and desktop Chrome.

- **Android:** Chrome menu → Install app
- **iOS:** Safari Share → Add to Home Screen
- **Desktop:** ⊕ icon in address bar

The service worker caches core assets for offline use but **skips caching on `localhost`** so Live Server's hot reload works.

---

## Accessibility

- Semantic HTML landmarks
- Skip-to-content link on every page
- Full keyboard navigation with visible focus rings
- Focus traps on all drawers and modals
- `aria-live` regions announce cart and wishlist changes
- `prefers-reduced-motion` fully respected
- Touch targets ≥ 44×44 px on coarse pointers
- Windows High Contrast mode support

---

## Performance

- No framework, no jQuery, no runtime dependencies beyond CDN fonts
- Lazy-loaded images below the fold
- `fetchpriority="high"` on hero images
- Prefetch on link hover via `requestIdleCallback`
- Products cached 24h in `localStorage` (Firestore quota friendly)
- Firebase SDK loaded only where needed (module lazy imports)

**Spark plan impact:** ~500 visitors/day uses under 5% of the daily Firestore read quota thanks to caching.

---

## What's Not Included

This is a **frontend + Firebase** storefront. The following require additional work to go live as a fully commercial shop:

- **Payment processing** — checkout creates orders but does not charge cards. Integrate Stripe, Razorpay, or a Pakistani gateway (JazzCash, Easypaisa, Safepay) when ready.
- **Shipping rate calculation** — flat rate + free-over-₹5,000 logic exists; real carrier integration is future work.
- **Email notifications** — order confirmations and shipping updates aren't sent yet (would need Cloud Functions or a service like SendGrid).
- **Inventory decrement on order** — stock is set manually; automatic decrement needs a Cloud Function.
- **Tax calculation** — no tax logic yet.
- **Analytics charts** — stat cards exist; time-series charts are planned.
- **User last-seen tracking** — planned but not yet implemented.

Each is a defined future phase, not a hidden gap.

---

## Credits

**Designed and developed by [Usman Murtaza](https://usmanmurtaza.netlify.app)**

See [`CREDITS.md`](CREDITS.md) for third-party library attributions. All third-party copyright notices are preserved in their source files as required by their respective licenses.

The frontend structure was originally derived from a third-party ecommerce template. All original template branding, imagery, product data, and demo content have been removed and replaced.

---

## License

**Private project.** All rights reserved.

Do not redistribute, sublicense, or deploy without written permission from the owner.

Third-party libraries retain their original licenses:
- Bootstrap — MIT
- Font Awesome — CC BY 4.0 / SIL OFL 1.1 / MIT
- Inter font — SIL OFL 1.1
- Cormorant Garamond font — SIL OFL 1.1

---

<div align="center">

**MANIESTA LABEL**

*Premium contemporary fashion · Karachi, Pakistan*

[Instagram](#) · [Pinterest](#) · [Journal](#)

</div>
