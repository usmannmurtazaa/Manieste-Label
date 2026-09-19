'use strict';

/* ==========================================================================
   MANIESTA LABEL — Checkout page logic
   Requires auth. Renders cart summary, handles form, creates order.
   ========================================================================== */

import { Auth } from './auth.js';
import { getDb } from './firebase-init.js';
import { FEATURES } from './firebase-config.js';

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

const SHIPPING_FREE_OVER = 5000;
const SHIPPING_FLAT = 250;

function waitForCart(maxMs) {
  const start = Date.now();
  return new Promise(resolve => {
    const tick = () => {
      if (window.Cart && window.Cart.get) return resolve(true);
      if (Date.now() - start > (maxMs || 1500)) return resolve(false);
      setTimeout(tick, 40);
    };
    tick();
  });
}

function renderSummary() {
  const root = $('[data-checkout-summary]');
  if (!root || !window.Cart) return;

  const items = window.Cart.get() || [];
  if (!items.length) {
    root.innerHTML = '<div class="mn-empty-inline"><p class="mn-empty-inline__title">Your bag is empty</p><p class="mn-empty-inline__text">Add something first.</p><a class="mn-btn" href="shop.html">Shop the collection</a></div>';
    const placeBtn = $('[data-place-order]');
    if (placeBtn) placeBtn.disabled = true;
    return;
  }

  const subtotal = items.reduce((s, i) => s + (i.price || 0) * (i.qty || 0), 0);
  const shipping = subtotal >= SHIPPING_FREE_OVER ? 0 : SHIPPING_FLAT;
  const total = subtotal + shipping;

  const itemsHtml = items.map(i =>
    '<div class="mn-checkout-item">' +
      '<div class="mn-checkout-item__media"><img src="' + i.image + '" alt="" loading="lazy" onerror="this.src=\'' + (window.IMG_FALLBACK || '') + '\'"></div>' +
      '<div>' +
        '<p class="mn-checkout-item__name">' + (i.name || '') + '</p>' +
        '<p class="mn-checkout-item__meta">' + (i.size || '') + ' · ' + (i.color || '') + ' · Qty ' + i.qty + '</p>' +
      '</div>' +
      '<div class="mn-checkout-item__price">Rs. ' + (i.price * i.qty).toLocaleString('en-PK') + '</div>' +
    '</div>'
  ).join('');

  root.innerHTML =
    '<p class="mn-checkout-summary__title">Order summary</p>' +
    '<div class="mn-checkout-items">' + itemsHtml + '</div>' +
    '<div class="mn-checkout-totals">' +
      '<div class="mn-checkout-totals__row"><span>Subtotal</span><span>Rs. ' + subtotal.toLocaleString('en-PK') + '</span></div>' +
      '<div class="mn-checkout-totals__row"><span>Shipping</span><span>' + (shipping === 0 ? 'Free' : 'Rs. ' + shipping.toLocaleString('en-PK')) + '</span></div>' +
      '<div class="mn-checkout-totals__row mn-checkout-totals__row--total"><span>Total</span><span>Rs. ' + total.toLocaleString('en-PK') + '</span></div>' +
    '</div>';

  // Stash totals for submit
  root.dataset.subtotal = subtotal;
  root.dataset.shipping = shipping;
  root.dataset.total = total;
}

function renderAuthState(user) {
  const notice = $('[data-checkout-auth]');
  const form = $('[data-checkout-form]');
  if (!notice || !form) return;

  if (!user) {
    notice.hidden = false;
    form.querySelectorAll('input, textarea, button').forEach(el => el.disabled = true);
    const existing = notice.querySelector('[data-checkout-google]');
    if (!existing) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mn-btn mn-mt-4';
      btn.setAttribute('data-checkout-google', '');
      btn.textContent = 'Continue with Google';
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        const { error } = await Auth.signInWithGoogle();
        if (error) {
          btn.disabled = false;
          btn.textContent = 'Continue with Google';
          alert(error);
        }
      });
      notice.appendChild(btn);
    }
  } else {
    notice.hidden = true;
    form.querySelectorAll('input, textarea, button').forEach(el => el.disabled = false);
    // Autofill
    const emailField = form.querySelector('#co-email');
    if (emailField && !emailField.value) emailField.value = user.email || '';
    const nameField = form.querySelector('#co-name');
    if (nameField && !nameField.value && user.displayName) nameField.value = user.displayName;
  }
}

