'use strict';

/* ==========================================================================
   MANIESTA LABEL — Animation orchestration
   Phase 1: scroll reveal, stagger, page exit, hero trigger
   ========================================================================== */

/* --- Respect reduced motion --- */
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --- IntersectionObserver for reveals --- */
const Reveal = {
  observer: null,

  init() {
    if (REDUCED_MOTION) {
      // Immediately reveal everything
      document.querySelectorAll('[data-reveal], [data-stagger], [data-reveal-text], [data-reveal-image]')
        .forEach(el => el.classList.add('is-revealed'));
      return;
    }

    // Bail if the browser doesn't support IO
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('[data-reveal], [data-stagger], [data-reveal-text], [data-reveal-image]')
        .forEach(el => el.classList.add('is-revealed'));
      return;
    }

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          // One-shot — stop watching once revealed
          this.observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -8% 0px',
      threshold: 0.08
    });

    this.scan();
  },

  scan() {
    const targets = document.querySelectorAll(
      '[data-reveal]:not(.is-revealed), [data-stagger]:not(.is-revealed), [data-reveal-text]:not(.is-revealed), [data-reveal-image]:not(.is-revealed)'
    );
    targets.forEach(el => this.observer.observe(el));
  },

  // Called when new content is injected (product grids rendered by JS)
  refresh() {
    if (REDUCED_MOTION || !this.observer) return;
    this.scan();
  }
};

/* --- Auto-tag common patterns --- */
const AutoReveal = {
  apply() {
    if (REDUCED_MOTION) return;

    // Product grids — reveal children with stagger
    document.querySelectorAll('.mn-product-grid').forEach(grid => {
      if (!grid.hasAttribute('data-reveal-auto') && !grid.closest('[data-reveal]')) {
        grid.setAttribute('data-reveal-auto', '');
        grid.setAttribute('data-stagger', '');
      }
    });

    // Section heads — fade up
    document.querySelectorAll('.mn-section-head').forEach(head => {
      if (!head.hasAttribute('data-reveal') && !head.closest('[data-reveal]')) {
        head.setAttribute('data-reveal', 'up');
      }
    });

    // Editorial blocks — text reveal
    document.querySelectorAll('.mn-editorial__content').forEach(el => {
      if (!el.hasAttribute('data-reveal-text') && !el.closest('[data-reveal]')) {
        el.setAttribute('data-reveal-text', '');
      }
    });

    // Editorial media — image reveal
    document.querySelectorAll('.mn-editorial__media, .mn-story__media, .mn-category-card').forEach(el => {
      if (!el.hasAttribute('data-reveal-image') && !el.closest('[data-reveal]')) {
        el.setAttribute('data-reveal-image', '');
      }
    });

    // Trust row — stagger
    document.querySelectorAll('.mn-trust-row').forEach(el => {
      if (!el.hasAttribute('data-stagger') && !el.closest('[data-reveal]')) {
        el.setAttribute('data-stagger', '');
      }
    });

    // Cart items — stagger
    document.querySelectorAll('.mn-cart-items').forEach(el => {
      if (!el.hasAttribute('data-stagger')) el.setAttribute('data-stagger', '');
    });
  }
};

/* --- Cart badge bump on change --- */
const BadgeBump = {
  init() {
    document.addEventListener('mn:cart-changed', () => {
      document.querySelectorAll('[data-cart-count]').forEach(el => {
        el.classList.remove('is-bumping');
        // Force reflow to restart animation
        void el.offsetWidth;
        el.classList.add('is-bumping');
        setTimeout(() => el.classList.remove('is-bumping'), 400);
      });
    });
  }
};

/* --- Page exit animation on internal link click --- */
const PageTransition = {
  init() {
    if (REDUCED_MOTION) return;
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;
      if (link.target === '_blank') return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const href = link.getAttribute('href');
      if (!href) return;
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('http')) return;
      if (link.hasAttribute('data-no-transition')) return;

      e.preventDefault();
      document.body.classList.add('mn-page-exit');
      setTimeout(() => { window.location.href = href; }, 120);
    });
  }
};

/* --- Hero entrance marker --- */
const HeroMarker = {
  init() {
    // Add the ready class to enable page-enter animations
    requestAnimationFrame(() => {
      document.body.classList.add('mn-animations-ready');
    });
  }
};

/* --- Refresh reveals when JS injects content --- */
const ContentWatcher = {
  init() {
    // Watch for cart drawer re-renders and product grid re-renders
    document.addEventListener('mn:cart-changed', () => Reveal.refresh());
    document.addEventListener('mn:content-changed', () => Reveal.refresh());

    // Also re-scan on any MutationObserver event in the product grids
    // (lightweight — only watches grids, not entire DOM)
    const grids = document.querySelectorAll('.mn-product-grid, .mn-cart-items');
    if (!grids.length || !('MutationObserver' in window)) return;

    const mo = new MutationObserver((mutations) => {
      let added = false;
      mutations.forEach(m => { if (m.addedNodes.length) added = true; });
      if (added) Reveal.refresh();
    });

    grids.forEach(g => mo.observe(g, { childList: true }));
  }
};

/* --- Boot --- */
document.addEventListener('DOMContentLoaded', () => {
  HeroMarker.init();
  AutoReveal.apply();
  Reveal.init();
  BadgeBump.init();
  PageTransition.init();
  ContentWatcher.init();
});
