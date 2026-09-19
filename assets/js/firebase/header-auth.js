'use strict';

/* ==========================================================================
   MANIESTA LABEL — Header auth dropdown
   Enhances the account icon with a menu for signed-in users.
   Uses onAuthStateChanged. Never trusts localStorage for auth state.
   ========================================================================== */

import { Auth } from './auth.js';

const $ = (s, c = document) => c.querySelector(s);

const MENU_HTML = (email) => `
  <div class="mn-user-menu" data-user-menu>
    <div class="mn-user-menu__head">
      <p class="mn-user-menu__label">Signed in</p>
      <p class="mn-user-menu__email">${email ? email.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c])) : ''}</p>
    </div>
    <nav class="mn-user-menu__nav" aria-label="Account menu">
      <a href="account.html">My Account</a>
      <a href="account.html#orders">My Orders</a>
      <a href="wishlist.html">Wishlist</a>
      <button type="button" class="mn-user-menu__signout" data-header-signout>Sign out</button>
    </nav>
  </div>
`;

const HeaderAuth = {
  _anchor: null,
  _menu: null,
  _user: null,

  init() {
    const anchor = document.querySelector('.mn-header__nav--right a[aria-label="Account"]');
    if (!anchor) return;
    this._anchor = anchor;

    // Attach listener — will fire immediately with current state
    Auth.onAuthChange((user) => {
      this._user = user;
      this._sync(user);
    });

    // Global handlers
    document.addEventListener('click', (e) => this._onDocClick(e));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  },

  _sync(user) {
    const anchor = this._anchor;
    if (!anchor) return;

    // Detach any existing menu
    this.close();

    // Reset anchor
    anchor.classList.remove('mn-icon-btn--authed');
    anchor.setAttribute('aria-haspopup', user ? 'menu' : 'false');
    anchor.setAttribute('aria-expanded', 'false');

    if (!user) {
      // Guest — link behaves like a normal link
      anchor.href = 'account.html';
      anchor.style.cursor = '';
    } else {
      // Signed in — intercept clicks
      anchor.removeAttribute('href');
      anchor.classList.add('mn-icon-btn--authed');
      anchor.style.cursor = 'pointer';
    }
  },

  open() {
    if (!this._user || this._menu) return;
    const anchor = this._anchor;
    if (!anchor) return;

    // Build menu
    const wrap = document.createElement('div');
    wrap.innerHTML = MENU_HTML(this._user.email || '');
    this._menu = wrap.firstElementChild;

    // Position relative to header nav
    const parent = anchor.parentElement;
    parent.style.position = 'relative';
    parent.appendChild(this._menu);

    anchor.setAttribute('aria-expanded', 'true');

    // Bind sign out
    const so = this._menu.querySelector('[data-header-signout]');
    if (so) {
      so.addEventListener('click', async (e) => {
        e.preventDefault();
        so.disabled = true;
        so.textContent = 'Signing out…';
        await Auth.signOut();
        window.location.href = 'index.html';
      });
    }
  },

  close() {
    if (this._menu && this._menu.parentNode) this._menu.parentNode.removeChild(this._menu);
    this._menu = null;
    if (this._anchor) this._anchor.setAttribute('aria-expanded', 'false');
  },

  _onDocClick(e) {
    const anchor = this._anchor;
    if (!anchor) return;

    // Click on the anchor itself
    if (anchor.contains(e.target)) {
      if (!this._user) return; // guest — let the link work
      e.preventDefault();
      if (this._menu) this.close();
      else this.open();
      return;
    }

    // Click inside the menu
    if (this._menu && this._menu.contains(e.target)) return;

    // Click outside
    if (this._menu) this.close();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  HeaderAuth.init();
});

window.MN_HeaderAuth = HeaderAuth;
