/* ==========================================================================
   MANIESTA LABEL — Firebase configuration
   Public client config. Safe to commit.
   Access is enforced via Firebase Auth + Security Rules.
   ========================================================================== */

export const firebaseConfig = {
  apiKey: "AIzaSyBSg2fFOFi7zpIDvEoRTB0cB-ewiqd0o9Y",
  authDomain: "maniesta-label.firebaseapp.com",
  projectId: "maniesta-label",
  storageBucket: "maniesta-label.firebasestorage.app",
  messagingSenderId: "436464769592",
  appId: "1:436464769592:web:aa25fc40efb39944f5e4cd",
  measurementId: "G-8RT3H8PV77"
};

export const FEATURES = {
  AUTH:      true,
  FIRESTORE: true,
  STORAGE:   false,
  ANALYTICS: true
};

export const COLLECTIONS = {
  PRODUCTS:    'products',
  COLLECTIONS: 'collections',
  CATEGORIES:  'categories',
  ORDERS:      'orders',
  USERS:       'users'
};

export const CACHE_TTL = {
  PRODUCTS:    1000 * 60 * 60 * 24,
  COLLECTIONS: 1000 * 60 * 60 * 24 * 7,
  CATEGORIES:  1000 * 60 * 60 * 24 * 7
};
