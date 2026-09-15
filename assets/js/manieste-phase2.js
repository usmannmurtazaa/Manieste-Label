'use strict';

const FocusTrap = {
  _prev: null,
  activate(container) {
    this._prev = document.activeElement;
    const focusables = container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables.length) return;
    container._focusables = focusables;
    container._handler = (e) => {
      if (e.key === 'Escape') { container.dispatchEvent(new CustomEvent('mn:escape')); return; }
      if (e.key !== 'Tab') return;
      const f = container._focusables;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    container.addEventListener('keydown', container._handler);
  },
  deactivate(container) {
    if (container._handler) container.removeEventListener('keydown', container._handler);
    if (this._prev && this._prev.focus) this._prev.focus();
  }
};

const Drawer = {
  open(el) {
    if (!el) return;
    el.setAttribute('aria-hidden', 'false');
    document.body.classList.add('mn-no-scroll');
    FocusTrap.activate(el);
    el.addEventListener('mn:escape', () => this.close(el), { once: true });
    const scrim = el.querySelector('.mn-drawer__scrim');
    if (scrim) scrim.addEventListener('click', () => this.close(el), { once: true });
  },
  close(el) {
    if (!el) return;
    el.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('mn-no-scroll');
    FocusTrap.deactivate(el);
  },
  bind() {
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-drawer-open]');
      if (trigger) {
        e.preventDefault();
        this.open(document.getElementById(trigger.dataset.drawerOpen));
        return;
      }
      const closeBtn = e.target.closest('[data-drawer-close]');
      if (closeBtn) { e.preventDefault(); this.close(closeBtn.closest('.mn-drawer')); }
    });
  }
};

const Modal = {
  open(el) {
    if (!el) return;
    el.setAttribute('aria-hidden', 'false');
    document.body.classList.add('mn-no-scroll');
    FocusTrap.activate(el);
    el.addEventListener('mn:escape', () => this.close(el), { once: true });
    const scrim = el.querySelector('.mn-modal__scrim');
    if (scrim) scrim.addEventListener('click', () => this.close(el), { once: true });
  },
  close(el) {
    if (!el) return;
    el.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('mn-no-scroll');
    FocusTrap.deactivate(el);
  },
  bind() {
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-modal-open]');
      if (t) { e.preventDefault(); this.open(document.getElementById(t.dataset.modalOpen)); return; }
      const c = e.target.closest('[data-modal-close]');
      if (c) { e.preventDefault(); this.close(c.closest('.mn-modal')); }
    });
  }
};

const Search = {
  overlay: null,
  open() {
    if (!this.overlay) return;
    this.overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('mn-no-scroll');
    FocusTrap.activate(this.overlay);
    const input = this.overlay.querySelector('input');
    if (input) setTimeout(() => input.focus(), 60);
  },
  close() {
    if (!this.overlay) return;
    this.overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('mn-no-scroll');
    FocusTrap.deactivate(this.overlay);
  },
  results(q) {
    const list = document.querySelector('[data-search-results]');
    const count = document.querySelector('[data-search-count]');
    if (!list) return;
    const query = (q || '').trim().toLowerCase();
    if (!query) { list.innerHTML = ''; if (count) count.textContent = ''; return; }
    const matches = CATALOG.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query) ||
      p.collection.toLowerCase().includes(query)
    ).slice(0, 6);
    if (count) count.textContent = matches.length + ' result' + (matches.length === 1 ? '' : 's');
    if (!matches.length) {
      list.innerHTML = '<p class="mn-small mn-muted" style="padding:24px 0">No pieces match "' + escapeHtml(q) + '". Try a different search.</p>';
      return;
    }
    list.innerHTML = matches.map(p =>
      '<a href="product.html?p=' + p.slug + '" class="mn-search-result">' +
        '<img src="' + p.images[0] + '" alt="" loading="lazy" onerror="this.src=\'' + IMG_FALLBACK + '\'">' +
        '<div>' +
          '<p class="mn-search-result__name">' + escapeHtml(p.name) + '</p>' +
          '<p class="mn-search-result__meta">' + escapeHtml(p.collection) + ' · ' + fmt(p.salePrice ?? p.price) + '</p>' +
        '</div>' +
      '</a>'
    ).join('');
  },
  bind() {
    this.overlay = document.querySelector('[data-search-overlay]');
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-search-open]')) { e.preventDefault(); this.open(); }
      if (e.target.closest('[data-search-close]')) { e.preventDefault(); this.close(); }
    });
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (this.overlay && this.overlay.getAttribute('aria-hidden') === 'false') this.close();
        else this.open();
      }
    });
    if (this.overlay) {
      const input = this.overlay.querySelector('input');
      if (input) input.addEventListener('input', () => this.results(input.value));
      const form = this.overlay.querySelector('form');
      if (form) form.addEventListener('submit', (e) => {
        e.preventDefault();
        const q = input.value.trim();
        if (q) window.location.href = 'search.html?q=' + encodeURIComponent(q);
      });
    }
  }
};

