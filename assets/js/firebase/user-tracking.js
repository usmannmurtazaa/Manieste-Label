'use strict';

/* ==========================================================================
   MANIESTA LABEL — User tracking (self-contained)
   Listens for auth changes itself. No dependency on auth-ui.js.
   ========================================================================== */

import { getDb } from './firebase-init.js';
import { Auth } from './auth.js';
import { FEATURES } from './firebase-config.js';

const LOGIN_KEY    = 'manieste.lastLoginTracked';
const SEEN_KEY     = 'manieste.lastSeenAt';
const SEEN_MIN     = 5 * 60 * 1000;  // throttle lastSeenAt writes to every 5 min

let currentUid = null;
let heartbeatId = null;

async function trackLogin(user) {
  if (!user || !FEATURES.FIRESTORE) return;
  try {
    if (sessionStorage.getItem(LOGIN_KEY) === user.uid) return;
  } catch {}

  try {
    const db = await getDb();
    if (!db) return;
    const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    // Firestore rejects undefined — build payload carefully
    const payload = {
      lastLoginAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    if (user.email)       payload.email = user.email;
    if (user.displayName) payload.displayName = user.displayName;
    if (user.photoURL)    payload.photoURL = user.photoURL;

    await setDoc(doc(db, 'users', user.uid), payload, { merge: true });
    try { sessionStorage.setItem(LOGIN_KEY, user.uid); } catch {}
    console.log('[UserTracking] login tracked');
  } catch (err) {
    console.warn('[UserTracking] login write failed:', err.message);
  }
}

async function touchSeen(force) {
  if (!currentUid) return;
  if (document.visibilityState !== 'visible') return;

  try {
    const last = Number(localStorage.getItem(SEEN_KEY)) || 0;
    if (!force && Date.now() - last < SEEN_MIN) return;
  } catch {}

  try {
    const db = await getDb();
    if (!db) return;
    const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    await setDoc(doc(db, 'users', currentUid), {
      lastSeenAt: serverTimestamp()
    }, { merge: true });
    try { localStorage.setItem(SEEN_KEY, String(Date.now())); } catch {}
  } catch (err) {
    // Silent
  }
}

function startHeartbeat() {
  if (heartbeatId) return;
  heartbeatId = setInterval(() => touchSeen(false), 60 * 1000);
  touchSeen(true);
}

function stopHeartbeat() {
  if (heartbeatId) { clearInterval(heartbeatId); heartbeatId = null; }
}

async function init() {
  if (!FEATURES.FIRESTORE) return;

  // React to auth state
  Auth.onAuthChange(async (user) => {
    if (user) {
      currentUid = user.uid;
      await trackLogin(user);
      startHeartbeat();
    } else {
      currentUid = null;
      stopHeartbeat();
    }
  });

  // Pause/resume heartbeat on visibility
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') touchSeen(true);
  });
}

document.addEventListener('DOMContentLoaded', init);

window.MN_UserTracking = { trackLogin, touchSeen };
