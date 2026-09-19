'use strict';

/* ==========================================================================
   MANIESTA LABEL — Admin product management
   List, create, edit, delete, publish, unpublish + Cloudinary image upload
   ========================================================================== */

import { getDb } from './firebase-init.js';
import { FEATURES } from './firebase-config.js';

/* ---- Cloudinary config — set these two lines ---- */
const CLOUDINARY_CLOUD_NAME = 'nzx4pvis';
const CLOUDINARY_UPLOAD_PRESET = 'manieste_unsigned';
/* -------------------------------------------------- */

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const fmtRs = (n) => 'Rs. ' + (Number(n) || 0).toLocaleString('en-PK');

/* ============================================================
   Data layer
   ============================================================ */

const AdminProducts = {
  _list: [],

  async loadAll() {
    if (!FEATURES.FIRESTORE) return [];
    const db = await getDb();
    const { collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const snap = await getDocs(collection(db, 'products'));
    const list = [];
    snap.forEach(doc => list.push(Object.assign({ id: doc.id }, doc.data())));
    list.sort((a, b) => {
      const ta = a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().getTime() : 0;
      const tb = b.createdAt && b.createdAt.toDate ? b.createdAt.toDate().getTime() : 0;
      return tb - ta;
    });
    this._list = list;
    return list;
  },

  getList() { return this._list; },

  async getOne(id) {
    const db = await getDb();
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const snap = await getDoc(doc(db, 'products', id));
    return snap.exists() ? Object.assign({ id: snap.id }, snap.data()) : null;
  },

  async create(id, data) {
    const db = await getDb();
    const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const payload = Object.assign({}, data, {
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await setDoc(doc(db, 'products', id), payload);
    return { id };
  },

  async update(id, data) {
    const db = await getDb();
    const { doc, updateDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const payload = Object.assign({}, data, { updatedAt: serverTimestamp() });
    await updateDoc(doc(db, 'products', id), payload);
    return { id };
  },

  async remove(id) {
    const db = await getDb();
    const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    await deleteDoc(doc(db, 'products', id));
    return { id };
  },

  async setStatus(id, status) {
    return this.update(id, { status: status });
  },

  async slugExists(slug, excludeId) {
    const db = await getDb();
    const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const q = query(collection(db, 'products'), where('slug', '==', slug));
    const snap = await getDocs(q);
    let exists = false;
    snap.forEach(doc => {
      if (doc.id !== excludeId) exists = true;
    });
    return exists;
  },

  slugify(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }
};

/* ============================================================
   Renderers
   ============================================================ */

const SEARCH_STATE = { q: '', status: 'all', page: 1, perPage: 12 };

function filteredList() {
  let list = AdminProducts.getList();
  if (SEARCH_STATE.status !== 'all') {
    list = list.filter(p => (p.status || 'published') === SEARCH_STATE.status);
  }
  if (SEARCH_STATE.q) {
    const q = SEARCH_STATE.q.toLowerCase();
    list = list.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.slug || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.collection || '').toLowerCase().includes(q)
    );
  }
  return list;
}

function renderProductList() {
  const list = filteredList();
  const total = list.length;
  const start = (SEARCH_STATE.page - 1) * SEARCH_STATE.perPage;
  const page = list.slice(start, start + SEARCH_STATE.perPage);
  const pages = Math.max(1, Math.ceil(total / SEARCH_STATE.perPage));

  if (!total) {
    return '<div class="mn-admin-empty"><p>No products match your filters.</p></div>';
  }

  return `
    <div class="mn-admin-products-toolbar">
      <input type="search" class="mn-field" placeholder="Search products…" value="${esc(SEARCH_STATE.q)}" data-p-search>
      <select class="mn-field" data-p-status>
        <option value="all"${SEARCH_STATE.status === 'all' ? ' selected' : ''}>All statuses</option>
        <option value="published"${SEARCH_STATE.status === 'published' ? ' selected' : ''}>Published</option>
        <option value="draft"${SEARCH_STATE.status === 'draft' ? ' selected' : ''}>Draft</option>
        <option value="archived"${SEARCH_STATE.status === 'archived' ? ' selected' : ''}>Archived</option>
      </select>
      <button type="button" class="mn-btn" data-p-new>+ New product</button>
    </div>

    <div class="mn-admin-table-wrap">
      <table class="mn-admin-table">
        <thead>
          <tr>
            <th></th>
            <th>Name</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${page.map(p => `
            <tr>
              <td style="width:60px">
                <img src="${esc((p.images && p.images[0]) || '')}" alt="" style="width:40px;height:52px;object-fit:cover;background:var(--mn-hairline)" onerror="this.style.opacity=0.2">
              </td>
              <td>
                <p class="mn-admin-td-name">${esc(p.name)}</p>
                <p class="mn-admin-td-meta">${esc(p.slug)}</p>
              </td>
              <td>${esc(p.category || '—')}</td>
              <td>${fmtRs(p.price)}${p.salePrice ? ' <span style="color:var(--mn-clay)">→ ' + fmtRs(p.salePrice) + '</span>' : ''}</td>
              <td>${p.stock != null ? p.stock : (p.inStock === false ? 0 : '—')}</td>
              <td><span class="mn-admin-status" data-status="${esc(p.status || 'published')}">${esc(p.status || 'published')}</span></td>
              <td style="white-space:nowrap">
                <button type="button" class="mn-admin-btn" data-p-edit="${esc(p.id)}">Edit</button>
                ${(p.status === 'published' || !p.status)
                  ? '<button type="button" class="mn-admin-btn" data-p-unpublish="' + esc(p.id) + '">Unpublish</button>'
                  : '<button type="button" class="mn-admin-btn" data-p-publish="' + esc(p.id) + '">Publish</button>'}
                <button type="button" class="mn-admin-btn mn-admin-btn--danger" data-p-delete="${esc(p.id)}">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    ${pages > 1 ? `
      <div class="mn-admin-pagination">
        <button type="button" class="mn-admin-btn" data-p-page="prev"${SEARCH_STATE.page <= 1 ? ' disabled' : ''}>← Prev</button>
        <span>Page ${SEARCH_STATE.page} of ${pages}</span>
        <button type="button" class="mn-admin-btn" data-p-page="next"${SEARCH_STATE.page >= pages ? ' disabled' : ''}>Next →</button>
      </div>
    ` : ''}

    <p class="mn-small mn-muted" style="margin-top:16px">${total} product${total === 1 ? '' : 's'}</p>
  `;
}

function renderProductForm(product) {
  const isNew = !product || !product.id;
  const p = product || {
    id: '',
    name: '',
    slug: '',
    description: '',
    shortDesc: '',
    price: '',
    salePrice: '',
    category: 'T-Shirts',
    collection: 'Signature',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [{ name: 'Ink', hex: '#0E0E0E' }],
    images: [],
    stock: 0,
    featured: false,
    bestseller: false,
    newArrival: false,
    status: 'draft'
  };

  const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const categoryOptions = ['T-Shirts', 'Shirts', 'Hoodies', 'Sets'];
  const collectionOptions = ['Signature', 'Atelier', 'Studio', 'Essentials', 'Everyday'];

  return `
    <div class="mn-admin-form">
      <header class="mn-admin-form__head">
        <button type="button" class="mn-admin-btn" data-p-back>← Back</button>
        <h2 class="mn-admin-form__title">${isNew ? 'New product' : 'Edit product'}</h2>
        <div class="mn-admin-form__actions">
          <button type="button" class="mn-admin-btn" data-p-save-draft>Save as draft</button>
          <button type="button" class="mn-btn" data-p-save-publish>${isNew ? 'Create & publish' : 'Save & publish'}</button>
        </div>
      </header>

      <div class="mn-admin-form__body">
        <div class="mn-admin-form__col">

          <div class="mn-admin-form__group">
            <label>Name *</label>
            <input type="text" class="mn-field" data-f-name value="${esc(p.name)}" placeholder="e.g. Signature Drop Shoulder">
          </div>

          <div class="mn-admin-form__group">
            <label>Slug *</label>
            <input type="text" class="mn-field" data-f-slug value="${esc(p.slug)}" placeholder="signature-drop-shoulder">
            <p class="mn-small mn-muted">Auto-generated from name. Must be unique.</p>
          </div>

          <div class="mn-admin-form__group">
            <label>Short description</label>
            <input type="text" class="mn-field" data-f-short-desc value="${esc(p.shortDesc || '')}" placeholder="One-line summary for cards">
          </div>

          <div class="mn-admin-form__group">
            <label>Full description</label>
            <textarea class="mn-field" data-f-description rows="5" placeholder="Detailed product description">${esc(p.description || '')}</textarea>
          </div>

          <div class="mn-admin-form__row">
            <div class="mn-admin-form__group">
              <label>Price (Rs.) *</label>
              <input type="number" class="mn-field" data-f-price value="${p.price || ''}" min="0">
            </div>
            <div class="mn-admin-form__group">
              <label>Compare-at price (Rs.)</label>
              <input type="number" class="mn-field" data-f-sale-price value="${p.salePrice || ''}" min="0" placeholder="Optional">
            </div>
          </div>

          <div class="mn-admin-form__row">
            <div class="mn-admin-form__group">
              <label>Category *</label>
              <select class="mn-field" data-f-category>
                ${categoryOptions.map(c => '<option value="' + c + '"' + (p.category === c ? ' selected' : '') + '>' + c + '</option>').join('')}
              </select>
            </div>
            <div class="mn-admin-form__group">
              <label>Collection *</label>
              <select class="mn-field" data-f-collection>
                ${collectionOptions.map(c => '<option value="' + c + '"' + (p.collection === c ? ' selected' : '') + '>' + c + '</option>').join('')}
              </select>
            </div>
          </div>

          <div class="mn-admin-form__group">
            <label>Stock *</label>
            <input type="number" class="mn-field" data-f-stock value="${p.stock || 0}" min="0">
          </div>

          <div class="mn-admin-form__group">
            <label>Sizes</label>
            <div class="mn-admin-form__checks">
              ${sizeOptions.map(s => `
                <label class="mn-admin-check">
                  <input type="checkbox" data-f-size="${s}"${(p.sizes || []).indexOf(s) !== -1 ? ' checked' : ''}>
                  <span>${s}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div class="mn-admin-form__group">
            <label>Colors</label>
            <div data-colors-list>
              ${(p.colors || []).map((c, i) => renderColorRow(c, i)).join('')}
            </div>
            <button type="button" class="mn-admin-btn" data-add-color style="margin-top:8px">+ Add color</button>
          </div>

          <div class="mn-admin-form__group">
            <label>Flags</label>
            <div class="mn-admin-form__checks">
              <label class="mn-admin-check"><input type="checkbox" data-f-featured${p.featured ? ' checked' : ''}> <span>Featured</span></label>
              <label class="mn-admin-check"><input type="checkbox" data-f-bestseller${p.bestseller ? ' checked' : ''}> <span>Best seller</span></label>
              <label class="mn-admin-check"><input type="checkbox" data-f-new-arrival${p.newArrival ? ' checked' : ''}> <span>New arrival</span></label>
            </div>
          </div>

        </div>

        <div class="mn-admin-form__col">

          <div class="mn-admin-form__group">
            <label>Images</label>
            <div class="mn-admin-uploads" data-images-list>
              ${(p.images || []).map((url, i) => renderImageThumb(url, i)).join('')}
            </div>
            <button type="button" class="mn-admin-upload-btn" data-cloudinary-upload>
              <span>+ Upload images</span>
            </button>
            <p class="mn-small mn-muted">Uploaded to Cloudinary. Multiple images supported. First image is the thumbnail.</p>
            <div class="mn-admin-url-row" style="margin-top:12px">
              <input type="url" class="mn-field" placeholder="Or paste an image URL" data-image-url-input>
              <button type="button" class="mn-admin-btn" data-add-image-url>Add</button>
            </div>
          </div>

          <div class="mn-admin-form__group">
            <label>Status</label>
            <select class="mn-field" data-f-status>
              <option value="draft"${p.status === 'draft' ? ' selected' : ''}>Draft — not visible publicly</option>
              <option value="published"${p.status === 'published' || !p.status ? ' selected' : ''}>Published — visible publicly</option>
              <option value="archived"${p.status === 'archived' ? ' selected' : ''}>Archived — hidden from listings</option>
            </select>
          </div>

          ${p.id ? `
            <div class="mn-admin-form__meta">
              <p class="mn-small mn-muted">ID: <code>${esc(p.id)}</code></p>
            </div>
          ` : ''}

        </div>
      </div>
    </div>
  `;
}

function renderColorRow(c, i) {
  return `
    <div class="mn-admin-color-row" data-color-row>
      <input type="text" class="mn-field" placeholder="Name" value="${esc(c.name || '')}" data-color-name>
      <input type="text" class="mn-field" placeholder="#000000" value="${esc(c.hex || '')}" data-color-hex>
      <button type="button" class="mn-admin-btn mn-admin-btn--danger" data-remove-color aria-label="Remove">×</button>
    </div>
  `;
}

function renderImageThumb(url, i) {
  return `
    <div class="mn-admin-image" data-image>
      <img src="${esc(url)}" alt="" onerror="this.style.opacity=0.2">
      <button type="button" class="mn-admin-image__remove" data-remove-image="${i}" aria-label="Remove">×</button>
    </div>
  `;
}

/* ============================================================
   Controller
   ============================================================ */

const AdminProductsUI = {
  _draft: null,
  _uploadedImages: [],

  async renderList(container) {
    container.innerHTML = '<div class="mn-loading-block"><span class="mn-spinner"></span></div>';
    try {
      await AdminProducts.loadAll();
      container.innerHTML = renderProductList();
      this._bindList(container);
    } catch (err) {
      container.innerHTML = '<div class="mn-error mn-error--plain"><p class="mn-error__title">Could not load products</p><p class="mn-error__text">' + esc(err.message) + '</p></div>';
    }
  },

  renderForm(container, product) {
    container.innerHTML = renderProductForm(product);
    this._draft = product ? Object.assign({}, product) : null;
    this._uploadedImages = product && product.images ? product.images.slice() : [];
    this._bindForm(container);
    this._syncImageThumbs(container);
  },

  _bindList(container) {
    const search = container.querySelector('[data-p-search]');
    if (search) {
      let timer;
      search.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          SEARCH_STATE.q = search.value;
          SEARCH_STATE.page = 1;
          container.innerHTML = renderProductList();
          this._bindList(container);
        }, 200);
      });
    }

    const statusSel = container.querySelector('[data-p-status]');
    if (statusSel) statusSel.addEventListener('change', () => {
      SEARCH_STATE.status = statusSel.value;
      SEARCH_STATE.page = 1;
      container.innerHTML = renderProductList();
      this._bindList(container);
    });

    container.querySelectorAll('[data-p-page]').forEach(b => b.addEventListener('click', () => {
      if (b.disabled) return;
      SEARCH_STATE.page += b.dataset.pPage === 'next' ? 1 : -1;
      container.innerHTML = renderProductList();
      this._bindList(container);
    }));

    const newBtn = container.querySelector('[data-p-new]');
    if (newBtn) newBtn.addEventListener('click', () => this._openNewForm(container));

    container.querySelectorAll('[data-p-edit]').forEach(b => b.addEventListener('click', async () => {
      const id = b.dataset.pEdit;
      const product = await AdminProducts.getOne(id);
      if (product) this.renderForm(container, product);
    }));

    container.querySelectorAll('[data-p-publish]').forEach(b => b.addEventListener('click', async () => {
      b.disabled = true;
      await AdminProducts.setStatus(b.dataset.pPublish, 'published');
      this.renderList(container);
    }));

    container.querySelectorAll('[data-p-unpublish]').forEach(b => b.addEventListener('click', async () => {
      b.disabled = true;
      await AdminProducts.setStatus(b.dataset.pUnpublish, 'draft');
      this.renderList(container);
    }));

    container.querySelectorAll('[data-p-delete]').forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.pDelete;
      this._confirmDelete(id, container);
    }));
  },

  _confirmDelete(id, container) {
    const modal = document.querySelector('[data-admin-modal]');
    const body = document.querySelector('[data-admin-modal-body]');
    if (!modal || !body) return;
    body.innerHTML = `
      <div class="mn-admin-modal-inner" style="padding:32px">
        <h3 style="margin:0 0 12px">Delete this product?</h3>
        <p class="mn-small mn-muted">This will remove the product. Cannot be undone.</p>
        <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:24px">
          <button type="button" class="mn-admin-btn" data-admin-modal-close>Cancel</button>
          <button type="button" class="mn-btn" data-confirm-delete style="background:var(--mn-error);border-color:var(--mn-error)">Delete</button>
        </div>
      </div>
    `;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('mn-no-scroll');

    modal.querySelectorAll('[data-admin-modal-close]').forEach(el => el.addEventListener('click', () => {
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('mn-no-scroll');
    }));

    const btn = body.querySelector('[data-confirm-delete]');
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      btn.textContent = 'Deleting…';
      try {
        await AdminProducts.remove(id);
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('mn-no-scroll');
        this.renderList(container);
      } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Delete';
        alert('Delete failed: ' + err.message);
      }
    });
  },

  _bindForm(container) {
    const back = container.querySelector('[data-p-back]');
    if (back) back.addEventListener('click', () => this.renderList(container));

    // Auto-slug from name
    const nameInput = container.querySelector('[data-f-name]');
    const slugInput = container.querySelector('[data-f-slug]');
    let slugTouched = !!(this._draft && this._draft.slug);
    if (slugInput) slugInput.addEventListener('input', () => { slugTouched = true; });
    if (nameInput && slugInput) nameInput.addEventListener('input', () => {
      if (!slugTouched) slugInput.value = AdminProducts.slugify(nameInput.value);
    });

    // Add color
    const addColor = container.querySelector('[data-add-color]');
    if (addColor) addColor.addEventListener('click', () => {
      const list = container.querySelector('[data-colors-list]');
      const row = document.createElement('div');
      row.innerHTML = renderColorRow({ name: '', hex: '#000000' }, 0);
      list.appendChild(row.firstElementChild);
    });

    // Remove color
    container.addEventListener('click', (e) => {
      const rm = e.target.closest('[data-remove-color]');
      if (rm) rm.closest('[data-color-row]').remove();
    });

    // URL paste
    const urlInput = container.querySelector('[data-image-url-input]');
    const addBtn = container.querySelector('[data-add-image-url]');
    const addImage = () => {
      const url = (urlInput.value || '').trim();
      if (!url) return;
      if (!/^https?:\/\//i.test(url)) { alert('Please paste a full URL starting with http:// or https://'); return; }
      this._uploadedImages.push(url);
      this._syncImageThumbs(container);
      urlInput.value = '';
    };
    if (addBtn) addBtn.addEventListener('click', addImage);
    if (urlInput) urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addImage(); }
    });

    // Cloudinary upload
    const cloudBtn = container.querySelector('[data-cloudinary-upload]');
    if (cloudBtn) cloudBtn.addEventListener('click', () => this._openCloudinary(container));

    // Remove image
    container.addEventListener('click', (e) => {
      const rm = e.target.closest('[data-remove-image]');
      if (rm) {
        const idx = parseInt(rm.dataset.removeImage, 10);
        this._uploadedImages.splice(idx, 1);
        this._syncImageThumbs(container);
      }
    });

    // Save buttons
    const draftBtn = container.querySelector('[data-p-save-draft]');
    const pubBtn = container.querySelector('[data-p-save-publish]');
    if (draftBtn) draftBtn.addEventListener('click', () => this._save(container, 'draft'));
    if (pubBtn) pubBtn.addEventListener('click', () => this._save(container, 'published'));
  },

  _syncImageThumbs(container) {
    const list = container.querySelector('[data-images-list]');
    if (!list) return;
    list.innerHTML = this._uploadedImages.map((url, i) => renderImageThumb(url, i)).join('');
  },

  _openCloudinary(container) {
    if (CLOUDINARY_CLOUD_NAME === 'nzx4pvis') {
      alert('Cloudinary is not configured. Open assets/js/firebase/admin-products.js and set CLOUDINARY_CLOUD_NAME to your Cloudinary cloud name.');
      return;
    }

    const self = this;

    const openWidget = () => {
      const widget = window.cloudinary.createUploadWidget({
        cloudName: CLOUDINARY_CLOUD_NAME,
        uploadPreset: CLOUDINARY_UPLOAD_PRESET,
        folder: 'manieste/products',
        sources: ['local', 'url', 'camera'],
        multiple: true,
        maxFiles: 8,
        clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
        maxFileSize: 10000000,
        cropping: false,
        showAdvancedOptions: false
      }, (error, result) => {
        if (error) {
          console.error('[Cloudinary]', error);
          return;
        }
        if (result.event === 'success') {
          self._uploadedImages.push(result.info.secure_url);
          self._syncImageThumbs(container);
        }
      });
      widget.open();
    };

    if (window.cloudinary && window.cloudinary.createUploadWidget) {
      openWidget();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://upload-widget.cloudinary.com/global/all.js';
    script.onload = openWidget;
    script.onerror = () => alert('Could not load Cloudinary upload widget. Check your internet connection.');
    document.head.appendChild(script);
  },

  _openNewForm(container) {
    this.renderForm(container, null);
  },

  _collect(container) {
    const sizes = [];
    container.querySelectorAll('[data-f-size]:checked').forEach(cb => sizes.push(cb.dataset.fSize));

    const colors = [];
    container.querySelectorAll('[data-color-row]').forEach(row => {
      const name = row.querySelector('[data-color-name]').value.trim();
      const hex = row.querySelector('[data-color-hex]').value.trim();
      if (name && hex) colors.push({ name: name, hex: hex });
    });

    return {
      name: container.querySelector('[data-f-name]').value.trim(),
      slug: container.querySelector('[data-f-slug]').value.trim(),
      shortDesc: container.querySelector('[data-f-short-desc]').value.trim(),
      description: container.querySelector('[data-f-description]').value.trim(),
      price: Number(container.querySelector('[data-f-price]').value) || 0,
      salePrice: container.querySelector('[data-f-sale-price]').value ? Number(container.querySelector('[data-f-sale-price]').value) : null,
      category: container.querySelector('[data-f-category]').value,
      collection: container.querySelector('[data-f-collection]').value,
      stock: Number(container.querySelector('[data-f-stock]').value) || 0,
      inStock: (Number(container.querySelector('[data-f-stock]').value) || 0) > 0,
      sizes: sizes,
      colors: colors,
      images: this._uploadedImages.slice(),
      featured: container.querySelector('[data-f-featured]').checked,
      bestseller: container.querySelector('[data-f-bestseller]').checked,
      newArrival: container.querySelector('[data-f-new-arrival]').checked,
      status: container.querySelector('[data-f-status]').value,
      rating: (this._draft && this._draft.rating) || 0,
      reviews: (this._draft && this._draft.reviews) || 0,
      badge: (this._draft && this._draft.badge) || null,
      specs: (this._draft && this._draft.specs) || []
    };
  },

  async _save(container, targetStatus) {
    const data = this._collect(container);
    if (targetStatus === 'published') data.status = 'published';

    // Validation
    if (!data.name) { alert('Product name is required.'); return; }
    if (!data.slug) { alert('Slug is required.'); return; }
    if (data.price <= 0) { alert('Price must be greater than 0.'); return; }
    if (!data.images.length) { alert('At least one product image is required.'); return; }
    if (!data.sizes.length) { alert('Select at least one size.'); return; }

    const excludeId = this._draft && this._draft.id;
    if (await AdminProducts.slugExists(data.slug, excludeId)) {
      alert('That slug is already used by another product. Please choose a different one.');
      return;
    }

    const buttons = container.querySelectorAll('.mn-admin-form__actions button');
    buttons.forEach(b => b.disabled = true);

    try {
      const id = (this._draft && this._draft.id) || data.slug;
      if (this._draft && this._draft.id) {
        await AdminProducts.update(id, data);
      } else {
        await AdminProducts.create(id, data);
      }
      this._draft = Object.assign({}, data, { id: id });
      await this.renderList(container);
    } catch (err) {
      buttons.forEach(b => b.disabled = false);
      alert('Save failed: ' + err.message);
    }
  },

  refresh() {
    return AdminProducts.loadAll();
  }
};

window.MN_AdminProducts = AdminProducts;
window.MN_AdminProductsUI = AdminProductsUI;
