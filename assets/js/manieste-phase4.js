'use strict';

/* ==========================================================================
   MANIESTA LABEL - Phase 4
   PDP: zoom, JSON-LD, breadcrumb, trust row, recently viewed
   Overrides ProductDetail.mount from main.js
   ========================================================================== */

/* ---------- Recently viewed ---------- */
const RecentlyViewed = {
  KEY: 'manieste.recently-viewed',
  get() {
    try { return JSON.parse(localStorage.getItem(this.KEY)) || []; }
    catch { return []; }
  },
  add(id) {
    const list = this.get().filter(x => x !== id);
    list.unshift(id);
    localStorage.setItem(this.KEY, JSON.stringify(list.slice(0, 8)));
  },
  render(excludeId) {
    const root = document.querySelector('[data-recently-viewed]');
    const section = document.querySelector('[data-recently-viewed-section]');
    if (!root || !section) return;

    const ids = this.get().filter(id => id !== excludeId);
    const items = ids.map(id => productById(id)).filter(Boolean).slice(0, 4);

    if (items.length < 2) { section.hidden = true; return; }

    root.innerHTML = items.map(ProductCard.render).join('');
    section.hidden = false;
    Wishlist.syncButtons();
  }
};

/* ---------- Product schema (JSON-LD) ---------- */
const ProductSchema = {
  inject(p) {
    const existing = document.querySelector('script[data-pdp-jsonld]');
    if (existing) existing.remove();

    const sale = p.salePrice && p.salePrice < p.price;
    const schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": p.name,
      "description": p.shortDesc,
      "image": p.images.map(img => new URL(img, location.href).href),
      "brand": { "@type": "Brand", "name": "MANIESTA LABEL" },
      "sku": p.id,
      "category": p.category,
      "material": p.specs && p.specs[0] ? p.specs[0] : undefined,
      "offers": {
        "@type": "Offer",
        "url": location.href,
        "priceCurrency": "PKR",
        "price": String(sale ? p.salePrice : p.price),
        "availability": p.inStock
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        "itemCondition": "https://schema.org/NewCondition",
        "seller": { "@type": "Organization", "name": "MANIESTA LABEL" }
      }
    };

    /* NOTE: aggregateRating is intentionally omitted.
       Inject it only after collecting real customer reviews -
       Google penalises fabricated review markup. */

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.pdpJsonld = 'true';
    script.textContent = JSON.stringify(schema, (k, v) => v === undefined ? undefined : v);
    document.head.appendChild(script);
  }
};

/* ---------- Image zoom (desktop only) ---------- */
const ImageZoom = {
  bind(container) {
    if (!container) return;
    const img = container.querySelector('img');
    if (!img) return;

    // Skip on touch devices
    if (window.matchMedia('(hover: none)').matches) return;

    const enter = () => {
      img.style.transition = 'transform 200ms ease';
      img.style.transform = 'scale(1.75)';
    };
    const move = (e) => {
      const r = container.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      img.style.transformOrigin = x + '% ' + y + '%';
    };
    const leave = () => {
      img.style.transition = 'transform 200ms ease';
      img.style.transform = 'scale(1)';
      img.style.transformOrigin = '50% 50%';
    };

    container.addEventListener('mouseenter', enter);
    container.addEventListener('mousemove', move);
    container.addEventListener('mouseleave', leave);
  }
};

