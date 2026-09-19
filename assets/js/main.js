'use strict';

const CART_KEY = 'manieste.cart.v1';
const WISH_KEY = 'manieste.wishlist.v1';
const IMG_FALLBACK = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 4"><rect width="3" height="4" fill="#F7F5F1"/><text x="1.5" y="2" text-anchor="middle" font-family="serif" font-size="0.16" fill="#8C8A85" letter-spacing="0.08">MANIESTA</text></svg>'
);

let CATALOG = [];
let currency = 'Rs. ';

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const fmt = (n) => currency + Number(n).toLocaleString('en-PK');

const escapeHtml = (str) => String(str ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

const readJSON = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const writeJSON = (key, val) => localStorage.setItem(key, JSON.stringify(val));

const productById = (id) => CATALOG.find(p => p.id === id);
const productBySlug = (slug) => CATALOG.find(p => p.slug === slug);

const Cart = {
  get() { return readJSON(CART_KEY, []); },
  set(items) {
    writeJSON(CART_KEY, items);
    this.render();
    this.badge();
    document.dispatchEvent(new CustomEvent('mn:cart-changed'));
  },
  add(product, size, color, qty = 1) {
    const items = this.get();
    const key = `${product.id}|${size}|${color}`;
    const existing = items.find(i => i.key === key);
    if (existing) existing.qty += qty;
    else items.push({
      key,
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.salePrice ?? product.price,
      image: product.images[0],
      size, color, qty
    });
    this.set(items);
    Toast.show(`${product.name} added to bag`);
  },
  update(key, qty) {
    let items = this.get();
    if (qty <= 0) items = items.filter(i => i.key !== key);
    else items = items.map(i => i.key === key ? { ...i, qty } : i);
    this.set(items);
  },
  remove(key) { this.set(this.get().filter(i => i.key !== key)); },
  count() { return this.get().reduce((s, i) => s + i.qty, 0); },
  subtotal() { return this.get().reduce((s, i) => s + i.price * i.qty, 0); },
  badge() {
    const c = this.count();
    $$('[data-cart-count]').forEach(el => {
      el.textContent = c;
      el.classList.toggle('mn-hidden', c === 0);
    });
  },
  render() {
    const root = $('[data-cart-root]');
    if (!root) return;
    const items = this.get();
    if (!items.length) {
      Loading.empty(root, {
        icon: 'fas fa-shopping-bag',
        title: 'Your bag is empty',
        text: "Browse the collection and add something you'll wear for years.",
        actions: [{ label: 'Shop the collection', href: 'shop.html' }]
      });
      return;
    }
    root.innerHTML = `
      <div class="mn-cart-grid">
        <div class="mn-cart-items">
          ${items.map(i => `
            <article class="mn-cart-item" data-key="${escapeHtml(i.key)}">
              <a href="product.html?p=${escapeHtml(i.slug)}" class="mn-cart-item__media">
                <img src="${escapeHtml(i.image)}" alt="${escapeHtml(i.name)}" loading="lazy" onerror="this.src='${IMG_FALLBACK}'">
              </a>
              <div class="mn-cart-item__body">
                <a href="product.html?p=${escapeHtml(i.slug)}" class="mn-cart-item__name">${escapeHtml(i.name)}</a>
                <p class="mn-cart-item__meta">${escapeHtml(i.size)} · ${escapeHtml(i.color)}</p>
                <div class="mn-qty">
                  <button type="button" aria-label="Decrease" data-cart-dec>−</button>
                  <span>${i.qty}</span>
                  <button type="button" aria-label="Increase" data-cart-inc>+</button>
                </div>
              </div>
              <div class="mn-cart-item__price">${fmt(i.price * i.qty)}</div>
              <button type="button" class="mn-cart-item__remove" aria-label="Remove" data-cart-remove>Remove</button>
            </article>
          `).join('')}
        </div>
        <aside class="mn-cart-summary">
          <h3 class="h3">Summary</h3>
          <div class="mn-cart-summary__row"><span>Subtotal</span><span>${fmt(this.subtotal())}</span></div>
          <div class="mn-cart-summary__row"><span>Shipping</span><span>Calculated at checkout</span></div>
          <div class="mn-cart-summary__row mn-cart-summary__row--total"><span>Total</span><span>${fmt(this.subtotal())}</span></div>
          <button type="button" class="mn-btn mn-btn--block mn-mt-8" data-checkout>Checkout</button>
          <p class="mn-cart-summary__note">Demo storefront - checkout is not connected to a payment processor.</p>
        </aside>
      </div>`;
  },
      bind() {
    document.addEventListener('click', (e) => {
      // Checkout can be clicked anywhere (not inside a cart row)
      if (e.target.matches('[data-checkout]')) {
        if (this.count() === 0) {
          Toast.show('Your bag is empty');
        } else {
          window.location.href = 'checkout.html';
        }
        return;
      }

      const item = e.target.closest('.mn-cart-item');
      if (!item) return;
      const key = item.dataset.key;
      if (e.target.matches('[data-cart-inc]')) {
        const cur = this.get().find(i => i.key === key);
        if (cur) this.update(key, cur.qty + 1);
      } else if (e.target.matches('[data-cart-dec]')) {
        const cur = this.get().find(i => i.key === key);
        if (cur) this.update(key, cur.qty - 1);
      } else if (e.target.matches('[data-cart-remove]')) {
        this.remove(key);
      }
    });
  }
};

const Wishlist = {
  get() { return readJSON(WISH_KEY, []); },
  set(ids) { writeJSON(WISH_KEY, ids); this.syncButtons(); },
  has(id) { return this.get().includes(id); },
  toggle(id) {
    const ids = this.get();
    const has = ids.includes(id);
    this.set(has ? ids.filter(x => x !== id) : [...ids, id]);
    Toast.show(has ? 'Removed from wishlist' : 'Saved to wishlist');
  },
  count() { return this.get().length; },
  syncButtons() {
    $$('[data-wish-toggle]').forEach(btn => {
      const id = btn.dataset.wishToggle;
      btn.setAttribute('aria-pressed', this.has(id));
    });
  },
  bind() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-wish-toggle]');
      if (!btn) return;
      e.preventDefault();
      this.toggle(btn.dataset.wishToggle);
    });
  },
  render() {
    const root = $('[data-wishlist-root]');
    if (!root) return;
    const ids = this.get();
    const items = ids.map(productById).filter(Boolean);
    if (!items.length) {
      Loading.empty(root, {
        icon: 'far fa-heart',
        title: 'Nothing saved yet',
        text: 'Tap the heart on any product to keep it here.',
        actions: [{ label: 'Shop the collection', href: 'shop.html' }]
      });
      return;
    }
    root.innerHTML = `<div class="mn-product-grid">${items.map(ProductCard.render).join('')}</div>`;
  }
};

