'use strict';

/* ==========================================================================
   MANIESTA LABEL — Cart + Wishlist sync
   Guest: localStorage. Signed in: Firestore users/{uid}
   Merges guest data into cloud on sign-in, clears local after.
   ========================================================================== */

import { getDb } from './firebase-init.js';
import { FEATURES } from './firebase-config.js';

const CartSync = {
  _uid: null,
  _patched: false,

  async init() {
    if (!FEATURES.AUTH || !FEATURES.FIRESTORE) {
      console.log('[CartSync] Firebase disabled — localStorage only');
      return;
    }

    // Wait for DOMContentLoaded
    if (document.readyState === 'loading') {
      await new Promise(r => document.addEventListener('DOMContentLoaded', r, { once: true }));
    }

    // Give main.js a moment to finish its own DOMContentLoaded work
    await new Promise(r => setTimeout(r, 50));

    if (!window.Cart || !window.Wishlist) {
      console.warn('[CartSync] window.Cart / window.Wishlist missing. Add "window.Cart = Cart; window.Wishlist = Wishlist;" to the bottom of main.js.');
      return;
    }

    this._patchCart();
    this._patchWishlist();
    this._patched = true;
    console.log('[CartSync] Ready — cart and wishlist will sync to Firestore for signed-in users');
  },

  /* ---------- Auth state changes ---------- */
  async onAuthChange(user) {
    if (!this._patched) return;

    if (user) {
      this._uid = user.uid;
      await this._pullFromCloud(user.uid);
      await this._mergeGuestIntoCloud(user.uid);
      this._renderAll();
    } else {
      this._uid = null;
      window.Cart._load();
      window.Wishlist._load();
      this._renderAll();
    }
  },

  _renderAll() {
    if (window.Cart && window.Cart.render) window.Cart.render();
    if (window.Cart && window.Cart.badge) window.Cart.badge();
    if (window.Wishlist && window.Wishlist.render) window.Wishlist.render();
    if (window.Wishlist && window.Wishlist.syncButtons) window.Wishlist.syncButtons();
    document.dispatchEvent(new CustomEvent('mn:cart-changed'));
  },

  /* ---------- Firestore read ---------- */
  async _pullFromCloud(uid) {
    try {
      const db = await getDb();
      if (!db) return;
      const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
      const snap = await getDoc(doc(db, 'users', uid));
      const data = snap.exists() ? snap.data() : {};

      window.Cart._items = Array.isArray(data.cart) ? data.cart.slice() : [];
      window.Wishlist._ids = Array.isArray(data.wishlist) ? data.wishlist.slice() : [];
      console.log('[CartSync] Pulled cart (' + window.Cart._items.length + ') + wishlist (' + window.Wishlist._ids.length + ')');
    } catch (err) {
      console.warn('[CartSync] Pull failed:', err.message);
    }
  },

  /* ---------- Merge guest data into cloud ---------- */
  async _mergeGuestIntoCloud(uid) {
    try {
      const guestCart = this._readLocal('manieste.cart.v1');
      const guestWish = this._readLocal('manieste.wishlist.v1');
      let changed = false;

      if (Array.isArray(guestCart) && guestCart.length) {
        for (const gi of guestCart) {
          const existing = window.Cart._items.find(i => i.key === gi.key);
          if (existing) existing.qty = (existing.qty || 0) + (gi.qty || 1);
          else window.Cart._items.push(gi);
        }
        changed = true;
      }

      if (Array.isArray(guestWish) && guestWish.length) {
        for (const gid of guestWish) {
          if (!window.Wishlist._ids.includes(gid)) window.Wishlist._ids.push(gid);
        }
        changed = true;
      }

      if (changed) {
        await this._pushToCloud(uid);
        try { localStorage.removeItem('manieste.cart.v1'); } catch {}
        try { localStorage.removeItem('manieste.wishlist.v1'); } catch {}
        console.log('[CartSync] Guest data merged into cloud');
      }
    } catch (err) {
      console.warn('[CartSync] Merge failed:', err.message);
    }
  },

  /* ---------- Firestore write ---------- */
  async _pushToCloud(uid) {
    try {
      const db = await getDb();
      if (!db) return;
      const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
      await setDoc(doc(db, 'users', uid), {
        cart: window.Cart._items,
        wishlist: window.Wishlist._ids,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.warn('[CartSync] Push failed:', err.message);
    }
  },

  _readLocal(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  },

  /* ---------- Patch Cart ---------- */
  _patchCart() {
    const Cart = window.Cart;

    Cart._items = [];
    Cart._load = function() {
      if (CartSync._uid) return; // populated by pull
      const raw = CartSync._readLocal('manieste.cart.v1');
      this._items = Array.isArray(raw) ? raw : [];
    };

    Cart.get = function() { return this._items; };

    Cart.set = function(items) {
      this._items = items;
      if (CartSync._uid) {
        CartSync._pushToCloud(CartSync._uid);
      } else {
        try { localStorage.setItem('manieste.cart.v1', JSON.stringify(items)); } catch {}
      }
      this.render();
      this.badge();
      document.dispatchEvent(new CustomEvent('mn:cart-changed'));
    };

    Cart.count = function() {
      return this._items.reduce((s, i) => s + (i.qty || 0), 0);
    };

    Cart.subtotal = function() {
      return this._items.reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0);
    };

    Cart.add = function(product, size, color, qty) {
      qty = qty || 1;
      const items = this.get().slice();
      const key = product.id + '|' + size + '|' + color;
      const existing = items.find(i => i.key === key);
      if (existing) {
        existing.qty = (existing.qty || 0) + qty;
      } else {
        items.push({
          key: key,
          id: product.id,
          name: product.name,
          slug: product.slug,
          price: (product.salePrice !== null && product.salePrice !== undefined) ? product.salePrice : product.price,
          image: product.images[0],
          size: size,
          color: color,
          qty: qty
        });
      }
      this.set(items);
      if (window.Toast) Toast.show(product.name + ' added to bag');
    };

    Cart.update = function(key, qty) {
      let items = this.get().slice();
      if (qty <= 0) items = items.filter(i => i.key !== key);
      else items = items.map(i => i.key === key ? Object.assign({}, i, { qty: qty }) : i);
      this.set(items);
    };

    Cart.remove = function(key) {
      this.set(this.get().filter(i => i.key !== key));
    };

    Cart._load();
  },

  /* ---------- Patch Wishlist ---------- */
  _patchWishlist() {
    const Wishlist = window.Wishlist;

    Wishlist._ids = [];
    Wishlist._load = function() {
      if (CartSync._uid) return;
      const raw = CartSync._readLocal('manieste.wishlist.v1');
      this._ids = Array.isArray(raw) ? raw : [];
    };

    Wishlist.get = function() { return this._ids; };

    Wishlist.has = function(id) { return this._ids.includes(id); };

    Wishlist.set = function(ids) {
      this._ids = ids;
      if (CartSync._uid) {
        CartSync._pushToCloud(CartSync._uid);
      } else {
        try { localStorage.setItem('manieste.wishlist.v1', JSON.stringify(ids)); } catch {}
      }
      this.syncButtons();
    };

    Wishlist.toggle = function(id) {
      const has = this.has(id);
      const next = has ? this._ids.filter(x => x !== id) : this._ids.concat([id]);
      this.set(next);
      if (window.Toast) Toast.show(has ? 'Removed from wishlist' : 'Saved to wishlist');
    };

    Wishlist.count = function() { return this._ids.length; };

    Wishlist._load();
  }
};

window.CartSync = CartSync;
CartSync.init();
