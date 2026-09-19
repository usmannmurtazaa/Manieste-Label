'use strict';

/* ==========================================================================
   MANIESTA LABEL — Admin dashboard
   Role-gated: users/{uid}.role == 'admin'
   Sections: Dashboard, Orders, Products
   ========================================================================== */

import { Auth } from './auth.js';
import { getDb } from './firebase-init.js';
import { FEATURES } from './firebase-config.js';

const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

const state = {
  user: null,
  orders: [],
  products: [],
  currentTab: 'dashboard',
  orderFilter: 'all'
};

/* ---------- Utilities ---------- */
function fmtRs(n) { return 'Rs. ' + (Number(n) || 0).toLocaleString('en-PK'); }
function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return iso; }
}
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- Permission check ---------- */
async function checkAdmin(user) {
  if (!user) return false;
  try {
    const db = await getDb();
    if (!db) return false;
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (!snap.exists()) return false;
    return snap.data().role === 'admin';
  } catch (err) {
    console.warn('[Admin] role check failed:', err.message);
    return false;
  }
}

/* ---------- Data fetchers ---------- */
async function loadOrders() {
  try {
    const db = await getDb();
    if (!db) throw new Error('Firestore unavailable');
    const { collection, query, orderBy, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const orders = [];
    snap.forEach(doc => {
      const d = doc.data();
      if (d.createdAt && typeof d.createdAt.toDate === 'function') d.createdAt = d.createdAt.toDate().toISOString();
      orders.push(Object.assign({ id: doc.id }, d));
    });
    state.orders = orders;
    return orders;
  } catch (err) {
    console.error('[Admin] loadOrders failed:', err.message);
    throw err;
  }
}

async function loadProducts() {
  try {
    const db = await getDb();
    if (!db) throw new Error('Firestore unavailable');
    const { collection, query, orderBy, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const products = [];
    snap.forEach(doc => products.push(Object.assign({ id: doc.id }, doc.data())));
    state.products = products;
    return products;
  } catch (err) {
    console.error('[Admin] loadProducts failed:', err.message);
    throw err;
  }
}

/* ---------- Update order status ---------- */
async function updateOrderStatus(orderId, newStatus) {
  try {
    const db = await getDb();
    const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    await updateDoc(doc(db, 'orders', orderId), {
      status: newStatus,
      updatedAt: serverTimestamp()
    });
    // Update local state
    const order = state.orders.find(o => o.id === orderId);
    if (order) order.status = newStatus;
    return { error: null };
  } catch (err) {
    console.error('[Admin] update failed:', err.message);
    return { error: err.message };
  }
}

/* ---------- Render: Dashboard ---------- */
function renderDashboard() {
  const orders = state.orders;
  const totalOrders = orders.length;
  const pending = orders.filter(o => o.status === 'pending').length;
  const shipped = orders.filter(o => o.status === 'shipped').length;
  const delivered = orders.filter(o => o.status === 'delivered').length;
  const revenue = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((s, o) => s + (o.total || 0), 0);
  const pendingRevenue = orders
    .filter(o => o.status === 'pending' || o.status === 'confirmed' || o.status === 'processing')
    .reduce((s, o) => s + (o.total || 0), 0);

  return `
    <div class="mn-admin-stats">
      <div class="mn-admin-stat">
        <p class="mn-admin-stat__label">Total orders</p>
        <p class="mn-admin-stat__value">${totalOrders}</p>
      </div>
      <div class="mn-admin-stat">
        <p class="mn-admin-stat__label">Pending</p>
        <p class="mn-admin-stat__value">${pending}</p>
      </div>
      <div class="mn-admin-stat">
        <p class="mn-admin-stat__label">Shipped</p>
        <p class="mn-admin-stat__value">${shipped}</p>
      </div>
      <div class="mn-admin-stat">
        <p class="mn-admin-stat__label">Delivered</p>
        <p class="mn-admin-stat__value">${delivered}</p>
      </div>
      <div class="mn-admin-stat">
        <p class="mn-admin-stat__label">Total revenue</p>
        <p class="mn-admin-stat__value">${fmtRs(revenue)}</p>
      </div>
      <div class="mn-admin-stat">
        <p class="mn-admin-stat__label">Pending value</p>
        <p class="mn-admin-stat__value">${fmtRs(pendingRevenue)}</p>
      </div>
    </div>

    <div class="mn-admin-section">
      <h2 class="mn-admin-section__title">Recent orders</h2>
      ${orders.length === 0
        ? '<p class="mn-small mn-muted">No orders yet. Place one from the storefront to see it here.</p>'
        : `<div class="mn-admin-table-wrap">${renderOrdersTable(orders.slice(0, 8))}</div>`}
    </div>
  `;
}

/* ---------- Render: Orders table ---------- */
function renderOrdersTable(orders) {
  return `
    <table class="mn-admin-table">
      <thead>
        <tr>
          <th>Order</th>
          <th>Date</th>
          <th>Customer</th>
          <th>Items</th>
          <th>Total</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${orders.map(o => `
          <tr data-order-id="${escapeHtml(o.id)}">
            <td><span class="mn-admin-mono">#${escapeHtml(o.id.slice(0, 8))}</span></td>
            <td>${fmtDate(o.createdAt)}</td>
            <td>
              <p class="mn-admin-td-name">${escapeHtml(o.customer ? o.customer.name : '—')}</p>
              <p class="mn-admin-td-meta">${escapeHtml(o.customer ? o.customer.email : o.userEmail || '')}</p>
            </td>
            <td>${(o.items || []).length} item${(o.items || []).length === 1 ? '' : 's'}</td>
            <td>${fmtRs(o.total)}</td>
            <td><span class="mn-admin-status" data-status="${escapeHtml(o.status || 'pending')}">${escapeHtml(o.status || 'pending')}</span></td>
            <td><button type="button" class="mn-admin-btn" data-order-view="${escapeHtml(o.id)}">View</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

/* ---------- Render: Orders tab ---------- */
function renderOrdersTab() {
  const filter = state.orderFilter;
  const orders = filter === 'all' ? state.orders : state.orders.filter(o => o.status === filter);

  return `
    <div class="mn-admin-filters">
      ${['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => `
        <button type="button" class="mn-admin-filter${filter === s ? ' is-active' : ''}" data-order-filter="${s}">
          ${s}
          ${s !== 'all' ? `<span class="mn-admin-filter__count">${state.orders.filter(o => o.status === s).length}</span>` : ''}
        </button>
      `).join('')}
    </div>
    ${orders.length === 0
      ? '<p class="mn-small mn-muted" style="padding:40px 0">No orders match this filter.</p>'
      : `<div class="mn-admin-table-wrap">${renderOrdersTable(orders)}</div>`}
  `;
}

/* ---------- Render: Products tab ---------- */
function renderProductsTab() {
  return `
    <div class="mn-admin-table-wrap">
      <table class="mn-admin-table">
        <thead>
          <tr>
            <th></th>
            <th>Name</th>
            <th>Collection</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
          </tr>
        </thead>
        <tbody>
          ${state.products.map(p => `
            <tr>
              <td style="width:60px"><img src="${escapeHtml(p.images ? p.images[0] : '')}" alt="" style="width:40px;height:52px;object-fit:cover;background:var(--mn-hairline)" onerror="this.style.opacity=0.2"></td>
              <td><p class="mn-admin-td-name">${escapeHtml(p.name)}</p></td>
              <td>${escapeHtml(p.collection || '—')}</td>
              <td>${escapeHtml(p.category || '—')}</td>
              <td>${fmtRs(p.price)}</td>
              <td>${p.inStock === false ? '<span class="mn-admin-status" data-status="cancelled">out of stock</span>' : `<span class="mn-admin-status" data-status="delivered">in stock</span>`}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <p class="mn-small mn-muted" style="margin-top:20px">Edit products via the Firebase Console for now. Inline editing comes in the next phase.</p>
  `;
}

/* ---------- Render: Order detail modal ---------- */
function renderOrderDetail(order) {
  const itemsHtml = (order.items || []).map(i => `
    <div class="mn-checkout-item">
      <div class="mn-checkout-item__media"><img src="${escapeHtml(i.image)}" alt="" onerror="this.style.opacity=0.2"></div>
      <div>
        <p class="mn-checkout-item__name">${escapeHtml(i.name)}</p>
        <p class="mn-checkout-item__meta">${escapeHtml(i.size)} · ${escapeHtml(i.color)} · Qty ${i.qty}</p>
      </div>
      <div class="mn-checkout-item__price">${fmtRs(i.price * i.qty)}</div>
    </div>
  `).join('');

  const addr = order.shippingAddress || {};
  const cust = order.customer || {};

  return `
    <div class="mn-admin-modal-inner">
      <header class="mn-admin-modal-header">
        <div>
          <p class="mn-admin-mono">#${escapeHtml(order.id)}</p>
          <p class="mn-admin-modal-date">${fmtDate(order.createdAt)}</p>
        </div>
        <span class="mn-admin-status" data-status="${escapeHtml(order.status)}">${escapeHtml(order.status)}</span>
      </header>

      <div class="mn-admin-modal-body">
        <div class="mn-admin-modal-section">
          <p class="mn-admin-section__label">Status</p>
          <select class="mn-admin-status-select" data-order-status-select="${escapeHtml(order.id)}">
            ${['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => `
              <option value="${s}"${order.status === s ? ' selected' : ''}>${s}</option>
            `).join('')}
          </select>
        </div>

        <div class="mn-admin-modal-section">
          <p class="mn-admin-section__label">Items</p>
          <div class="mn-checkout-items">${itemsHtml}</div>
          <div class="mn-checkout-totals">
            <div class="mn-checkout-totals__row"><span>Subtotal</span><span>${fmtRs(order.subtotal)}</span></div>
            <div class="mn-checkout-totals__row"><span>Shipping</span><span>${order.shipping === 0 ? 'Free' : fmtRs(order.shipping)}</span></div>
            <div class="mn-checkout-totals__row mn-checkout-totals__row--total"><span>Total</span><span>${fmtRs(order.total)}</span></div>
          </div>
        </div>

        <div class="mn-admin-modal-section">
          <p class="mn-admin-section__label">Customer</p>
          <p class="mn-admin-modal-line">${escapeHtml(cust.name || '—')}</p>
          <p class="mn-admin-modal-line">${escapeHtml(cust.email || order.userEmail || '—')}</p>
          <p class="mn-admin-modal-line">${escapeHtml(cust.phone || '—')}</p>
        </div>

        <div class="mn-admin-modal-section">
          <p class="mn-admin-section__label">Ship to</p>
          <p class="mn-admin-modal-line">${escapeHtml(addr.line1 || '')}${addr.line2 ? ', ' + escapeHtml(addr.line2) : ''}</p>
          <p class="mn-admin-modal-line">${escapeHtml(addr.city || '')}${addr.postalCode ? ', ' + escapeHtml(addr.postalCode) : ''}</p>
          <p class="mn-admin-modal-line">${escapeHtml(addr.country || '')}</p>
        </div>

        ${order.notes ? `
          <div class="mn-admin-modal-section">
            <p class="mn-admin-section__label">Notes</p>
            <p class="mn-admin-modal-line">${escapeHtml(order.notes)}</p>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/* ---------- Main render ---------- */
function render() {
  const root = $('[data-admin-root]');
  if (!root) return;

  const content = $('#admin-content');
  if (!content) return;

  // Tab highlighting
  $$('[data-admin-tab]').forEach(el => {
    el.setAttribute('aria-current', el.dataset.adminTab === state.currentTab ? 'page' : 'false');
  });

  // Content
  if (state.currentTab === 'dashboard') content.innerHTML = renderDashboard();
  else if (state.currentTab === 'orders') content.innerHTML = renderOrdersTab();
  else if (state.currentTab === 'products') content.innerHTML = renderProductsTab();

  // Rebind
  bindContentEvents();
}

/* ---------- Content event binding ---------- */
function bindContentEvents() {
  // Order view buttons
  $$('[data-order-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.orderView;
      const order = state.orders.find(o => o.id === id);
      if (!order) return;
      const modal = $('[data-admin-modal]');
      const body = $('[data-admin-modal-body]');
      if (!modal || !body) return;
      body.innerHTML = renderOrderDetail(order);
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('mn-no-scroll');
      bindOrderModalEvents();
    });
  });

  // Filter buttons
  $$('[data-order-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.orderFilter = btn.dataset.orderFilter;
      render();
    });
  });
}

