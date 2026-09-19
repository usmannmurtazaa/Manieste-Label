'use strict';

/* Search results page */
const SearchPage = {
  state: { query: '', sort: 'featured' },
  render() {
    const grid = document.querySelector('[data-search-page-grid]');
    const countEl = document.querySelector('[data-search-page-count]');
    const heading = document.querySelector('[data-search-heading]');
    if (!grid) return;

    const q = this.state.query.trim().toLowerCase();
    if (heading) {
      heading.textContent = q
        ? 'Results for "' + this.state.query.trim() + '"'
        : 'Search the collection';
    }

    let list = q
      ? CATALOG.filter(function(p) {
          return p.name.toLowerCase().includes(q) ||
                 p.category.toLowerCase().includes(q) ||
                 p.collection.toLowerCase().includes(q) ||
                 p.shortDesc.toLowerCase().includes(q);
        })
      : [];

    switch (this.state.sort) {
      case 'price-asc':  list.sort(function(a, b) { return (a.salePrice || a.price) - (b.salePrice || b.price); }); break;
      case 'price-desc': list.sort(function(a, b) { return (b.salePrice || b.price) - (a.salePrice || a.price); }); break;
      case 'newest':     list.reverse(); break;
      default:           list.sort(function(a, b) { return b.rating - a.rating; });
    }

    if (countEl) countEl.textContent = list.length + ' result' + (list.length === 1 ? '' : 's');

    if (!q) { grid.innerHTML = ''; return; }
    if (!list.length) {
      grid.innerHTML =
        '<div class="mn-empty" style="grid-column:1/-1">' +
          '<p class="mn-empty__title">Nothing matches "' + escapeHtml(this.state.query.trim()) + '"</p>' +
          '<p class="mn-empty__text">Try a different search, or browse the full collection.</p>' +
          '<a class="mn-btn" href="shop.html">Browse shop</a>' +
        '</div>';
      return;
    }
    grid.innerHTML = list.map(ProductCard.render).join('');
    Wishlist.syncButtons();
  },
  bind() {
    if (!document.querySelector('[data-search-page-grid]')) return;
    const params = new URLSearchParams(location.search);
    this.state.query = params.get('q') || '';
    const self = this;
    const input = document.querySelector('[data-search-page-input]');
    if (input) {
      input.value = this.state.query;
      input.addEventListener('input', function() {
        self.state.query = input.value;
        const url = new URL(location.href);
        if (input.value) url.searchParams.set('q', input.value);
        else url.searchParams.delete('q');
        history.replaceState(null, '', url);
        self.render();
      });
    }
    const sort = document.querySelector('[data-search-page-sort]');
    if (sort) sort.addEventListener('change', function() { self.state.sort = sort.value; self.render(); });
    this.render();
  }
};

/* Account tabs */
const Account = {
  bind() {
    const nav = document.querySelector('.mn-account-nav');
    if (!nav) return;
    const tabs = nav.querySelectorAll('[data-account-tab]');
    const panels = document.querySelectorAll('[data-account-panel]');

    const activate = function(name) {
      tabs.forEach(function(t) {
        t.setAttribute('aria-current', t.dataset.accountTab === name ? 'page' : 'false');
      });
      panels.forEach(function(p) { p.hidden = p.dataset.accountPanel !== name; });
      history.replaceState(null, '', '#' + name);
    };

    tabs.forEach(function(t) {
      t.addEventListener('click', function(e) {
        e.preventDefault();
        activate(t.dataset.accountTab);
      });
    });

    const initial = location.hash.replace('#', '') || 'signin';
    if (Array.from(tabs).some(function(t) { return t.dataset.accountTab === initial; })) activate(initial);

    document.querySelectorAll('[data-account-form]').forEach(function(f) {
      f.addEventListener('submit', function(e) {
        e.preventDefault();
        if (!f.checkValidity()) { f.reportValidity(); return; }
        Toast.show('Demo - no account system connected yet.');
        f.reset();
      });
    });
  }
};

/* Best sellers on homepage */
const BestSellers = {
  mount() {
    const best = document.querySelector('[data-best-sellers]');
    if (!best || typeof CATALOG === 'undefined' || !CATALOG.length) return;
    const sorted = CATALOG.slice().sort(function(a, b) { return b.rating - a.rating; }).slice(0, 4);
    best.innerHTML = sorted.map(ProductCard.render).join('');
    Wishlist.syncButtons();
  }
};

document.addEventListener('DOMContentLoaded', function() {
  SearchPage.bind();
  Account.bind();
  BestSellers.mount();
});
