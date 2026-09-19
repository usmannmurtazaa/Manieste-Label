'use strict';

/* ==========================================================================
   MANIESTA LABEL — Admin users table
   Read-only view. Search, filter by role, sort by created / last login.
   ========================================================================== */

import { getDb } from './firebase-init.js';
import { FEATURES } from './firebase-config.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

function fmtDate(ts) {
  if (!ts) return '—';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return '—'; }
}

function fmtDateTime(ts) {
  if (!ts) return '—';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('en-PK', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

function relativeTime(ts) {
  if (!ts) return '—';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Date.now() - d.getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return min + 'm ago';
    const hr = Math.floor(min / 60);
    if (hr < 24) return hr + 'h ago';
    const day = Math.floor(hr / 24);
    if (day < 30) return day + 'd ago';
    return fmtDate(ts);
  } catch { return '—'; }
}

function isRecentlyActive(userDoc) {
  if (!userDoc.lastSeenAt) return false;
  try {
    const d = userDoc.lastSeenAt.toDate ? userDoc.lastSeenAt.toDate() : new Date(userDoc.lastSeenAt);
    return (Date.now() - d.getTime()) < 5 * 60 * 1000; // within 5 min
  } catch { return false; }
}

const SEARCH_STATE = { q: '', role: 'all', page: 1, perPage: 20 };

const AdminUsers = {
  _list: [],
  _loading: false,

  async loadAll() {
    if (!FEATURES.FIRESTORE) return [];
    this._loading = true;
    const db = await getDb();
    const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const snap = await getDocs(collection(db, 'users'));
    const list = [];
    snap.forEach(doc => list.push(Object.assign({ uid: doc.id }, doc.data())));
    // Sort by lastLoginAt desc, then createdAt desc
    list.sort((a, b) => {
      const ta = a.lastLoginAt && a.lastLoginAt.toDate ? a.lastLoginAt.toDate().getTime() : (a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().getTime() : 0);
      const tb = b.lastLoginAt && b.lastLoginAt.toDate ? b.lastLoginAt.toDate().getTime() : (b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().getTime() : 0);
      return tb - ta;
    });
    this._list = list;
    this._loading = false;
    return list;
  },

  getList() { return this._list; },

  counts() {
    const list = this._list;
    const now = Date.now();
    let active5m = 0, active24h = 0, admins = 0;
    list.forEach(u => {
      if (u.role === 'admin') admins++;
      if (u.lastSeenAt) {
        const d = u.lastSeenAt.toDate ? u.lastSeenAt.toDate() : new Date(u.lastSeenAt);
        const age = now - d.getTime();
        if (age < 5 * 60 * 1000) active5m++;
        if (age < 24 * 60 * 60 * 1000) active24h++;
      }
    });
    return { total: list.length, active5m, active24h, admins };
  }
};

function filtered() {
  let list = AdminUsers.getList();
  if (SEARCH_STATE.role !== 'all') {
    list = list.filter(u => (u.role || 'customer') === SEARCH_STATE.role);
  }
  if (SEARCH_STATE.q) {
    const q = SEARCH_STATE.q.toLowerCase();
    list = list.filter(u =>
      (u.displayName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.uid || '').toLowerCase().includes(q)
    );
  }
  return list;
}

function renderUserTable() {
  const list = filtered();
  const total = list.length;
  const start = (SEARCH_STATE.page - 1) * SEARCH_STATE.perPage;
  const page = list.slice(start, start + SEARCH_STATE.perPage);
  const pages = Math.max(1, Math.ceil(total / SEARCH_STATE.perPage));
  const stats = AdminUsers.counts();

  return `
    <div class="mn-admin-stats">
      <div class="mn-admin-stat">
        <p class="mn-admin-stat__label">Total registered</p>
        <p class="mn-admin-stat__value">${stats.total}</p>
      </div>
      <div class="mn-admin-stat">
        <p class="mn-admin-stat__label">Active last 5 min</p>
        <p class="mn-admin-stat__value">${stats.active5m}</p>
      </div>
      <div class="mn-admin-stat">
        <p class="mn-admin-stat__label">Active last 24h</p>
        <p class="mn-admin-stat__value">${stats.active24h}</p>
      </div>
      <div class="mn-admin-stat">
        <p class="mn-admin-stat__label">Admins</p>
        <p class="mn-admin-stat__value">${stats.admins}</p>
      </div>
    </div>

    <div class="mn-admin-products-toolbar">
      <input type="search" class="mn-field" placeholder="Search by name, email, or UID…" value="${esc(SEARCH_STATE.q)}" data-u-search>
      <select class="mn-field" data-u-role>
        <option value="all"${SEARCH_STATE.role === 'all' ? ' selected' : ''}>All roles</option>
        <option value="customer"${SEARCH_STATE.role === 'customer' ? ' selected' : ''}>Customers</option>
        <option value="admin"${SEARCH_STATE.role === 'admin' ? ' selected' : ''}>Admins</option>
      </select>
      <span></span>
    </div>

    ${total === 0
      ? '<div class="mn-admin-empty"><p>No users match your filters.</p></div>'
      : `<div class="mn-admin-table-wrap">
          <table class="mn-admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>User ID</th>
                <th>Role</th>
                <th>Created</th>
                <th>Last login</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              ${page.map(u => {
                const active = isRecentlyActive(u);
                return `
                  <tr>
                    <td>
                      <p class="mn-admin-td-name">${esc(u.displayName || u.email || '(no name)')}</p>
                    </td>
                    <td>${esc(u.email || '—')}</td>
                    <td><span class="mn-admin-mono">${esc((u.uid || '').slice(0, 12))}…</span></td>
                    <td><span class="mn-admin-status" data-status="${u.role === 'admin' ? 'confirmed' : 'delivered'}">${esc(u.role || 'customer')}</span></td>
                    <td>${fmtDate(u.createdAt)}</td>
                    <td>${relativeTime(u.lastLoginAt)}</td>
                    <td>${active ? '<span style="color:var(--mn-signal)">● ' + relativeTime(u.lastSeenAt) + '</span>' : relativeTime(u.lastSeenAt)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        ${pages > 1 ? `
          <div class="mn-admin-pagination">
            <button type="button" class="mn-admin-btn" data-u-page="prev"${SEARCH_STATE.page <= 1 ? ' disabled' : ''}>← Prev</button>
            <span>Page ${SEARCH_STATE.page} of ${pages}</span>
            <button type="button" class="mn-admin-btn" data-u-page="next"${SEARCH_STATE.page >= pages ? ' disabled' : ''}>Next →</button>
          </div>
        ` : ''}

        <p class="mn-small mn-muted" style="margin-top:16px">${total} user${total === 1 ? '' : 's'}</p>`}
  `;
}

const AdminUsersUI = {
  async render(container) {
    container.innerHTML = '<div class="mn-loading-block"><span class="mn-spinner"></span></div>';
    try {
      await AdminUsers.loadAll();
      container.innerHTML = renderUserTable();
      this._bind(container);
    } catch (err) {
      container.innerHTML = '<div class="mn-error mn-error--plain"><p class="mn-error__title">Could not load users</p><p class="mn-error__text">' + esc(err.message) + '</p></div>';
    }
  },

  _bind(container) {
    const search = container.querySelector('[data-u-search]');
    if (search) {
      let t;
      search.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          SEARCH_STATE.q = search.value;
          SEARCH_STATE.page = 1;
          container.innerHTML = renderUserTable();
          this._bind(container);
        }, 200);
      });
    }

    const roleSel = container.querySelector('[data-u-role]');
    if (roleSel) roleSel.addEventListener('change', () => {
      SEARCH_STATE.role = roleSel.value;
      SEARCH_STATE.page = 1;
      container.innerHTML = renderUserTable();
      this._bind(container);
    });

    container.querySelectorAll('[data-u-page]').forEach(b => b.addEventListener('click', () => {
      if (b.disabled) return;
      SEARCH_STATE.page += b.dataset.uPage === 'next' ? 1 : -1;
      container.innerHTML = renderUserTable();
      this._bind(container);
    }));
  }
};

window.MN_AdminUsers = AdminUsers;
window.MN_AdminUsersUI = AdminUsersUI;
