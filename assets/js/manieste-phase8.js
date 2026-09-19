'use strict';

/* ==========================================================================
   MANIESTA LABEL - Phase 8
   Screen reader announcements, image perf helpers, prefetch on intent
   ========================================================================== */

/* --- Live region for cart + filter updates --- */
const Live = {
  el: null,
  ensure() {
    if (this.el) return this.el;
    this.el = document.createElement('div');
    this.el.className = 'mn-live';
    this.el.setAttribute('role', 'status');
    this.el.setAttribute('aria-live', 'polite');
    this.el.setAttribute('aria-atomic', 'true');
    document.body.appendChild(this.el);
    return this.el;
  },
  say(msg) {
    const el = this.ensure();
    el.textContent = '';
    setTimeout(() => { el.textContent = msg; }, 40);
  }
};

/* --- Announce cart changes --- */
document.addEventListener('mn:cart-changed', () => {
  if (typeof Cart === 'undefined') return;
  const n = Cart.count();
  Live.say(n === 0 ? 'Bag is empty' : 'Bag updated - ' + n + (n === 1 ? ' item' : ' items'));
});

/* --- Announce wishlist changes --- */
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-wish-toggle]');
  if (!t || typeof Wishlist === 'undefined') return;
  // Wishlist.toggle already fires Toast; Live region mirrors it
  setTimeout(() => {
    Live.say(Wishlist.has(t.dataset.wishToggle) ? 'Added to wishlist' : 'Removed from wishlist');
  }, 10);
});

/* --- Ensure all icon-only buttons have accessible names --- */
const A11y = {
  fixIconButtons() {
    document.querySelectorAll('button, a').forEach(el => {
      const hasText = el.textContent.trim().length > 0;
      const hasAria = el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby');
      const hasTitle = el.hasAttribute('title');
      if (!hasText && !hasAria && !hasTitle && el.querySelector('i, svg')) {
        // Only flag in console during dev
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
          console.warn('[A11y] Icon button missing accessible name:', el);
        }
      }
    });
  },

  setLang() {
    // If we can't detect Pakistani locale, default to en-PK
    const html = document.documentElement;
    if (html.lang === 'en') html.lang = 'en-PK';
  },

  currentNavHighlight() {
    const path = location.pathname.split('/').pop() || 'index.html';
    const params = new URLSearchParams(location.search);
    document.querySelectorAll('.mn-header__link, .mn-mobile-menu nav a').forEach(a => {
      const href = a.getAttribute('href') || '';
      const [file, qs] = href.split('?');
      const fileMatch = file === path || (file === '' && path === 'index.html');
      if (!fileMatch) return;
      if (qs) {
        const want = new URLSearchParams(qs);
        const same = [...want].every(([k, v]) => params.get(k) === v);
        if (same) a.setAttribute('aria-current', 'page');
      } else {
        a.setAttribute('aria-current', 'page');
      }
    });
  }
};

/* --- Image perf: add lazy/async defaults to any img missing them --- */
const Images = {
  normalize() {
    document.querySelectorAll('img').forEach(img => {
      // Skip hero/above-fold images
      if (img.hasAttribute('fetchpriority') && img.getAttribute('fetchpriority') === 'high') return;
      if (!img.hasAttribute('loading') && !img.dataset.hero) {
        img.setAttribute('loading', 'lazy');
      }
      if (!img.hasAttribute('decoding')) {
        img.setAttribute('decoding', 'async');
      }
    });
  }
};

/* --- Prefetch internal links on hover (idle) --- */
const Prefetch = {
  seen: new Set(),
  bind() {
    if (!('requestIdleCallback' in window)) return;
    const links = document.querySelectorAll('a[href$=".html"], a[href*=".html?"]');
    links.forEach(a => {
      const href = a.href;
      if (this.seen.has(href)) return;
      if (a.hostname !== location.hostname) return;

      a.addEventListener('mouseenter', () => {
        if (this.seen.has(href)) return;
        this.seen.add(href);
        requestIdleCallback(() => {
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = href;
          document.head.appendChild(link);
        });
      }, { once: true });
    });
  }
};

/* --- Boot --- */
document.addEventListener('DOMContentLoaded', () => {
  A11y.setLang();
  A11y.fixIconButtons();
  A11y.currentNavHighlight();
  Images.normalize();
  Prefetch.bind();
});
