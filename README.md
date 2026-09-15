<div align="center">

# MANIESTA LABEL

**Premium contemporary fashion · Made in Pakistan**

[![Live Site](https://img.shields.io/badge/live-manieste.netlify.app-0E0E0E?style=for-the-badge)](https://manieste.netlify.app)
[![License](https://img.shields.io/badge/license-private-8C8A85?style=for-the-badge)](#license)
[![PWA](https://img.shields.io/badge/PWA-installable-B8896A?style=for-the-badge)](#progressive-web-app)
[![Made in Pakistan](https://img.shields.io/badge/made%20in-Pakistan-1F6F43?style=for-the-badge)](https://en.wikipedia.org/wiki/Pakistan)

A static ecommerce storefront for **MANIESTA LABEL** — a premium contemporary fashion house based in Pakistan. Built with vanilla HTML, CSS, and JavaScript. No build step, no framework, no backend.

[Live Site](https://manieste.netlify.app) · [Report Bug](../../issues) · [Request Feature](../../issues)

</div>

---

## Overview

MANIESTA LABEL is a design-first storefront for a small, deliberate catalogue of premium essentials — drop shoulders, overshirts, hoodies, and studio sets. This repository contains the full frontend: homepage, collection listing, product detail, cart, wishlist, search, account shell, editorial pages, and legal pages.

The site is intentionally framework-free. It ships as static files, deploys anywhere in seconds, and runs entirely client-side. Cart and wishlist state persist through `localStorage`; checkout is a demo placeholder.

---

## Preview

> Replace these placeholders with real screenshots after deployment.

| Homepage | Collection | Product |
|:---:|:---:|:---:|
| ![Homepage](docs/screenshots/homepage.png) | ![Shop](docs/screenshots/shop.png) | ![Product](docs/screenshots/product.png) |

| Cart Drawer | Mobile | Search |
|:---:|:---:|:---:|
| ![Cart](docs/screenshots/cart.png) | ![Mobile](docs/screenshots/mobile.png) | ![Search](docs/screenshots/search.png) |

---

## Features

### Storefront
- **Editorial homepage** — hero, featured, category grid, editorial block, new arrivals, best sellers, brand story
- **Collection listing** with filter drawer, active filter chips, sort, density toggle, and load-more
- **Product detail** with image gallery, zoom on hover, variant picker, size guide, trust row, recently viewed
- **Deep-linked filters** — `?cat=T-Shirts&col=Atelier&sort=price-asc` restores full state
- **Search overlay** — `Ctrl+K` shortcut, instant results, dedicated results page
- **Cart drawer** — slide-in, focus-trapped, live subtotal
- **Wishlist** — persistent, viewable, removable

### Product Experience
- Multiple images per product with cross-fade hover
- Colour swatches with per-product variants
- Size selection with active state
- Sale badges with discount percentage
- In-stock / out-of-stock indicators
- Product schema.org JSON-LD (SEO)

### Content & Trust
- Shipping, returns, FAQ, privacy, and terms pages
- 24-question FAQ with expandable answers
- Pakistan-specific shipping, sizing, and payment copy
- Breadcrumbs on every page
- Organization + Product structured data

### Progressive Web App
- Installable on Android, iOS, and desktop Chrome
- Offline-capable via service worker
- App manifest with 192/512/maskable icons
- Theme colour `#0E0E0E`, background `#F7F5F1`

### Accessibility
- Semantic HTML throughout
- Full keyboard navigation
- Focus traps on all modals and drawers
- `aria-live` regions for cart/wishlist updates
- `prefers-reduced-motion` support
- WCAG 2.5.5 touch-target compliance
- Skip-to-content link on every page

### Performance
- No framework, no jQuery, no runtime dependencies beyond CDN fonts
- Lazy-loaded images below the fold
- `fetchpriority="high"` on hero images
- Prefetch on link hover
- Zero-JS-friendly fallbacks where possible

### SEO
- Unique title and description per page
- Open Graph + Twitter Card metadata
- Canonical URLs
- Sitemap and robots.txt
- JSON-LD for Organization, Product, and Breadcrumbs

---

## Tech Stack

| Layer | Technology |
|---|---|
| Markup | HTML5 (semantic) |
| Styles | CSS3 — custom design system in `assets/css/manieste.css` |
| Behaviour | Vanilla JavaScript (ES5-compatible, no build) |
| Icons | Font Awesome 5.15.1 (CC BY 4.0 / SIL OFL 1.1 / MIT) |
| Grid utilities | Bootstrap 5.0.0-beta1 (grid + utilities only, MIT) |
| Fonts | Cormorant Garamond + Inter via Google Fonts |
| PWA | Service worker + Web App Manifest |
| State | `localStorage` for cart, wishlist, recently viewed |

**No build step. No bundler. No package manager.** Clone and open `index.html`.

---

## Project Structure

```
manieste-label/
├── index.html                  Homepage
├── shop.html                   Collection listing
├── product.html                Product detail (?p=slug)
├── search.html                 Search results (?q=query)
├── cart.html                   Bag page
├── wishlist.html               Wishlist
├── account.html                Account UI shell
├── about.html                  Brand story
├── contact.html                Contact + form
├── shipping.html               Shipping information
├── returns.html                Returns policy
├── faq.html                    FAQ
├── privacy.html                Privacy policy
├── terms.html                  Terms of service
├── 404.html                    404 fallback
│
├── manifest.json               PWA manifest
├── sw.js                       Service worker
├── robots.txt                  SEO
├── sitemap.xml                 SEO
├── _redirects                  Netlify 404 routing
├── CREDITS.md                  Third-party licenses
├── README.md                   This file
├── .gitignore
│
└── assets/
    ├── css/
    │   ├── manieste.css        Design system (tokens, components)
    │   ├── manieste-pages.css  Page-level layouts
    │   ├── bootstrap.min.css   Library
    │   └── fontawesome.min.css Library
    │
    ├── js/
    │   ├── main.js             Cart, wishlist, product rendering
    │   ├── manieste-phase2.js  Drawer, modal, search overlay
    │   ├── manieste-phase3.js  Search page, account tabs, best sellers
    │   ├── manieste-phase4.js  PDP: zoom, JSON-LD, recently viewed
    │   ├── manieste-phase5.js  Shop filters, chips, density, load-more
    │   ├── manieste-phase8.js  A11y helpers, live regions, prefetch
    │   └── manieste-responsive.js  Mobile-first overrides
    │
    ├── data/
    │   └── products.json       Product catalogue (7 items)
    │
    ├── img/                    Product photography
    │   └── icons/              PWA icons
    │
    └── webfonts/               Font Awesome webfonts
```

---

## Local Development

The site is static — you only need a local HTTP server. The browser's `file://` protocol blocks `fetch()` for `products.json`, so don't just double-click `index.html`.

### Option A — Python (built into most systems)

```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

### Option B — Node (`npx`)

```bash
npx serve .
```

### Option C — VS Code Live Server

Install the **Live Server** extension, right-click `index.html`, and select **Open with Live Server**.

Then open `http://localhost:8000` (or the port your tool uses).

---

## Deployment

Deployed on **Netlify**, auto-built from the `main` branch.

| Setting | Value |
|---|---|
| Build command | *(none)* |
| Publish directory | `.` |
| Node version | *(none required)* |

Any push to `main` triggers a fresh deploy in ~20 seconds.

### Deploy your own copy

1. Fork this repository
2. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
3. Connect your GitHub account and select your fork
4. Set **Publish directory** to `.`
5. Deploy

### Alternative hosts

The site works on any static host:

- **Vercel** — zero config, add a `vercel.json` if you want clean URLs
- **Cloudflare Pages** — same idea, free tier
- **GitHub Pages** — Settings → Pages → deploy from `main` branch root
- **Any nginx / Apache server** — just upload the files

---

## Customisation

### Adding a product

Edit `assets/data/products.json` and append a new object to the `products` array:

```json
{
  "id": "your-product-id",
  "slug": "your-product-slug",
  "name": "Product Name",
  "collection": "Signature",
  "category": "T-Shirts",
  "price": 2990,
  "salePrice": null,
  "rating": 4.8,
  "reviews": 42,
  "badge": "New",
  "inStock": true,
  "sizes": ["S", "M", "L", "XL"],
  "colors": [
    { "name": "Bone", "hex": "#F7F5F1" },
    { "name": "Ink", "hex": "#0E0E0E" }
  ],
  "shortDesc": "One-line summary.",
  "description": "Full product description.",
  "specs": ["Material", "Fit", "Details"],
  "images": [
    "assets/img/your-product-1.jpg",
    "assets/img/your-product-2.jpg",
    "assets/img/your-product-3.jpg"
  ]
}
```

Save three images to `assets/img/` matching the paths above. Refresh the browser.

### Changing brand colours

All colours are defined as CSS variables in `assets/css/manieste.css`:

```css
:root {
  --mn-bone:     #F7F5F1;  /* page background */
  --mn-ink:      #0E0E0E;  /* primary text, buttons */
  --mn-clay:     #B8896A;  /* accent, sale badges */
  --mn-stone:    #8C8A85;  /* meta text */
  --mn-hairline: #E4E1DA;  /* borders */
  /* ... */
}
```

Change the values there, and every page updates.

### Changing type

Two fonts are loaded from Google Fonts in every HTML `<head>`:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@300;400;500;600&display=swap">
```

Replace with your own pairing, then update `--mn-font-display` and `--mn-font-body` in `manieste.css`.

---

## What's Not Included

This is a **frontend-only** storefront. The following are intentionally absent and need a backend to go live as a real shop:

- **Payment processing** — checkout is a demo placeholder. Integrate Stripe, Razorpay, or a local Pakistani gateway (JazzCash, Easypaisa, Safepay).
- **User authentication** — `account.html` is a UI shell. Sign-in / register / orders / addresses do not persist.
- **Inventory management** — `inStock` in `products.json` is a static boolean.
- **Order management** — no database, no admin panel.
- **Server-side search** — search runs entirely in the browser against the loaded catalogue.
- **Email** — newsletter and contact forms validate client-side but send nothing.

These are integration points, not bugs.

---

## Progressive Web App

The site is installable on Android (Chrome), iOS (Safari 16.4+), and desktop Chrome / Edge.

**Android:** Open the site in Chrome → tap the menu → **Install app**.
**iOS:** Open in Safari → tap Share → **Add to Home Screen**.
**Desktop:** Look for the ⊕ install icon in the Chrome address bar.

The service worker caches core assets for offline use. It does **not** cache on `localhost` to avoid interfering with Live Server.

---

## Accessibility

Tested against WCAG 2.1 AA. Includes:

- Semantic landmarks (`<header>`, `<main>`, `<nav>`, `<footer>`)
- Skip-to-content link
- Full keyboard navigation, including drawers and modals
- Visible focus rings on every interactive element
- `aria-live` regions announcing cart and wishlist changes
- `prefers-reduced-motion` respected
- Touch targets ≥ 44×44 px on coarse pointers
- Forced-colors mode support (Windows High Contrast)

---

## Credits

**Designed and developed by [Usman Murtaza](https://usmanmurtaza.netlify.app)**

See [`CREDITS.md`](CREDITS.md) for third-party library attributions. All third-party copyright notices are preserved in their source files as required by their respective licenses.

The frontend structure was originally derived from a third-party ecommerce template. All original template branding, imagery, product data, and demo content have been removed and replaced.

---

## License

**Private project.** All rights reserved.

This repository contains proprietary work. Do not redistribute, sublicense, or deploy without written permission from the owner.

Third-party libraries retain their original licenses (MIT, CC BY 4.0, SIL OFL 1.1, BSD-2-Clause) — see `CREDITS.md` for details.

---

<div align="center">

**MANIESTA LABEL**

*Premium contemporary fashion · Made in Pakistan*

[Instagram](#) · [Pinterest](#) · [Journal](#)

</div>
