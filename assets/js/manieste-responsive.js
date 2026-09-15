'use strict';

/* ==========================================================================
   MANIESTA LABEL — Responsive pass
   Overrides ProductCard.render to reposition quick-add inside media
   Ensures card layout doesn't break when product names wrap
   ========================================================================== */

if (typeof ProductCard !== 'undefined') {
  ProductCard.render = function(p) {
    const sale = p.salePrice && p.salePrice < p.price;
    const badge = p.badge;
    const swatches = (p.colors || []).slice(0, 4).map(c =>
      '<span class="mn-swatch" style="background:' + c.hex + '" title="' + escapeHtml(c.name) + '"></span>'
    ).join('');
    const more = (p.colors || []).length > 4
      ? '<span class="mn-swatch-more">+' + (p.colors.length - 4) + '</span>'
      : '';

    return '' +
      '<article class="mn-product-card" data-product-id="' + p.id + '">' +
        '<div class="mn-product-card__media">' +
          '<a class="mn-product-card__media-link" href="product.html?p=' + p.slug + '" aria-label="' + escapeHtml(p.name) + '">' +
            '<img src="' + p.images[0] + '" alt="' + escapeHtml(p.name) + '" loading="lazy" onerror="this.src=\'' + IMG_FALLBACK + '\'">' +
            (p.images[1] ? '<img src="' + p.images[1] + '" alt="" aria-hidden="true" loading="lazy" onerror="this.src=\'' + IMG_FALLBACK + '\'">' : '') +
            (badge ? '<span class="mn-product-card__badge">' + escapeHtml(badge) + '</span>' : '') +
          '</a>' +
          '<button type="button" class="mn-product-card__wish" aria-label="Save ' + escapeHtml(p.name) + '" aria-pressed="' + Wishlist.has(p.id) + '" data-wish-toggle="' + p.id + '">' +
            '<i class="far fa-heart"></i>' +
          '</button>' +
          '<button type="button" class="mn-product-card__quickadd" data-quick-add="' + p.id + '">Add to bag</button>' +
        '</div>' +
        '<div class="mn-product-card__body">' +
          '<h3 class="mn-product-card__name">' +
            '<a href="product.html?p=' + p.slug + '">' + escapeHtml(p.name) + '</a>' +
          '</h3>' +
          '<div class="mn-product-card__meta">' +
            '<span class="mn-swatches">' + swatches + more + '</span>' +
            '<span class="mn-product-card__price' + (sale ? ' mn-product-card__price--sale' : '') + '">' +
              (sale
                ? '<del>' + fmt(p.price) + '</del>' + fmt(p.salePrice)
                : fmt(p.price)) +
            '</span>' +
          '</div>' +
        '</div>' +
      '</article>';
  };
}
