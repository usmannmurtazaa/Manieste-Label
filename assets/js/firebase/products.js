'use strict';

/* ==========================================================================
   MANIESTA LABEL — Products bridge
   Priority: localStorage cache → Firestore → products.json
   Exposes window.MN_Products
   ========================================================================== */

import { getDb } from './firebase-init.js';
import { COLLECTIONS, CACHE_TTL, FEATURES } from './firebase-config.js';

const CACHE_KEY = 'manieste.products.cache.v1';

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !obj.timestamp || !obj.products) return null;
    if (Date.now() - obj.timestamp > CACHE_TTL.PRODUCTS) return null;
    return obj.products;
  } catch { return null; }
}

function writeCache(products) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), products }));
  } catch {}
}

function clearCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
}

async function fetchFromFirestore() {
  if (!FEATURES.FIRESTORE) return null;
  try {
    const db = await getDb();
    if (!db) return null;
    const { collection, getDocs, query, orderBy } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const q = query(collection(db, COLLECTIONS.PRODUCTS), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const products = [];
    snap.forEach(doc => products.push({ id: doc.id, ...doc.data() }));
    return products;
  } catch (err) {
    console.warn('[MANIESTA] Firestore products fetch failed:', err.message);
    return null;
  }
}

async function fetchFromJSON() {
  try {
    const res = await fetch('assets/data/products.json');
    if (!res.ok) return null;
    const data = await res.json();
    return { products: data.products || [], currency: data.currency || 'Rs. ' };
  } catch { return null; }
}

const MN_Products = {
  _products: null,
  _currency: 'Rs. ',
  _source: null,

  async getAll() {
    if (this._products) return { products: this._products, currency: this._currency, source: this._source };

    const cached = readCache();
    if (cached && cached.length) {
      this._products = cached;
      this._source = 'cache';
      return { products: cached, currency: this._currency, source: 'cache' };
    }

    const fsProducts = await fetchFromFirestore();
    if (fsProducts && fsProducts.length) {
      this._products = fsProducts;
      this._source = 'firestore';
      writeCache(fsProducts);
      return { products: fsProducts, currency: this._currency, source: 'firestore' };
    }

    const json = await fetchFromJSON();
    if (json && json.products.length) {
      this._products = json.products;
      this._currency = json.currency;
      this._source = 'json';
      writeCache(json.products);
      return { products: json.products, currency: json.currency, source: 'json' };
    }

    this._source = 'none';
    return { products: [], currency: this._currency, source: 'none' };
  },

  async getBySlug(slug) {
    const { products } = await this.getAll();
    return products.find(p => p.slug === slug) || null;
  },

  async getById(id) {
    const { products } = await this.getAll();
    return products.find(p => p.id === id) || null;
  },

  refreshCache() {
    clearCache();
    this._products = null;
    this._source = null;
  },

  getSource() { return this._source; }
};

window.MN_Products = MN_Products;
