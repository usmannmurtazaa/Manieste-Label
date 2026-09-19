'use strict';

/* ==========================================================================
   MANIESTA LABEL — Loading state orchestrator
   Phase 2: skeletons, empty states, error states, retry hooks
   ========================================================================== */

const Loading = {
  /* --- Skeleton card grid (before product render) --- */
  productGrid(container, count) {
    if (!container) return;
    const n = count || 4;
    let html = '';
    for (let i = 0; i < n; i++) {
      html +=
        '<div class="mn-skeleton-card">' +
          '<div class="mn-skeleton-card__media"></div>' +
          '<div class="mn-skeleton-card__body">' +
            '<div class="mn-skeleton-line" style="width:70%"></div>' +
            '<div class="mn-skeleton-line" style="width:40%;height:10px"></div>' +
          '</div>' +
        '</div>';
    }
    container.innerHTML = html;
    container.classList.remove('mn-loaded');
  },

  /* --- Inline spinner block (for whole-section load) --- */
  block(container, message) {
    if (!container) return;
    container.innerHTML =
      '<div class="mn-loading-block">' +
        '<span class="mn-spinner"></span>' +
        '<p>' + (message || 'Loading') + '</p>' +
      '</div>';
  },

  /* --- Line-level skeleton (for cart items, small lists) --- */
  lines(container, count) {
    if (!container) return;
    const n = count || 3;
    let html = '';
    for (let i = 0; i < n; i++) {
      html +=
        '<div style="display:grid;grid-template-columns:64px 1fr;gap:12px;padding:16px 0;border-bottom:1px solid var(--mn-hairline)">' +
          '<div class="mn-skeleton" style="aspect-ratio:3/4"></div>' +
          '<div style="display:flex;flex-direction:column;gap:8px;justify-content:center">' +
            '<div class="mn-skeleton-line" style="width:80%"></div>' +
            '<div class="mn-skeleton-line" style="width:40%;height:10px"></div>' +
          '</div>' +
        '</div>';
    }
    container.innerHTML = html;
  },

  /* --- Empty state --- */
  empty(container, opts) {
    if (!container) return;
    const o = opts || {};
    container.innerHTML =
      '<div class="mn-empty">' +
        (o.icon ? '<div class="mn-empty__icon"><i class="' + o.icon + '"></i></div>' : '') +
        '<p class="mn-empty__title">' + (o.title || 'Nothing here yet') + '</p>' +
        '<p class="mn-empty__text">' + (o.text || '') + '</p>' +
        (o.actions && o.actions.length
          ? '<div class="mn-empty__actions">' + o.actions.map(function(a) {
              return '<a class="mn-btn' + (a.variant ? ' mn-btn--' + a.variant : '') + '" href="' + a.href + '">' + a.label + '</a>';
            }).join('') + '</div>'
          : '') +
      '</div>';
  },

  /* --- Error state --- */
  error(container, opts) {
    if (!container) return;
    const o = opts || {};
    const plain = o.plain ? ' mn-error--plain' : '';
    container.innerHTML =
      '<div class="mn-error' + plain + '">' +
        '<div class="mn-error__icon"><i class="fas fa-exclamation-triangle"></i></div>' +
        '<p class="mn-error__title">' + (o.title || 'Something went wrong') + '</p>' +
        '<p class="mn-error__text">' + (o.text || 'Please check your connection and try again.') + '</p>' +
        '<div class="mn-error__actions">' +
          (o.retry
            ? '<button type="button" class="mn-btn mn-btn--outline mn-error__retry" data-retry>' +
                '<i class="fas fa-redo"></i> Try again' +
              '</button>'
            : '') +
          (o.home
            ? '<a class="mn-btn" href="index.html">Back to home</a>'
            : '') +
        '</div>' +
      '</div>';

    // Wire retry if requested
    if (o.retry && typeof o.retry === 'function') {
      const btn = container.querySelector('[data-retry]');
      if (btn) btn.addEventListener('click', function() {
        // Reset container before calling retry
        container.innerHTML = '';
        o.retry();
      });
    }
  },

  /* --- Mark content as freshly loaded (fade in) --- */
  markLoaded(container) {
    if (!container) return;
    container.classList.add('mn-loaded');
  }
};

/* --- Notify animations module that content changed --- */
function notifyContentChanged() {
  document.dispatchEvent(new CustomEvent('mn:content-changed'));
}

/* --- Expose globally --- */
window.Loading = Loading;
window.notifyContentChanged = notifyContentChanged;

/* --- Boot: pre-populate skeletons on grids that render async --- */
document.addEventListener('DOMContentLoaded', function() {
  // Shop grid — skeleton until Shop.apply runs
  const shopGrid = document.querySelector('[data-shop-grid]');
  if (shopGrid && !shopGrid.children.length) {
    Loading.productGrid(shopGrid, 6);
  }

  // Cart drawer — skeleton until first cart render
  const cartDrawer = document.querySelector('[data-cart-drawer-body]');
  if (cartDrawer && !cartDrawer.children.length) {
    Loading.lines(cartDrawer, 2);
  }

  // Cart page — skeleton
  const cartRoot = document.querySelector('[data-cart-root]');
  if (cartRoot && !cartRoot.children.length) {
    Loading.lines(cartRoot, 3);
  }

  // Wishlist page
  const wishRoot = document.querySelector('[data-wishlist-root]');
  if (wishRoot && !wishRoot.children.length) {
    Loading.productGrid(wishRoot, 3);
  }
});
