/* ==========================================================================
   MANIESTA LABEL — Firebase lazy initializer
   Loads SDK modules only when needed. Zero cost to guest browsing.
   ========================================================================== */

import { firebaseConfig, FEATURES } from './firebase-config.js';

/* --- Lazy singletons --- */
let _app        = null;
let _auth       = null;
let _db         = null;
let _storage    = null;
let _analytics  = null;

/* --- App init (once) --- */
export async function getApp() {
  if (_app) return _app;
  if (!FEATURES.AUTH && !FEATURES.FIRESTORE && !FEATURES.STORAGE && !FEATURES.ANALYTICS) {
    return null;
  }
  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
  _app = initializeApp(firebaseConfig);
  return _app;
}

/* --- Auth --- */
export async function getAuth() {
  if (!FEATURES.AUTH) return null;
  if (_auth) return _auth;
  const app = await getApp();
  const { getAuth: _getAuth } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
  _auth = _getAuth(app);
  return _auth;
}

/* --- Firestore --- */
export async function getDb() {
  if (!FEATURES.FIRESTORE) return null;
  if (_db) return _db;
  const app = await getApp();
  const { getFirestore: _getFirestore } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
  _db = _getFirestore(app);
  return _db;
}

/* --- Storage --- */
export async function getStorage() {
  if (!FEATURES.STORAGE) return null;
  if (_storage) return _storage;
  const app = await getApp();
  const { getStorage: _getStorage } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js');
  _storage = _getStorage(app);
  return _storage;
}

/* --- Analytics (optional) --- */
export async function getAnalytics() {
  if (!FEATURES.ANALYTICS) return null;
  if (_analytics) return _analytics;
  try {
    const app = await getApp();
    const { getAnalytics: _getAnalytics, isSupported } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js');
    const supported = await isSupported();
    if (!supported) return null;
    _analytics = _getAnalytics(app);
    return _analytics;
  } catch {
    return null;
  }
}

/* --- Global flag for the rest of the app --- */
window.MN_FIREBASE_READY = Object.values(FEATURES).some(Boolean);
window.MN_FEATURES = FEATURES;