const ProductCard = {
  render(p) {
    const sale = p.salePrice && p.salePrice < p.price;
    const badge = p.badge;
    const swatches = (p.colors || []).slice(0, 4).map(c =>
      `<span class="mn-swatch" style="background:${c.hex}" title="${escapeHtml(c.name)}"></span>`
    ).join('');
    const more = (p.colors || []).length > 4 ? `<span class="mn-swatch-more">+${p.colors.length - 4}</span>` : '';
    return `
      <article class="mn-product-card" data-product-id="${p.id}">
        <a class="mn-product-card__media" href="product.html?p=${p.slug}" aria-label="${escapeHtml(p.name)}">
          <img src="${p.images[0]}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.src='${IMG_FALLBACK}'">
          ${p.images[1] ? `<img src="${p.images[1]}" alt="" aria-hidden="true" loading="lazy" onerror="this.src='${IMG_FALLBACK}'">` : ''}
          ${badge ? `<span class="mn-product-card__badge">${escapeHtml(badge)}</span>` : ''}
        </a>
        <button type="button" class="mn-product-card__wish" aria-label="Save ${escapeHtml(p.name)}" aria-pressed="${Wishlist.has(p.id)}" data-wish-toggle="${p.id}">
          <i class="far fa-heart"></i>
        </button>
        <button type="button" class="mn-product-card__quickadd" data-quick-add="${p.id}">Add to bag</button>
        <div class="mn-product-card__body">
          <h3 class="mn-product-card__name">
            <a href="product.html?p=${p.slug}">${escapeHtml(p.name)}</a>
          </h3>
          <div class="mn-product-card__meta">
            <span class="mn-swatches">${swatches}${more}</span>
            <span class="mn-product-card__price${sale ? ' mn-product-card__price--sale' : ''}">
              ${sale ? `<del>${fmt(p.price)}</del>${fmt(p.salePrice)}` : fmt(p.price)}
            </span>
          </div>
        </div>
      </article>`;
  },
  bind() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-quick-add]');
      if (!btn) return;
      e.preventDefault();
      const p = productById(btn.dataset.quickAdd);
      if (!p) return;
      const size = p.sizes[Math.floor(p.sizes.length / 2)] || p.sizes[0];
      const color = p.colors[0]?.name || 'Default';
      Cart.add(p, size, color, 1);
    });
  }
};