/* ---------- Order modal events ---------- */
function bindOrderModalEvents() {
  const modal = $('[data-admin-modal]');
  if (!modal) return;

  const close = () => {
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('mn-no-scroll');
  };

  modal.querySelectorAll('[data-admin-modal-close]').forEach(el => el.addEventListener('click', close));

  const statusSelect = modal.querySelector('[data-order-status-select]');
  if (statusSelect) {
    statusSelect.addEventListener('change', async () => {
      const orderId = statusSelect.dataset.orderStatusSelect;
      const newStatus = statusSelect.value;
      statusSelect.disabled = true;
      const { error } = await updateOrderStatus(orderId, newStatus);
      statusSelect.disabled = false;
      if (error) {
        alert('Could not update status: ' + error);
        return;
      }
      // Refresh dashboard
      render();
    });
  }
}

/* ---------- Access denied render ---------- */
function renderAccessDenied(message) {
  const root = $('[data-admin-root]');
  if (!root) return;
  root.innerHTML = `
    <div class="mn-empty" style="padding:96px 24px">
      <p class="mn-empty__title">${message || 'Access denied'}</p>
      <p class="mn-empty__text">This area is for MANIESTA LABEL staff only.</p>
      <a class="mn-btn" href="index.html">Back to home</a>
    </div>
  `;
}

