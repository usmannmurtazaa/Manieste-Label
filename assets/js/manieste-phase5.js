'use strict';

/* ==========================================================================
   MANIESTA LABEL — Phase 5
   Shop page: filters drawer, chips, load more, density, URL sync
   Overrides Shop.render and augments Shop.apply with pagination
   ========================================================================== */

const ShopV2 = {
  LIMIT: 8,

  /* --- URL sync --- */
  readURL() {
    const p = new URLSearchParams(location.search);
    const cat = p.get('cat');
    const col = p.get('col');
    const size = p.get('size');
    const sort = p.get('sort');
    const q = p.get('q');

    if (cat)  cat.split(',').forEach(v => Shop.state.categories.add(v));
    if (col)  col.split(',').forEach(v => Shop.state.collections.add(v));
    if (size) size.split(',').forEach(v => Shop.state.sizes.add(v));
    if (sort) Shop.state.sort = sort;
    if (q)    Shop.state.query = q;
  },

  syncURL() {
    const p = new URLSearchParams();
    if (Shop.state.categories.size)  p.set('cat',  [...Shop.state.categories].join(','));
    if (Shop.state.collections.size) p.set('col',  [...Shop.state.collections].join(','));
    if (Shop.state.sizes.size)       p.set('size', [...Shop.state.sizes].join(','));
    if (Shop.state.sort && Shop.state.sort !== 'featured') p.set('sort', Shop.state.sort);
    if (Shop.state.query) p.set('q', Shop.state.query);

    const qs = p.toString();
    history.replaceState(null, '', qs ? location.pathname + '?' + qs : location.pathname);
  },

  /* --- Filter counts --- */
  updateFilterCounts() {
    const root = document.querySelector('[data-shop-filters]');
    if (!root || !CATALOG.length) return;

    root.querySelectorAll('[data-filter-group]').forEach(cb => {
      const group = cb.dataset.filterGroup;
      const value = cb.value;
      let count = 0;

      if (group === 'categories')  count = CATALOG.filter(p => p.category === value).length;
      else if (group === 'collections') count = CATALOG.filter(p => p.collection === value).length;
      else if (group === 'sizes') count = CATALOG.filter(p => p.sizes.indexOf(value) !== -1).length;

      const label = cb.closest('label');
      let span = label.querySelector('.mn-filter-count');
      if (!span) {
        span = document.createElement('span');
        span.className = 'mn-filter-count';
        label.appendChild(span);
      }
      span.textContent = '(' + count + ')';
      cb.disabled = count === 0;
      label.classList.toggle('is-empty', count === 0);
      // restore checked state from Shop.state
      cb.checked = Shop.state[group] && Shop.state[group].has(value);
    });
  },

  /* --- Active filter chips --- */
  renderChips() {
    const row = document.querySelector('[data-shop-chips]');
    if (!row) return;

    const chips = [];
    Shop.state.categories.forEach(v => chips.push({ type: 'categories', value: v, label: v }));
    Shop.state.collections.forEach(v => chips.push({ type: 'collections', value: v, label: v }));
    Shop.state.sizes.forEach(v => chips.push({ type: 'sizes', value: v, label: 'Size ' + v }));
    if (Shop.state.query) chips.push({ type: 'query', value: Shop.state.query, label: 'Search: "' + Shop.state.query + '"' });

    if (!chips.length) { row.innerHTML = ''; row.hidden = true; return; }
    row.hidden = false;

    row.innerHTML = chips.map(c =>
      '<span class="mn-chip">' +
        escapeHtml(c.label) +
        ' <button type="button" aria-label="Remove filter ' + escapeHtml(c.label) + '" data-chip-remove data-chip-type="' + c.type + '" data-chip-value="' + escapeHtml(c.value) + '">×</button>' +
      '</span>'
    ).join('') + (chips.length > 1
      ? '<button type="button" class="mn-chip mn-chip--clear" data-chips-clear>Clear all</button>'
      : '');
  },

  /* --- Density --- */
  readDensity() {
    const saved = parseInt(localStorage.getItem('manieste.shop.density'), 10);
    Shop.state.density = [2, 3, 4].indexOf(saved) !== -1 ? saved : 3;
    this.applyDensity();
  },

  applyDensity() {
    const wrap = document.querySelector('[data-shop-grid-wrap]');
    if (wrap) wrap.setAttribute('data-density', Shop.state.density);
    document.querySelectorAll('[data-density-btn]').forEach(btn => {
      btn.setAttribute('aria-pressed', parseInt(btn.dataset.densityBtn, 10) === Shop.state.density ? 'true' : 'false');
    });
  },

  /* --- Filter drawer --- */
  openFilters() {
    const el = document.querySelector('[data-shop-filters]');
    if (!el) return;
    el.setAttribute('aria-hidden', 'false');
    document.body.classList.add('mn-no-scroll');
    if (typeof FocusTrap !== 'undefined') FocusTrap.activate(el);
  },

  closeFilters() {
    const el = document.querySelector('[data-shop-filters]');
    if (!el) return;
    el.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('mn-no-scroll');
    if (typeof FocusTrap !== 'undefined') FocusTrap.deactivate(el);
  },

  /* --- Main apply (filter → sort → paginate → render) --- */
  run() {
    let list = CATALOG.slice();

    if (Shop.state.categories.size)  list = list.filter(p => Shop.state.categories.has(p.category));
    if (Shop.state.collections.size) list = list.filter(p => Shop.state.collections.has(p.collection));
    if (Shop.state.sizes.size)       list = list.filter(p => p.sizes.some(s => Shop.state.sizes.has(s)));

    if (Shop.state.query) {
      const q = Shop.state.query.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.collection.toLowerCase().includes(q)
      );
    }

    switch (Shop.state.sort) {
      case 'price-asc':  list.sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price)); break;
      case 'price-desc': list.sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price)); break;
      case 'newest':     list.reverse(); break;
      default:           list.sort((a, b) => b.rating - a.rating);
    }

    this.render(list);
  },

  /* --- Override render with pagination + chips + empty state --- */
  render(fullList) {
    const grid = document.querySelector('[data-shop-grid]');
    const countEl = document.querySelector('[data-shop-count]');
    const loadMoreWrap = document.querySelector('[data-shop-load-more]');
    const emptyEl = document.querySelector('[data-shop-empty]');
    if (!grid) return;

    const total = fullList.length;
    const page = Shop.state.page || this.LIMIT;
    const visible = fullList.slice(0, page);

    if (countEl) countEl.textContent = total + ' ' + (total === 1 ? 'piece' : 'pieces');

    this.renderChips();
    this.syncURL();

    // Update mobile Filters button count badge
    const activeFilterCount =
      Shop.state.categories.size +
      Shop.state.collections.size +
      Shop.state.sizes.size +
      (Shop.state.query ? 1 : 0);
    const badge = document.querySelector('[data-shop-filters-count]');
    if (badge) {
      badge.textContent = activeFilterCount;
      badge.hidden = activeFilterCount === 0;
    }

    if (total === 0) {
      grid.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
      if (loadMoreWrap) loadMoreWrap.hidden = true;
      return;
    }

    if (emptyEl) emptyEl.hidden = true;

    grid.innerHTML = visible.map(ProductCard.render).join('');
    Wishlist.syncButtons();

    if (loadMoreWrap) {
      const remaining = total - visible.length;
      loadMoreWrap.hidden = remaining <= 0;
      const btn = loadMoreWrap.querySelector('[data-load-more]');
      if (btn) btn.textContent = 'Load more (' + remaining + ' remaining)';
    }
  },

  /* --- Load more --- */
  loadMore() {
    Shop.state.page = (Shop.state.page || this.LIMIT) + this.LIMIT;
    this.run();
  },

  /* --- Bind UI --- */
  bindUI() {
    const self = this;

    // Filter drawer open/close
    document.addEventListener('click', e => {
      if (e.target.closest('[data-shop-filters-open]')) {
        e.preventDefault(); self.openFilters();
      }
      if (e.target.closest('[data-shop-filters-close]')) {
        e.preventDefault(); self.closeFilters();
      }
      const density = e.target.closest('[data-density-btn]');
      if (density) {
        Shop.state.density = parseInt(density.dataset.densityBtn, 10);
        localStorage.setItem('manieste.shop.density', Shop.state.density);
        self.applyDensity();
      }
      const lm = e.target.closest('[data-load-more]');
      if (lm) { e.preventDefault(); self.loadMore(); }

      const rm = e.target.closest('[data-chip-remove]');
      if (rm) {
        const type = rm.dataset.chipType;
        const value = rm.dataset.chipValue;
        if (type === 'query') {
          Shop.state.query = '';
          const inp = document.querySelector('[data-shop-search]');
          if (inp) inp.value = '';
        } else {
          Shop.state[type].delete(value);
          const cb = document.querySelector('[data-shop-filters] [data-filter-group="' + type + '"][value="' + value + '"]');
          if (cb) cb.checked = false;
        }
        Shop.state.page = self.LIMIT;
        self.run();
      }
      if (e.target.closest('[data-chips-clear]')) {
        Shop.state.categories.clear();
        Shop.state.collections.clear();
        Shop.state.sizes.clear();
        Shop.state.query = '';
        document.querySelectorAll('[data-shop-filters] [data-filter-group]').forEach(cb => cb.checked = false);
        const inp = document.querySelector('[data-shop-search]');
        if (inp) inp.value = '';
        Shop.state.page = self.LIMIT;
        self.run();
      }
    });

    // Escape closes filter drawer
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        const el = document.querySelector('[data-shop-filters]');
        if (el && el.getAttribute('aria-hidden') === 'false' && window.matchMedia('(max-width: 991px)').matches) {
          self.closeFilters();
        }
      }
    });

    // On viewport change, force filter sidebar visible on desktop
    const syncViewport = () => {
      const el = document.querySelector('[data-shop-filters]');
      if (!el) return;
      if (window.matchMedia('(min-width: 992px)').matches) {
        el.setAttribute('aria-hidden', 'false');
        document.body.classList.remove('mn-no-scroll');
      } else {
        // only reset when leaving desktop; preserve open state if user had opened it
        if (!el.querySelector(':focus')) el.setAttribute('aria-hidden', 'true');
      }
    };
    window.addEventListener('resize', syncViewport);
    syncViewport();

    // Sync search input to state on load
    const searchInp = document.querySelector('[data-shop-search]');
    if (searchInp && Shop.state.query) searchInp.value = Shop.state.query;
  }
};

/* ---------- Override Shop.apply at script-execution time ---------- */
Shop.state.page = ShopV2.LIMIT;
Shop.state.density = 3;

Shop.apply = function() {
  Shop.state.page = ShopV2.LIMIT; // reset pagination on filter change
  ShopV2.run();
};

/* Read URL immediately so main.js's DOMContentLoaded apply() has correct state */
if (document.querySelector('[data-shop-grid]')) {
  ShopV2.readURL();
}

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  if (!document.querySelector('[data-shop-grid]')) return;

  ShopV2.readDensity();
  ShopV2.updateFilterCounts();
  ShopV2.bindUI();
  // main.js already called Shop.apply() — but state may now have URL/density applied
  ShopV2.run();
});