const QuickView = {
  bind() {
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-quick-view]');
      if (!t) return;
      e.preventDefault();
      const p = productById(t.dataset.quickView);
      if (!p) return;
      const el = document.querySelector('[data-quick-view-modal]');
      if (!el) return;
      const body = el.querySelector('[data-qv-body]');
      const sale = p.salePrice && p.salePrice < p.price;
      body.innerHTML =
        '<div style="display:grid;gap:24px;grid-template-columns:1fr">' +
          '<div style="aspect-ratio:3/4;overflow:hidden;background:var(--mn-hairline)">' +
            '<img src="' + p.images[0] + '" alt="' + escapeHtml(p.name) + '" style="width:100%;height:100%;object-fit:cover" onerror="this.src=\'' + IMG_FALLBACK + '\'">' +
          '</div>' +
          '<div>' +
            '<p class="mn-eyebrow">' + escapeHtml(p.collection) + '</p>' +
            '<h3 class="h2" style="margin-top:12px">' + escapeHtml(p.name) + '</h3>' +
            '<p class="mn-mt-4">' + (sale ? '<del class="mn-muted">' + fmt(p.price) + '</del> <span class="mn-product-card__price--sale">' + fmt(p.salePrice) + '</span>' : fmt(p.price)) + '</p>' +
            '<p class="mn-lead mn-mt-4">' + escapeHtml(p.shortDesc) + '</p>' +
            '<a class="mn-btn mn-btn--block mn-mt-8" href="product.html?p=' + p.slug + '">View full details</a>' +
          '</div>' +
        '</div>';
      Modal.open(el);
    });
  }
};

const SizeGuide = {
  bind() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-size-guide]')) {
        e.preventDefault();
        Modal.open(document.querySelector('[data-size-guide-modal]'));
      }
    });
  }
};

function renderCartDrawer() {
  const body = document.querySelector('[data-cart-drawer-body]');
  const subEl = document.querySelector('[data-cart-drawer-subtotal]');
  if (!body) return;
  const items = Cart.get();
  if (!items.length) {
    body.innerHTML =
      '<div class="mn-cart-drawer__empty">' +
        '<p>Bag is empty</p>' +
        '<small>Nothing here yet.</small>' +
        '<a class="mn-btn" href="shop.html">Shop the collection</a>' +
      '</div>';
    if (subEl) subEl.textContent = fmt(0);
    return;
  }
  body.innerHTML = items.map(i =>
    '<div class="mn-cart-item" data-key="' + escapeHtml(i.key) + '">' +
      '<a href="product.html?p=' + escapeHtml(i.slug) + '" class="mn-cart-item__media">' +
        '<img src="' + escapeHtml(i.image) + '" alt="" loading="lazy" onerror="this.src=\'' + IMG_FALLBACK + '\'">' +
      '</a>' +
      '<div class="mn-cart-item__body">' +
        '<a href="product.html?p=' + escapeHtml(i.slug) + '" class="mn-cart-item__name">' + escapeHtml(i.name) + '</a>' +
        '<p class="mn-cart-item__meta">' + escapeHtml(i.size) + ' · ' + escapeHtml(i.color) + '</p>' +
        '<div class="mn-qty">' +
          '<button type="button" aria-label="Decrease" data-cart-dec>−</button>' +
          '<span>' + i.qty + '</span>' +
          '<button type="button" aria-label="Increase" data-cart-inc>+</button>' +
        '</div>' +
      '</div>' +
      '<div class="mn-cart-item__price">' + fmt(i.price * i.qty) + '</div>' +
      '<button type="button" class="mn-cart-item__remove" data-cart-remove>Remove</button>' +
    '</div>'
  ).join('');
  if (subEl) subEl.textContent = fmt(Cart.subtotal());
}

function bindCartDrawerActions() {
  const body = document.querySelector('[data-cart-drawer-body]');
  if (!body) return;
  body.addEventListener('click', (e) => {
    const item = e.target.closest('.mn-cart-item');
    if (!item) return;
    const key = item.dataset.key;
    if (e.target.matches('[data-cart-inc]')) {
      const cur = Cart.get().find(i => i.key === key);
      if (cur) Cart.update(key, cur.qty + 1);
    } else if (e.target.matches('[data-cart-dec]')) {
      const cur = Cart.get().find(i => i.key === key);
      if (cur) Cart.update(key, cur.qty - 1);
    } else if (e.target.matches('[data-cart-remove]')) {
      Cart.remove(key);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  Drawer.bind();
  Modal.bind();
  Search.bind();
  QuickView.bind();
  SizeGuide.bind();
  bindCartDrawerActions();
  renderCartDrawer();
  document.addEventListener('mn:cart-changed', renderCartDrawer);
});