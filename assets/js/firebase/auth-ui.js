/* ==========================================================================
   MANIESTA LABEL — Auth UI wiring
   Binds account.html forms to Firebase Auth, updates header state
   ========================================================================== */

import { Auth } from './auth.js';

/* --- Small helpers --- */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

function setLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.dataset.originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Please wait…';
  } else {
    btn.disabled = false;
    if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
  }
}

function showError(formEl, message) {
  if (!formEl) return;
  let box = formEl.querySelector('[data-auth-error]');
  if (!box) {
    box = document.createElement('div');
    box.setAttribute('data-auth-error', '');
    box.className = 'mn-alert mn-alert--error';
    box.style.marginTop = '16px';
    box.setAttribute('role', 'alert');
    formEl.appendChild(box);
  }
  box.innerHTML = '<p style="margin:0">' + message + '</p>';
  box.style.display = '';
}

function clearError(formEl) {
  if (!formEl) return;
  const box = formEl.querySelector('[data-auth-error]');
  if (box) { box.remove(); }
}

function showSuccess(formEl, message) {
  if (!formEl) return;
  let box = formEl.querySelector('[data-auth-success]');
  if (!box) {
    box = document.createElement('div');
    box.setAttribute('data-auth-success', '');
    box.className = 'mn-alert mn-alert--success';
    box.style.marginTop = '16px';
    box.setAttribute('role', 'status');
    formEl.appendChild(box);
  }
  box.innerHTML = '<p style="margin:0">' + message + '</p>';
}

/* --- Tab switching --- */
function activateTab(name) {
  const tabs = $$('[data-account-tab]');
  const panels = $$('[data-account-panel]');
  tabs.forEach(t => t.setAttribute('aria-current', t.dataset.accountTab === name ? 'page' : 'false'));
  panels.forEach(p => { p.hidden = p.dataset.accountPanel !== name; });
  history.replaceState(null, '', '#' + name);
}

/* --- Bind forms --- */
function bindSignIn() {
  const form = $('[data-account-form="signin"]');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError(form);
    const email = form.querySelector('input[type=email]').value.trim();
    const password = form.querySelector('input[type=password]').value;
    if (!email || !password) { showError(form, 'Please fill in both fields.'); return; }
    const btn = form.querySelector('button[type=submit]');
    setLoading(btn, true);
    const { error } = await Auth.signIn(email, password);
    setLoading(btn, false);
    if (error) { showError(form, error); return; }
    // onAuthChange will handle redirect/UI update
  });
}

function bindRegister() {
  const form = $('[data-account-form="register"]');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError(form);
    const first = form.querySelector('#re-first').value.trim();
    const last  = form.querySelector('#re-last').value.trim();
    const email = form.querySelector('#re-email').value.trim();
    const password = form.querySelector('#re-pass').value;
    const name = (first + ' ' + last).trim();
    if (!email || !password) { showError(form, 'Please fill in email and password.'); return; }
    if (password.length < 6) { showError(form, 'Password must be at least 6 characters.'); return; }
    const btn = form.querySelector('button[type=submit]');
    setLoading(btn, true);
    const { error } = await Auth.signUp(email, password, name);
    setLoading(btn, false);
    if (error) { showError(form, error); return; }
    // Signed in automatically
  });
}

function bindForgot() {
  const trigger = $('[data-forgot-password]');
  if (!trigger) return;
  trigger.addEventListener('click', async (e) => {
    e.preventDefault();
    const form = $('[data-account-form="signin"]');
    const emailInput = form ? form.querySelector('input[type=email]') : null;
    const email = emailInput ? emailInput.value.trim() : '';
    if (!email) { showError(form, 'Enter your email above first, then click "Forgot password".'); return; }
    clearError(form);
    const btn = trigger;
    setLoading(btn, true);
    const { error } = await Auth.resetPassword(email);
    setLoading(btn, false);
    if (error) { showError(form, error); return; }
    showSuccess(form, 'Password reset link sent to ' + email + '. Check your inbox.');
  });
}

function bindGoogle() {
  $$('[data-google-signin]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const form = btn.closest('form') || btn.closest('[data-account-panel]');
      const { error } = await Auth.signInWithGoogle();
      if (error) {
        const errContainer = form || $('[data-account-panel="signin"]');
        showError(errContainer, error);
      }
    });
  });
}

function bindSignOut() {
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-sign-out]');
    if (!btn) return;
    e.preventDefault();
    await Auth.signOut();
    // onAuthChange updates UI
  });
}

/* --- Header auth state --- */
function updateHeader(user) {
  document.body.setAttribute('data-auth-state', user ? 'signed-in' : 'signed-out');
  const accountLink = $('.mn-header__nav--right a[aria-label="Account"]');
  if (accountLink) {
    accountLink.setAttribute('title', user ? (user.displayName || user.email) : 'Sign in');
  }
}

/* --- Account page signed-in vs signed-out --- */
function updateAccountPanels(user) {
  if (!document.querySelector('[data-account-panel="signin"]')) return;

  const signinPanel   = $('[data-account-panel="signin"]');
  const registerPanel = $('[data-account-panel="register"]');
  const ordersPanel   = $('[data-account-panel="orders"]');
  const addressesPanel= $('[data-account-panel="addresses"]');
  const nav           = $('.mn-account-nav');

  if (user) {
    // Hide sign-in and register tabs
    const signinTab   = nav ? nav.querySelector('[data-account-tab="signin"]') : null;
    const registerTab = nav ? nav.querySelector('[data-account-tab="register"]') : null;
    if (signinTab) signinTab.style.display = 'none';
    if (registerTab) registerTab.style.display = 'none';

    // Show welcome panel instead of sign-in
    if (signinPanel) {
      signinPanel.innerHTML =
        '<p class="mn-eyebrow">Signed in</p>' +
        '<h2 class="h3 mn-mt-4">Welcome back' + (user.displayName ? ', ' + user.displayName.split(' ')[0] : '') + '.</h2>' +
        '<p class="mn-small mn-muted mn-mt-4">' + (user.email || '') + '</p>' +
        '<button type="button" class="mn-btn mn-btn--outline mn-mt-8" data-sign-out>Sign out</button>';
    }

    // Hide register panel content
    if (registerPanel) registerPanel.hidden = true;

    // Switch to orders tab
    activateTab('orders');
  } else {
    // Restore tabs
    const signinTab   = nav ? nav.querySelector('[data-account-tab="signin"]') : null;
    const registerTab = nav ? nav.querySelector('[data-account-tab="register"]') : null;
    if (signinTab) signinTab.style.display = '';
    if (registerTab) registerTab.style.display = '';
  }
}

/* --- Boot --- */
export async function initAuthUI() {
  if (!document.querySelector('[data-account-panel]') && !document.querySelector('.mn-header')) return;
  bindSignIn();
  bindRegister();
  bindForgot();
  bindGoogle();
  bindSignOut();

  let waited = 0;
  while (!window.CartSync && waited < 1000) {
    await new Promise(r => setTimeout(r, 30));
    waited += 30;
  }

  await Auth.onAuthChange(async (user) => {
    updateHeader(user);
    updateAccountPanels(user);
    if (window.CartSync && window.CartSync.onAuthChange) {
      await window.CartSync.onAuthChange(user);
    }
  });
}
