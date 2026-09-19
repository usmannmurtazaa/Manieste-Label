'use strict';

/* ==========================================================================
   MANIESTA LABEL — Order confirmation page
   Reads ?order={id}, fetches from Firestore (or localStorage fallback)
   ========================================================================== */

const $ = (s, c = document) => c.querySelector(s);

function fmtMoney(n, currency) {
  const c = currency || 'PKR';
  const num = Number(n) || 0;
  return 'Rs. ' + num.toLocaleString('en-PK');
}

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-PK', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return ''; }
}

function renderOrder(order) {
  const root = $('[data-order-root]');
  if (!root) return;

  const itemsHtml = (order.items || []).map(i =>
    '<div class="mn-checkout-item">' +
      '<div class="mn-checkout-item__media"><img src="' + i.image + '" alt=""></div>' +
      '<div>' +
        '<p class="mn-checkout-item__name">' + i.name + '</p>' +
        '<p class="mn-checkout-item__meta">' + i.size + ' · ' + i.color + ' · Qty ' + i.qty + '</p>' +
      '</div>' +
      '<div class="mn-checkout-item__price">Rs. ' + (i.price * i.qty).toLocaleString('en-PK') + '</div>' +
    '</div>'
  ).join('');

  const addr = order.shippingAddress || {};

  root.innerHTML =
    '<div class="mn-order-confirm">' +
      '<div class="mn-order-confirm__icon"><i class="fas fa-check"></i></div>' +
      '<h1 class="mn-order-confirm__title">Thank you for your order</h1>' +
      '<p class="mn-order-confirm__text">We\'ve received your order and will confirm it within one business day. You\'ll get an email at <strong>' + (order.customer ? order.customer.email : order.userEmail || '') + '</strong> when it ships.</p>' +
      '<p class="mn-order-confirm__number">#' + order.id + '</p>' +
    '</div>' +
    '<div class="mn-order-details">' +
      '<div class="mn-order-details__section">' +
        '<p class="mn-order-details__title">Items</p>' +
        '<div class="mn-checkout-items">' + itemsHtml + '</div>' +
        '<div class="mn-checkout-totals">' +
          '<div class="mn-checkout-totals__row"><span>Subtotal</span><span>' + fmtMoney(order.subtotal) + '</span></div>' +
          '<div class="mn-checkout-totals__row"><span>Shipping</span><span>' + (order.shipping === 0 ? 'Free' : fmtMoney(order.shipping)) + '</span></div>' +
          '<div class="mn-checkout-totals__row mn-checkout-totals__row--total"><span>Total</span><span>' + fmtMoney(order.total) + '</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="mn-order-details__section">' +
        '<p class="mn-order-details__title">Shipped to</p>' +
        '<p class="mn-order-details__line">' + (order.customer ? order.customer.name : '') + '</p>' +
        '<p class="mn-order-details__line">' + addr.line1 + (addr.line2 ? ', ' + addr.line2 : '') + '</p>' +
        '<p class="mn-order-details__line">' + addr.city + (addr.postalCode ? ', ' + addr.postalCode : '') + '</p>' +
        '<p class="mn-order-details__line">' + addr.country + '</p>' +
      '</div>' +
      '<div class="mn-order-details__section">' +
        '<p class="mn-order-details__title">Order info</p>' +
        '<p class="mn-order-details__line">Placed on ' + fmtDate(order.createdAt) + '</p>' +
        '<p class="mn-order-details__line">Status: ' + (order.status || 'pending') + '</p>' +
      '</div>' +
    '</div>' +
    '<div style="text-align:center;margin-top:48px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap">' +
      '<a class="mn-btn" href="shop.html">Continue shopping</a>' +
      '<a class="mn-btn mn-btn--outline" href="account.html#orders">View my orders</a>' +
    '</div>';
}

async function init() {
  const root = $('[data-order-root]');
  if (!root) return;

  const orderId = new URLSearchParams(location.search).get('order');
  if (!orderId) {
    root.innerHTML = '<div class="mn-empty"><p class="mn-empty__title">No order specified</p><p class="mn-empty__text">Check your email for the order link.</p><a class="mn-btn" href="index.html">Back to home</a></div>';
    return;
  }

  root.innerHTML = '<div class="mn-loading-block"><span class="mn-spinner"></span><p>Loading order…</p></div>';

  // Wait for Orders module
  let waited = 0;
  while (!window.MN_Orders && waited < 1500) {
    await new Promise(r => setTimeout(r, 40));
    waited += 40;
  }

  if (!window.MN_Orders) {
    root.innerHTML = '<div class="mn-error"><p class="mn-error__title">Could not load order</p><p class="mn-error__text">Please refresh the page.</p></div>';
    return;
  }

  const { order, source } = await window.MN_Orders.get(orderId);

  if (!order) {
    root.innerHTML = '<div class="mn-empty"><p class="mn-empty__title">Order not found</p><p class="mn-empty__text">This order either doesn\'t exist or you\'re not signed in with the account that placed it.</p><a class="mn-btn" href="index.html">Back to home</a></div>';
    return;
  }

  // Attach id
  order.id = orderId;
  renderOrder(order);
}

init();
