/* ==========================================================================
   MANIESTA LABEL — Firebase configuration
   Public client config. Safe to commit.
   Access is enforced via Firebase Auth + Security Rules, not via secrecy.
   ========================================================================== */

export const firebaseConfig = {
  apiKey: "AIzaSyCGla_kgkmezAR3ANehBtPnJXXSRaD5TSE",
  authDomain: "portfolio-projects-a2689.firebaseapp.com",
  databaseURL: "https://portfolio-projects-a2689-default-rtdb.firebaseio.com",
  projectId: "portfolio-projects-a2689",
  storageBucket: "portfolio-projects-a2689.firebasestorage.app",
  messagingSenderId: "915691364372",
  appId: "1:915691364372:web:151ea76f0b86d642e18701",
  measurementId: "G-6V6LP0J8JQ"
};

/* Feature flags — flip these as you enable services in the console */
export const FEATURES = {
  AUTH:      true,   // toggle true after Auth providers are enabled
  FIRESTORE: true,   // toggle true after Firestore is created
  STORAGE:   false,   // toggle true after Storage is initialized
  ANALYTICS: true     // toggle false if you don't want Analytics
};

/* Collection names — centralised for consistency */
export const COLLECTIONS = {
  PRODUCTS:    'products',
  COLLECTIONS: 'collections',
  CATEGORIES:  'categories',
  ORDERS:      'orders',
  USERS:       'users'
};

/* Cache TTLs (localStorage) — protects Spark quota */
export const CACHE_TTL = {
  PRODUCTS: 1000 * 60 * 60 * 24,  // 24h
  COLLECTIONS: 1000 * 60 * 60 * 24 * 7,  // 7 days
  CATEGORIES: 1000 * 60 * 60 * 24 * 7
};