/* ---------- New PDP mount (overrides main.js) ---------- */
ProductDetail.mount = function(p) {
  document.title = p.name + ' - MANIESTA LABEL';
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', p.shortDesc);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', p.name + ' - MANIESTA LABEL');
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', p.shortDesc);
  const ogImg = document.querySelector('meta[property="og:image"]');
  if (ogImg) ogImg.setAttribute('content', new URL(p.images[0], location.href).href);

  const root = document.querySelector('[data-product-root]');
  if (!root) return;

  const sale = p.salePrice && p.salePrice < p.price;
  const discount = sale ? Math.round((1 - p.salePrice / p.price) * 100) : 0;

  const swatchColors = p.colors.map((c, i) => {
    const isActive = i === 0 ? ' aria-pressed="true"' : ' aria-pressed="false"';
    return '<button type="button" class="mn-pd-color" data-color="' + escapeHtml(c.name) + '" title="' + escapeHtml(c.name) + '" aria-label="Colour ' + escapeHtml(c.name) + '"' + isActive + '>' +
      '<span class="mn-swatch" style="background:' + c.hex + '"></span>' +
    '</button>';
  }).join('');

  const sizeButtons = p.sizes.map((s, i) => {
    const mid = Math.floor(p.sizes.length / 2);
    const pressed = i === mid ? 'true' : 'false';
    return '<button type="button" class="mn-pd-size" data-size="' + escapeHtml(s) + '" aria-pressed="' + pressed + '">' + escapeHtml(s) + '</button>';
  }).join('');

  const thumbs = p.images.map((src, i) =>
    '<button type="button" class="mn-pd__thumb' + (i === 0 ? ' is-active' : '') + '" data-src="' + src + '" aria-label="View image ' + (i + 1) + '">' +
      '<img src="' + src + '" alt="" loading="lazy" onerror="this.src=\'' + IMG_FALLBACK + '\'">' +
    '</button>'
  ).join('');

  root.innerHTML =
    '<ol class="mn-breadcrumb" aria-label="Breadcrumb">' +
      '<li><a href="index.html">Home</a></li>' +
      '<li><a href="shop.html">Shop</a></li>' +
      '<li><a href="shop.html">' + escapeHtml(p.collection) + '</a></li>' +
      '<li><span aria-current="page">' + escapeHtml(p.name) + '</span></li>' +
    '</ol>' +

    '<div class="mn-pd">' +

      '<div class="mn-pd__gallery">' +
        '<div class="mn-pd__main" data-zoom-container>' +
          '<img src="' + p.images[0] + '" alt="' + escapeHtml(p.name) + '" id="mn-pd-main" fetchpriority="high" onerror="this.src=\'' + IMG_FALLBACK + '\'">' +
        '</div>' +
        '<div class="mn-pd__thumbs">' + thumbs + '</div>' +
      '</div>' +

      '<div class="mn-pd__info">' +

        (p.badge ? '<p class="mn-eyebrow" style="margin-bottom:12px">' + escapeHtml(p.badge) + '</p>' : '') +
        '<p class="mn-eyebrow">' + escapeHtml(p.collection) + ' collection</p>' +
        '<h1 class="h1 mn-mt-4">' + escapeHtml(p.name) + '</h1>' +

        '<div class="mn-pd__price mn-mt-4">' +
          (sale
            ? '<span class="mn-product-card__price--sale">' + fmt(p.salePrice) + '</span> ' +
              '<del class="mn-muted">' + fmt(p.price) + '</del> ' +
              '<span class="mn-badge mn-badge--sale">Save ' + discount + '%</span>'
            : fmt(p.price)) +
        '</div>' +

        '<p class="mn-pd__rating mn-mt-4">' +
          (p.inStock
            ? '<span style="color:var(--mn-signal)">●</span> In stock · dispatched in 1–2 days'
            : '<span style="color:var(--mn-error)">●</span> Out of stock') +
        '</p>' +

        '<p class="mn-lead mn-mt-8">' + escapeHtml(p.description) + '</p>' +

        '<div class="mn-pd__field mn-mt-8">' +
          '<span class="mn-label">Colour - <span data-selected-color>' + escapeHtml(p.colors[0].name) + '</span></span>' +
          '<div class="mn-pd__colors">' + swatchColors + '</div>' +
        '</div>' +

        '<div class="mn-pd__field mn-mt-6">' +
          '<div class="mn-pd__field-header">' +
            '<span class="mn-label" style="margin-bottom:0">Size</span>' +
            '<button type="button" class="mn-pd__size-guide-link" data-size-guide>Size guide</button>' +
          '</div>' +
          '<div class="mn-pd__sizes">' + sizeButtons + '</div>' +
        '</div>' +

        '<div class="mn-pd__field mn-mt-6">' +
          '<span class="mn-label">Quantity</span>' +
          '<div class="mn-qty mn-qty--lg">' +
            '<button type="button" aria-label="Decrease" data-qty-dec>−</button>' +
            '<span data-qty-value>1</span>' +
            '<button type="button" aria-label="Increase" data-qty-inc>+</button>' +
          '</div>' +
        '</div>' +

        '<div class="mn-pd__actions mn-mt-8">' +
          '<button type="button" class="mn-btn mn-btn--block" data-pd-add>Add to bag</button>' +
          '<button type="button" class="mn-btn mn-btn--outline mn-btn--block" aria-pressed="' + Wishlist.has(p.id) + '" data-wish-toggle="' + p.id + '">Save to wishlist</button>' +
        '</div>' +

        '<div class="mn-trust-row">' +
          '<div class="mn-trust-item"><strong>Free shipping</strong><span>Orders over Rs. 5,000</span></div>' +
          '<div class="mn-trust-item"><strong>14-day returns</strong><span>Unworn, with tags</span></div>' +
          '<div class="mn-trust-item"><strong>Secure checkout</strong><span>SSL encrypted</span></div>' +
          '<div class="mn-trust-item"><strong>Made in Pakistan</strong><span>Small-batch production</span></div>' +
        '</div>' +

        '<details class="mn-pd__details mn-mt-8" open>' +
          '<summary>Specifications</summary>' +
          '<ul>' + p.specs.map(s => '<li>' + escapeHtml(s) + '</li>').join('') + '</ul>' +
        '</details>' +

        '<details class="mn-pd__details">' +
          '<summary>Shipping</summary>' +
          '<p>Dispatched in 1–2 business days from Lahore. Free delivery across Pakistan on orders over Rs. 5,000.</p>' +
        '</details>' +

        '<details class="mn-pd__details">' +
          '<summary>Returns</summary>' +
          '<p>14-day returns on unworn pieces with original tags. Return shipping covered for defective items.</p>' +
        '</details>' +

        '<details class="mn-pd__details">' +
          '<summary>Care</summary>' +
          '<p>Machine wash cold, inside out. Do not bleach. Tumble dry low or hang to dry. Warm iron if needed.</p>' +
        '</details>' +

      '</div>' +
    '</div>';

  // ------- Wire interactions -------
  const state = {
    size: p.sizes[Math.floor(p.sizes.length / 2)] || p.sizes[0],
    color: p.colors[0].name,
    qty: 1
  };

  root.querySelectorAll('[data-size]').forEach(b => b.addEventListener('click', () => {
    state.size = b.dataset.size;
    root.querySelectorAll('[data-size]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  }));

  root.querySelectorAll('.mn-pd-color').forEach(b => b.addEventListener('click', () => {
    state.color = b.dataset.color;
    const target = root.querySelector('[data-selected-color]');
    if (target) target.textContent = b.dataset.color;
    root.querySelectorAll('.mn-pd-color').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  }));

  const qtyVal = root.querySelector('[data-qty-value]');
  root.querySelector('[data-qty-inc]').addEventListener('click', () => {
    state.qty += 1;
    qtyVal.textContent = state.qty;
  });
  root.querySelector('[data-qty-dec]').addEventListener('click', () => {
    state.qty = Math.max(1, state.qty - 1);
    qtyVal.textContent = state.qty;
  });

  root.querySelector('[data-pd-add]').addEventListener('click', () => {
    Cart.add(p, state.size, state.color, state.qty);
  });

  root.querySelectorAll('.mn-pd__thumb').forEach(t => t.addEventListener('click', () => {
    const main = root.querySelector('#mn-pd-main');
    if (main) main.src = t.dataset.src;
    root.querySelectorAll('.mn-pd__thumb').forEach(x => x.classList.toggle('is-active', x === t));
  }));

  // Zoom
  ImageZoom.bind(root.querySelector('[data-zoom-container]'));

  // Schema
  ProductSchema.inject(p);

  // Recently viewed
  RecentlyViewed.add(p.id);
  RecentlyViewed.render(p.id);
};

/* ---------- Boot: nothing else needed, main.js calls .load() ---------- */
document.addEventListener('DOMContentLoaded', () => {
  // Safety: if main.js's load already ran before this override took effect (rare),
  // re-render from the URL.
  const root = document.querySelector('[data-product-root]');
  if (!root || root.innerHTML.trim().length > 0) return;
  const slug = new URLSearchParams(location.search).get('p');
  const p = slug && typeof productBySlug === 'function' ? productBySlug(slug) : null;
  if (p) ProductDetail.mount(p);
});
