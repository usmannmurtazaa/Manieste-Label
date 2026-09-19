'use strict';

/* ==========================================================================
   MANIESTA LABEL — Orders data layer
   createOrder, getOrder, listOrders, plus localStorage fallback for
   the confirmation page (survives sign-out / refresh)
   ========================================================================== */

import { getDb } from './firebase-init.js';
import { FEATURES } from './firebase-config.js';

const LOCAL_KEY = 'manieste.last-order.v1';

const Orders = {
  /* ---------- Create ---------- */
  async create(orderData) {
    try {
      if (!FEATURES.FIRESTORE) throw new Error('Firestore not enabled');
      const db = await getDb();
      if (!db) throw new Error('Firestore unavailable');

      const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

      const payload = Object.assign({}, orderData, {
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Strip undefined values — Firestore rejects them
      Object.keys(payload).forEach(k => {
        if (payload[k] === undefined) delete payload[k];
      });

      const ref = await addDoc(collection(db, 'orders'), payload);

      // Cache locally for the confirmation page (works after refresh/sign-out)
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify({
          id: ref.id,
          order: Object.assign({}, orderData, {
            status: 'pending',
            createdAt: new Date().toISOString()
          })
        }));
      } catch {}

      return { id: ref.id, error: null };
    } catch (err) {
      console.warn('[Orders] create failed:', err.message);
      return { id: null, error: err.message };
    }
  },

  /* ---------- Get one (for confirmation page) ---------- */
  async get(orderId) {
    // 1. Local cache first — authoritative right after checkout
    let local = null;
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (cached && cached.id === orderId) {
          local = cached.order;
          // Fresh local copy — skip Firestore entirely
          return { order: local, source: 'local' };
        }
      }
    } catch {}

    // 2. Firestore (only if local cache is empty/missing)
    try {
      if (FEATURES.FIRESTORE) {
        const db = await getDb();
        if (db) {
          const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
          const snap = await getDoc(doc(db, 'orders', orderId));
          if (snap.exists()) {
            const data = snap.data();
            // Convert Firestore timestamp → ISO string for consistent rendering
            if (data.createdAt && typeof data.createdAt.toDate === 'function') {
              data.createdAt = data.createdAt.toDate().toISOString();
            }
            return { order: data, source: 'firestore' };
          }
        }
      }
    } catch (err) {
      // Silent — normal when user isn't the order owner. Falls through.
    }

    // 3. Nothing available
    return { order: null, source: 'none' };
  },

  /* ---------- List (for account orders tab) ---------- */
  async list(uid) {
    try {
      if (!FEATURES.FIRESTORE) throw new Error('Firestore not enabled');
      const db = await getDb();
      if (!db) throw new Error('Firestore unavailable');

      const { collection, query, where, orderBy, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

      const q = query(
        collection(db, 'orders'),
        where('userId', '==', uid),
        orderBy('createdAt', 'desc')
      );

      const snap = await getDocs(q);
      const orders = [];
      snap.forEach(doc => {
        const data = doc.data();
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          data.createdAt = data.createdAt.toDate().toISOString();
        }
        orders.push(Object.assign({ id: doc.id }, data));
      });
      return { orders, error: null };
    } catch (err) {
      console.warn('[Orders] list failed:', err.message);
      return { orders: [], error: err.message };
    }
  },

  /* ---------- Utility ---------- */
  clearLocal() {
    try { localStorage.removeItem(LOCAL_KEY); } catch {}
  }
};

window.MN_Orders = Orders;