const Shop = {
  state: { categories: new Set(), collections: new Set(), sizes: new Set(), sort: 'featured', query: '' },
  apply() {
    let list = CATALOG.slice();
    if (this.state.categories.size) list = list.filter(p => this.state.categories.has(p.category));
    if (this.state.collections.size) list = list.filter(p => this.state.collections.has(p.collection));
    if (this.state.sizes.size) list = list.filter(p => p.sizes.some(s => this.state.sizes.has(s)));
    if (this.state.query) {
      const q = this.state.query.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.collection.toLowerCase().includes(q)
      );
    }
    switch (this.state.sort) {
      case 'price-asc': list.sort((a, b) => (a.salePrice ?? a.price) - (b.salePrice ?? b.price)); break;
      case 'price-desc': list.sort((a, b) => (b.salePrice ?? b.price) - (a.salePrice ?? a.price)); break;
      case 'newest': list.reverse(); break;
      default: list.sort((a, b) => b.rating - a.rating);
    }
    this.render(list);
  },
  render(list) {
    const grid = $('[data-shop-grid]');
    const count = $('[data-shop-count]');
    if (!grid) return;
    if (count) count.textContent = `${list.length} ${list.length === 1 ? 'piece' : 'pieces'}`;
    if (!list.length) {
      grid.innerHTML = `<div class="mn-shop-empty mn-text-center">
        <p class="mn-eyebrow">No matches</p>
        <p class="mn-lead mn-mt-4">Try clearing a filter or two.</p>
      </div>`;
      return;
    }
    grid.innerHTML = list.map(ProductCard.render).join('');
    Wishlist.syncButtons();
  },
  bind() {
    const filterRoot = $('[data-shop-filters]');
    if (filterRoot) {
      filterRoot.addEventListener('change', (e) => {
        const t = e.target;
        const group = t.dataset.filterGroup;
        const value = t.value;
        if (!group) return;
        const set = this.state[group];
        if (t.checked) set.add(value); else set.delete(value);
        this.apply();
      });
    }
    const sortSel = $('[data-shop-sort]');
    if (sortSel) sortSel.addEventListener('change', () => { this.state.sort = sortSel.value; this.apply(); });
    const search = $('[data-shop-search]');
    if (search) search.addEventListener('input', () => { this.state.query = search.value; this.apply(); });
  }
};

