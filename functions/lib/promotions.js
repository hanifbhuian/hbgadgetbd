/**
 * HB Gadget BD promotion source of truth.
 * Keep this file for future codes. To pause FIRE100, set enabled:false,
 * commit to main and wait for the existing Cloudflare Pages deployment.
 * This is a per-eligible-unit discount (including mixed and multi-unit carts).
 * Changing active selling prices requires updating this authoritative price map.
 */
export const PROMOTIONS = Object.freeze({
  FIRE100: Object.freeze({
    enabled: true,
    discountPerUnit: 100,
    eligibleProducts: Object.freeze({
      "MG Mini DC UPS – 10000mAh Network Power Bank": 1699,
      "MG Mini DC UPS – 16000mAh Network Power Bank": 2199,
      "Miyako 2.0L Cordless Electric Kettle (1800W)": 1399
    })
  })
});

export function findPromotion(rawCode) {
  const code = String(rawCode || "").trim().toUpperCase();
  return code && Object.prototype.hasOwnProperty.call(PROMOTIONS, code) &&
    PROMOTIONS[code].enabled ? {code, ...PROMOTIONS[code]} : null;
}

/** Returns a validated discount or throws before forwarding any discounted order. */
export function pricePromotion(rawCode, cartItems, originalSubtotal, discountedSubtotal, claimedDiscount) {
  const promotion = findPromotion(rawCode);
  if (!promotion) throw new Error("This promotion code is invalid or no longer active.");
  if (!Array.isArray(cartItems) || !cartItems.length || cartItems.length > 40) {
    throw new Error("Please refresh your cart before applying the promotion.");
  }
  let gross = 0, eligibleQty = 0;
  const pricedLines = cartItems.map(item => {
    const name = String(item?.name || "").trim();
    const qty = Number(item?.qty), price = Number(item?.price), lineTotal = Number(item?.lineTotal);
    if (!name || name.length > 250 || !Number.isInteger(qty) || qty < 1 || qty > 50 ||
        !Number.isInteger(price) || price <= 0 || !Number.isInteger(lineTotal) ||
        lineTotal !== qty * price) {
      throw new Error("Product quantities or prices have changed. Refresh the cart.");
    }
    const eligible = Object.prototype.hasOwnProperty.call(promotion.eligibleProducts, name);
    if (eligible && promotion.eligibleProducts[name] !== price) {
      throw new Error("Product pricing has changed. Please refresh and apply the code again.");
    }
    gross += lineTotal;
    if (eligible) eligibleQty += qty;
    const savings = eligible ? qty * promotion.discountPerUnit : 0;
    return {name,qty,price,lineTotal,savings,discountedLineTotal:lineTotal-savings};
  });
  const discount = eligibleQty * promotion.discountPerUnit;
  if (!eligibleQty || !Number.isSafeInteger(gross) || discount >= gross) {
    throw new Error("The promotion requires at least one eligible product.");
  }
  if (gross !== Number(originalSubtotal) || discount !== Number(claimedDiscount) ||
      gross - discount !== Number(discountedSubtotal)) {
    throw new Error("The promotion total has changed. Please refresh checkout.");
  }
  return {promotion, discount, gross, pricedLines, eligibleQty};
}