function renderLoading() {
  const root = $('[data-admin-root]');
  if (!root) return;
  root.innerHTML = '<div class="mn-loading-block" style="padding:120px 24px"><span class="mn-spinner"></span><p>Loading admin…</p></div>';
}

/* ---------- Boot ---------- */
async function init() {
  renderLoading();

  if (!FEATURES.AUTH || !FEATURES.FIRESTORE) {
    renderAccessDenied('Firebase not configured');
    return;
  }

  // Wait for Firebase to restore auth state (up to 2 seconds)
  let user = null;
  try {
    user = await new Promise((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => { if (!resolved) { resolved = true; resolve(null); } }, 2000);
      Auth.onAuthChange((u) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(u);
        }
      });
    });
  } catch {}

  if (!user) {
    renderAccessDenied('Please sign in');
    return;
  }

  const isAdminUser = await checkAdmin(user);
  if (!isAdminUser) {
    renderAccessDenied('You are signed in, but not as an admin');
    return;
  }

  state.user = user;

  // Load data
  try {
    await Promise.all([loadOrders(), loadProducts()]);
  } catch (err) {
    renderAccessDenied('Could not load data: ' + err.message);
    return;
  }

  // Build UI shell
  const root = $('[data-admin-root]');
  root.innerHTML = `
    <div class="mn-admin">
      <aside class="mn-admin-nav">
        <p class="mn-admin-nav__title">MANIESTA ADMIN</p>
        <nav>
          <a href="#" data-admin-tab="dashboard">Dashboard</a>
          <a href="#" data-admin-tab="orders">Orders</a>
          <a href="#" data-admin-tab="products">Products</a>
        </nav>
        <div class="mn-admin-nav__footer">
          <p class="mn-small mn-muted">${escapeHtml(user.email || '')}</p>
          <button type="button" class="mn-small mn-link" data-admin-signout style="background:none;border:0;cursor:pointer;text-decoration:underline;padding:0;color:var(--mn-stone)">Sign out</button>
        </div>
      </aside>
      <main class="mn-admin-main">
        <div id="admin-content"></div>
      </main>
    </div>
    <div class="mn-admin-modal" aria-hidden="true" data-admin-modal>
      <div class="mn-admin-modal__scrim" data-admin-modal-close></div>
      <div class="mn-admin-modal__panel">
        <button type="button" class="mn-admin-modal__close" data-admin-modal-close aria-label="Close"><i class="fas fa-times"></i></button>
        <div data-admin-modal-body></div>
      </div>
    </div>
  `;

  // Tab switching
  $$('[data-admin-tab]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      state.currentTab = el.dataset.adminTab;
      render();
    });
  });

  // Sign out
  $('[data-admin-signout]').addEventListener('click', async () => {
    await Auth.signOut();
    window.location.href = 'index.html';
  });

  render();
}

init();