const ProductDetail = {
  mount(p) {
    document.title = `${p.name} - MANIESTA LABEL`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', p.shortDesc);
    const root = $('[data-product-root]');
    if (!root) return;
    const sale = p.salePrice && p.salePrice < p.price;
    const swatchColors = p.colors.map(c => `
      <button type="button" class="mn-pd-color" data-color="${escapeHtml(c.name)}" title="${escapeHtml(c.name)}" aria-label="Colour ${escapeHtml(c.name)}">
        <span class="mn-swatch" style="background:${c.hex}"></span>
      </button>`).join('');
    const sizeButtons = p.sizes.map((s, i) => `
      <button type="button" class="mn-pd-size" data-size="${escapeHtml(s)}" ${i === Math.floor(p.sizes.length / 2) ? 'aria-pressed="true"' : 'aria-pressed="false"'}>${escapeHtml(s)}</button>
    `).join('');
    root.innerHTML = `
      <div class="mn-pd">
        <div class="mn-pd__gallery">
          <div class="mn-pd__main">
            <img src="${p.images[0]}" alt="${escapeHtml(p.name)}" id="mn-pd-main" fetchpriority="high" onerror="this.src='${IMG_FALLBACK}'">
          </div>
          <div class="mn-pd__thumbs" role="tablist" aria-label="Product images">
            ${p.images.map((src, i) => `
              <button type="button" role="tab" class="mn-pd__thumb${i === 0 ? ' is-active' : ''}" data-src="${src}">
                <img src="${src}" alt="View ${i + 1}" loading="lazy" onerror="this.src='${IMG_FALLBACK}'">
              </button>
            `).join('')}
          </div>
        </div>
        <div class="mn-pd__info">
          <p class="mn-eyebrow">${escapeHtml(p.collection)} collection</p>
          <h1 class="h1 mn-mt-4">${escapeHtml(p.name)}</h1>
          <p class="mn-pd__price mn-mt-4">
            ${sale ? `<del>${fmt(p.price)}</del> <span class="mn-product-card__price--sale">${fmt(p.salePrice)}</span>` : fmt(p.price)}
          </p>
          <p class="mn-pd__rating">★ ${p.rating} · ${p.reviews} reviews</p>
          <p class="mn-lead mn-mt-8">${escapeHtml(p.description)}</p>
          <div class="mn-pd__field mn-mt-8">
            <span class="mn-label">Colour - <span data-selected-color>${escapeHtml(p.colors[0].name)}</span></span>
            <div class="mn-pd__colors">${swatchColors}</div>
          </div>
          <div class="mn-pd__field mn-mt-6">
            <span class="mn-label">Size</span>
            <div class="mn-pd__sizes">${sizeButtons}</div>
          </div>
          <div class="mn-pd__field mn-mt-6">
            <span class="mn-label">Quantity</span>
            <div class="mn-qty mn-qty--lg">
              <button type="button" aria-label="Decrease" data-qty-dec>−</button>
              <span data-qty-value>1</span>
              <button type="button" aria-label="Increase" data-qty-inc>+</button>
            </div>
          </div>
          <div class="mn-pd__actions mn-mt-8">
            <button type="button" class="mn-btn mn-btn--block" data-pd-add>Add to bag</button>
            <button type="button" class="mn-btn mn-btn--outline mn-btn--block" aria-pressed="${Wishlist.has(p.id)}" data-wish-toggle="${p.id}">
              Save to wishlist
            </button>
          </div>
          <details class="mn-pd__details mn-mt-8" open>
            <summary>Specifications</summary>
            <ul>${p.specs.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>
          </details>
          <details class="mn-pd__details">
            <summary>Shipping</summary>
            <p>Dispatched in 1–2 business days. Free shipping on orders over ${fmt(2990)}.</p>
          </details>
          <details class="mn-pd__details">
            <summary>Returns</summary>
            <p>14-day returns on unworn pieces with tags attached.</p>
          </details>
        </div>
      </div>
    `;
    const state = {
      size: p.sizes[Math.floor(p.sizes.length / 2)] || p.sizes[0],
      color: p.colors[0].name,
      qty: 1
    };
    $$('[data-size]', root).forEach(b => b.addEventListener('click', () => {
      state.size = b.dataset.size;
      $$('[data-size]', root).forEach(x => x.setAttribute('aria-pressed', x === b));
    }));
    $$('.mn-pd-color', root).forEach(b => b.addEventListener('click', () => {
      state.color = b.dataset.color;
      const target = $('[data-selected-color]', root);
      if (target) target.textContent = b.dataset.color;
    }));
    const qtyVal = $('[data-qty-value]', root);
    $('[data-qty-inc]', root).addEventListener('click', () => { state.qty += 1; qtyVal.textContent = state.qty; });
    $('[data-qty-dec]', root).addEventListener('click', () => { state.qty = Math.max(1, state.qty - 1); qtyVal.textContent = state.qty; });
    $('[data-pd-add]', root).addEventListener('click', () => { Cart.add(p, state.size, state.color, state.qty); });
    $$('.mn-pd__thumb', root).forEach(t => t.addEventListener('click', () => {
      const main = $('#mn-pd-main', root);
      if (main) main.src = t.dataset.src;
      $$('.mn-pd__thumb', root).forEach(x => x.classList.toggle('is-active', x === t));
    }));
  },
  load() {
    const root = $('[data-product-root]');
    if (!root) return;
    const slug = new URLSearchParams(location.search).get('p');
    const p = slug ? productBySlug(slug) : null;
    if (!p) {
      root.innerHTML = `<div class="mn-section mn-text-center">
        <p class="mn-eyebrow">Not found</p>
        <h2 class="h2 mn-mt-4">This piece isn't available.</h2>
        <a href="shop.html" class="mn-btn mn-mt-8">Back to shop</a>
      </div>`;
      return;
    }
    this.mount(p);
  }
};

const Toast = {
  el: null,
  ensure() {
    if (this.el) return this.el;
    this.el = document.createElement('div');
    this.el.className = 'mn-toast';
    this.el.setAttribute('role', 'status');
    this.el.setAttribute('aria-live', 'polite');
    document.body.appendChild(this.el);
    return this.el;
  },
  show(msg) {
    const el = this.ensure();
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(this._t);
    this._t = setTimeout(() => el.classList.remove('is-visible'), 2400);
  }
};

