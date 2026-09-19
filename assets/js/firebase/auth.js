/* ==========================================================================
   MANIESTA LABEL — Firebase Auth module
   Wraps modular SDK v10 auth operations with clean error messages
   ========================================================================== */

import { getAuth as initAuth } from './firebase-init.js';

/* --- Friendly error mapping --- */
const ERROR_MAP = {
  'auth/email-already-in-use':   'An account with this email already exists.',
  'auth/invalid-email':          'Please enter a valid email address.',
  'auth/weak-password':          'Password must be at least 6 characters.',
  'auth/user-not-found':         'No account found with this email.',
  'auth/wrong-password':         'Incorrect password.',
  'auth/invalid-credential':     'Incorrect email or password.',
  'auth/too-many-requests':      'Too many attempts. Please try again in a few minutes.',
  'auth/network-request-failed': 'Network error. Check your connection.',
  'auth/popup-closed-by-user':   'Sign-in cancelled.',
  'auth/popup-blocked':          'Pop-up blocked. Please allow pop-ups and try again.',
  'auth/requires-recent-login':  'Please sign in again to complete this action.',
  'auth/user-disabled':          'This account has been disabled.'
};

function friendly(err) {
  if (!err || !err.code) return 'Something went wrong. Please try again.';
  return ERROR_MAP[err.code] || 'Something went wrong. Please try again.';
}

/* --- Public API --- */
export const Auth = {
  _mods: null,

  async _load() {
    if (this._mods) return this._mods;
    this._mods = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
    return this._mods;
  },

  async _auth() {
    const a = await initAuth();
    if (!a) throw new Error('Firebase Auth is not enabled.');
    return a;
  },

  /* --- Register --- */
  async signUp(email, password, displayName) {
    try {
      const { createUserWithEmailAndPassword, updateProfile } = await this._load();
      const auth = await this._auth();
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName && cred.user) {
        await updateProfile(cred.user, { displayName });
      }
      return { user: cred.user, error: null };
    } catch (err) {
      return { user: null, error: friendly(err), code: err.code };
    }
  },

  /* --- Sign in (email + password) --- */
  async signIn(email, password) {
    try {
      const { signInWithEmailAndPassword } = await this._load();
      const auth = await this._auth();
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return { user: cred.user, error: null };
    } catch (err) {
      return { user: null, error: friendly(err), code: err.code };
    }
  },

  /* --- Google sign-in (popup) --- */
  async signInWithGoogle() {
    try {
      const { GoogleAuthProvider, signInWithPopup } = await this._load();
      const auth = await this._auth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await signInWithPopup(auth, provider);
      return { user: cred.user, error: null };
    } catch (err) {
      return { user: null, error: friendly(err), code: err.code };
    }
  },

  /* --- Sign out --- */
  async signOut() {
    try {
      const { signOut: _signOut } = await this._load();
      const auth = await this._auth();
      await _signOut(auth);
      return { error: null };
    } catch (err) {
      return { error: friendly(err) };
    }
  },

  /* --- Password reset email --- */
  async resetPassword(email) {
    try {
      const { sendPasswordResetEmail } = await this._load();
      const auth = await this._auth();
      await sendPasswordResetEmail(auth, email);
      return { error: null };
    } catch (err) {
      return { error: friendly(err), code: err.code };
    }
  },

  /* --- Auth state listener --- */
  async onAuthChange(callback) {
    const { onAuthStateChanged } = await this._load();
    const auth = await this._auth();
    return onAuthStateChanged(auth, callback);
  },

  /* --- Current user (sync) --- */
  async getCurrentUser() {
    const auth = await this._auth();
    return auth.currentUser;
  }
};

window.MN_Auth = Auth;
