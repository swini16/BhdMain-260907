(() => {
  if (typeof subscribe !== 'function' || typeof PUB_SUB_EVENTS === 'undefined') return;

  const absoluteUrl = (url) => {
    if (!url) return window.location.href;
    try {
      return new URL(url, window.location.origin).href;
    } catch (_) {
      return window.location.href;
    }
  };

  const money = (cents) => {
    const value = Number(cents);
    return Number.isFinite(value) ? value / 100 : 0;
  };

  subscribe(PUB_SUB_EVENTS.cartUpdate, ({ source, cartData } = {}) => {
    if (source !== 'product-form' || !cartData) return;

    const quantity = Number.parseInt(cartData.quantity, 10) || 1;
    const unitPrice = money(cartData.final_price ?? cartData.price);
    const lineValue = money(cartData.final_line_price ?? cartData.line_price) || unitPrice * quantity;
    const productName = cartData.product_title || cartData.title || document.title;
    const productId = cartData.product_id != null ? String(cartData.product_id) : '';
    const variantId = cartData.variant_id != null ? String(cartData.variant_id) : '';
    const productUrl = absoluteUrl(cartData.url);
    const imageUrl = absoluteUrl(cartData.image);
    const categories = cartData.product_type ? [cartData.product_type] : [];

    window._learnq = window._learnq || [];
    window._learnq.push([
      'track',
      'Added to Cart',
      {
        $value: lineValue,
        AddedItemProductName: productName,
        AddedItemProductID: productId,
        AddedItemVariantID: variantId,
        AddedItemSKU: cartData.sku || '',
        AddedItemCategories: categories,
        AddedItemImageURL: imageUrl,
        AddedItemURL: productUrl,
        AddedItemPrice: unitPrice,
        AddedItemQuantity: quantity,
        ItemNames: [productName],
        CheckoutURL: absoluteUrl('/checkout'),
        Items: [
          {
            ProductID: productId,
            VariantID: variantId,
            SKU: cartData.sku || '',
            ProductName: productName,
            Quantity: quantity,
            ItemPrice: unitPrice,
            RowTotal: lineValue,
            ProductURL: productUrl,
            ImageURL: imageUrl,
            ProductCategories: categories,
          },
        ],
      },
    ]);
  });
})();