const Forms = {
  bind() {
    $$('[data-newsletter-form]').forEach(f => {
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = f.querySelector('input[type=email]');
        if (!email || !email.value) return;
        Toast.show("Thank you - you're on the list.");
        f.reset();
      });
    });
    $$('[data-contact-form]').forEach(f => {
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!f.checkValidity()) { f.reportValidity(); return; }
        Toast.show("Message received - we'll reply within 1 business day.");
        f.reset();
      });
    });
  }
};

const Header = {
  bind() {
    const header = $('.mn-header');
    if (!header) return;
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    const toggle = $('[data-menu-toggle]');
    const menu = $('[data-mobile-menu]');
    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        const open = menu.hasAttribute('hidden') ? true : false;
        if (open) menu.removeAttribute('hidden'); else menu.setAttribute('hidden', '');
        toggle.setAttribute('aria-expanded', String(open));
        document.body.classList.toggle('mn-no-scroll', open);
      });
    }
  }
};

const PWA = {
  init() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => { });
      });
    }
  }
};

async function waitForProductsBridge(ms) {
  const start = Date.now();
  while (!window.MN_Products && Date.now() - start < (ms || 800)) {
    await new Promise(r => setTimeout(r, 20));
  }
  return window.MN_Products || null;
}

document.addEventListener('DOMContentLoaded', async () => {

  const shopGrid = document.querySelector('[data-shop-grid]');
  const featGrid = document.querySelector('[data-featured-products]');
  const newGrid = document.querySelector('[data-new-arrivals]');
  const bestGrid = document.querySelector('[data-best-sellers]');
  if (shopGrid) Loading.productGrid(shopGrid, 6);
  if (featGrid) Loading.productGrid(featGrid, 4);
  if (newGrid) Loading.productGrid(newGrid, 4);
  if (bestGrid) Loading.productGrid(bestGrid, 4);

  try {
    let products = null;
    let currencyValue = 'Rs. ';
    let source = 'json';

    const bridge = await waitForProductsBridge(800);
    if (bridge) {
      const result = await bridge.getAll();
      if (result && result.products && result.products.length) {
        products = result.products;
        currencyValue = result.currency || 'Rs. ';
        source = result.source;
      }
    }

    if (!products || !products.length) {
      const res = await fetch('assets/data/products.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      products = data.products || [];
      currencyValue = data.currency || 'Rs. ';
      source = 'json';
    }

    CATALOG = products;
    currency = currencyValue;
    if (!CATALOG.length) throw new Error('Empty catalog');
    console.info('[MANIESTA] Products loaded from:', source);
  } catch (err) {
    CATALOG = [];
    const retry = () => location.reload();
    if (shopGrid) Loading.error(shopGrid, { title: 'Could not load products', text: 'Check your connection and try again.', retry: retry });
    if (featGrid) Loading.error(featGrid, { title: 'Could not load products', text: 'Check your connection and try again.', retry: retry });
    if (newGrid) Loading.error(newGrid, { title: 'Could not load products', text: 'Check your connection and try again.', retry: retry });
    if (bestGrid) Loading.error(bestGrid, { title: 'Could not load products', text: 'Check your connection and try again.', retry: retry });
    console.warn('[MANIESTA] Product load failed:', err.message);
  }

  Header.bind();
  Cart.bind();
  Wishlist.bind();
  ProductCard.bind();
  Shop.bind();
  Forms.bind();
  PWA.init();
  Cart.badge();

  if ($('[data-shop-grid]')) Shop.apply();
  if ($('[data-product-root]')) ProductDetail.load();
  if ($('[data-cart-root]')) Cart.render();
  if ($('[data-wishlist-root]')) Wishlist.render();

  const featured = $('[data-featured-products]');
  if (featured && CATALOG.length) {
    featured.innerHTML = CATALOG.slice(0, 4).map(ProductCard.render).join('');
    Wishlist.syncButtons();
  }
  const newArrivals = $('[data-new-arrivals]');
  if (newArrivals && CATALOG.length) {
    newArrivals.innerHTML = CATALOG.slice(-4).reverse().map(ProductCard.render).join('');
    Wishlist.syncButtons();
  }
});

window.Cart = Cart;
window.Wishlist = Wishlist;