function showFormError(form, msg) {
  let box = form.querySelector('[data-checkout-error]');
  if (!box) {
    box = document.createElement('div');
    box.setAttribute('data-checkout-error', '');
    box.className = 'mn-alert mn-alert--error';
    box.style.marginTop = '20px';
    box.setAttribute('role', 'alert');
    form.appendChild(box);
  }
  box.textContent = msg;
}

function clearFormError(form) {
  const box = form.querySelector('[data-checkout-error]');
  if (box) box.remove();
}

async function placeOrder(e) {
  e.preventDefault();
  const form = e.target;
  clearFormError(form);

  if (!window.Cart || !window.Cart.get().length) {
    showFormError(form, 'Your bag is empty.');
    return;
  }

  const user = await Auth.getCurrentUser();
  if (!user) {
    showFormError(form, 'Please sign in to complete your order.');
    return;
  }

  const fields = {
    email: form.querySelector('#co-email').value.trim(),
    phone: form.querySelector('#co-phone').value.trim(),
    name: form.querySelector('#co-name').value.trim(),
    line1: form.querySelector('#co-line1').value.trim(),
    line2: form.querySelector('#co-line2').value.trim(),
    city: form.querySelector('#co-city').value.trim(),
    country: form.querySelector('#co-country').value,
    postalCode: form.querySelector('#co-postal').value.trim(),
    notes: form.querySelector('#co-notes').value.trim()
  };

  // Validate
  const required = ['email', 'phone', 'name', 'line1', 'city', 'country'];
  for (const k of required) {
    if (!fields[k]) { showFormError(form, 'Please fill in all required fields.'); return; }
  }

  const btn = form.querySelector('[data-place-order]');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Placing order…';

  // Wait for Orders module
  let waited = 0;
  while (!window.MN_Orders && waited < 1500) {
    await new Promise(r => setTimeout(r, 40));
    waited += 40;
  }
  if (!window.MN_Orders) {
    btn.disabled = false;
    btn.textContent = originalText;
    showFormError(form, 'Order system not ready. Please refresh the page.');
    return;
  }

  const summaryRoot = $('[data-checkout-summary]');
  const subtotal = parseInt(summaryRoot.dataset.subtotal || '0', 10);
  const shipping = parseInt(summaryRoot.dataset.shipping || '0', 10);
  const total = parseInt(summaryRoot.dataset.total || '0', 10);
  const items = window.Cart.get().map(i => ({
    id: i.id,
    name: i.name,
    slug: i.slug,
    price: i.price,
    image: i.image,
    size: i.size,
    color: i.color,
    qty: i.qty
  }));

  const { id, error } = await window.MN_Orders.create({
    userId: user.uid,
    userEmail: user.email || fields.email,
    customer: { name: fields.name, email: fields.email, phone: fields.phone },
    shippingAddress: {
      line1: fields.line1,
      line2: fields.line2,
      city: fields.city,
      country: fields.country,
      postalCode: fields.postalCode
    },
    notes: fields.notes,
    items: items,
    subtotal: subtotal,
    shipping: shipping,
    discount: 0,
    total: total,
    currency: 'PKR'
  });

  if (error || !id) {
    btn.disabled = false;
    btn.textContent = originalText;
    showFormError(form, 'Could not place order: ' + (error || 'unknown error') + '. Please try again.');
    return;
  }

  // Clear cart
  if (window.Cart.clear) window.Cart.clear();
  else if (window.Cart.set) window.Cart.set([]);
  try { localStorage.removeItem('manieste.cart.v1'); } catch {}

  window.location.href = 'order-confirmation.html?order=' + encodeURIComponent(id);
}

async function init() {
  if (!$('[data-checkout-form]')) return;

  const ready = await waitForCart(1500);
  if (!ready) {
    console.warn('[Checkout] Cart module not ready');
  }

  renderSummary();

  // Bind form
  const form = $('[data-checkout-form]');
  form.addEventListener('submit', placeOrder);

  // Auth state
  await Auth.onAuthChange(user => {
    renderAuthState(user);
  });

  // Re-render summary if cart changes while on this page
  document.addEventListener('mn:cart-changed', renderSummary);
}

init();
