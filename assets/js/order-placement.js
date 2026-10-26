const ORDER_CREATE_WEB_APP_URL = "/api/orders/create";
const ORDER_CREATE_SUPPORT_NUMBER = "8801816569237";
const HB_PREPAYMENT_ENABLED = true; // Customers see manual Send Money instructions after receiving Order ID.
const HB_PREPAYMENT_NUMBER = "01816569237"; // bKash / Nagad manual Send Money number.
const DELIVERY_OPTIONS = {
  insideDhaka: { label: "Inside Dhaka", charge: 60 },
  outsideDhaka: { label: "Outside Dhaka", charge: 130 }
};
let checkoutItems = [];
let checkoutSubtotal = 0;
let checkoutPromotion = null; // Always reset for each newly opened checkout.

function calculatePromotionSavings() {
  if (!checkoutPromotion) return {discount:0, eligibleQty:0};
  const validNames = new Set(checkoutPromotion.eligibleProducts || []);
  const eligibleQty = checkoutItems.reduce((sum,item) =>
    sum + (validNames.has(item.name) ? Number(item.qty || 0) : 0),0);
  return { discount:eligibleQty * Number(checkoutPromotion.discountPerUnit || 0), eligibleQty };
}

async function applyCheckoutPromotion() {
  const input = document.getElementById("checkoutPromoCode");
  const message = document.getElementById("checkoutPromoMessage");
  const button = document.getElementById("checkoutPromoApply");
  const entered = String(input?.value || "").trim().toUpperCase();
  checkoutPromotion = null;
  if (!entered) {
    if (message) message.textContent = "Enter a promotion code to apply a discount.";
    refreshCheckoutAmounts();
    return;
  }
  if (button) button.disabled = true;
  if (message) message.textContent = "Checking promotion code…";
  try {
    const response = await fetch("/api/orders/promotion?code=" + encodeURIComponent(entered),
      {cache:"no-store"});
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || "Promotion unavailable.");
    checkoutPromotion = result;
    const savings = calculatePromotionSavings();
    if (message) message.textContent = savings.discount ?
      result.code + " applied: " + formatCheckoutMoney(savings.discount) +
        " off " + savings.eligibleQty + " eligible unit(s)." :
      result.code + " is valid, but this cart has no eligible products.";
  } catch (error) {
    checkoutPromotion = null;
    if (message) message.textContent = error.message || "Promotion could not be applied.";
  } finally {
    if (button) button.disabled = false;
    refreshCheckoutAmounts();
  }
}


function loadCheckoutCss() {
  if (document.querySelector("link[href*='order-placement.css']")) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "assets/css/order-placement.css?v=20261026-fire100-1";
  document.head.appendChild(link);
}

function setCheckoutButtonLabel() {
  const checkoutButton = document.getElementById("whatsappOrder");
  if (!checkoutButton) return;
  checkoutButton.textContent = "Checkout";
  checkoutButton.setAttribute("aria-label", "Checkout and place order");
}

function generateClientOrderId() {
  // Numeric-only Order ID used consistently by checkout, Google Sheet,
  // invoice filenames and Track Order.
  const timePart = Date.now().toString();
  let randomPart = "";
  if (window.crypto && window.crypto.getRandomValues) {
    const bytes = new Uint32Array(1);
    window.crypto.getRandomValues(bytes);
    randomPart = String(bytes[0] % 100).padStart(2, "0");
  } else {
    randomPart = String(Math.floor(Math.random() * 100)).padStart(2, "0");
  }
  return `${timePart}${randomPart}`;
}

function formatCheckoutMoney(value) {
  return `৳${Number(value || 0).toLocaleString("en-BD")}`;
}

function safeText(value) {
  return String(value || "").replace(/[<>]/g, "");
}

function getSelectedDeliveryOption() {
  const value = document.getElementById("checkoutShippingZone")?.value || "";
  return DELIVERY_OPTIONS[value] || null;
}

function getPaymentMethodValue() {
  return document.querySelector('input[name="paymentMethod"]:checked')?.value || "Cash on Delivery";
}

function calculateCheckoutAmounts() {
  const option = getSelectedDeliveryOption();
  const shippingCharge = option ? option.charge : 0;
  const {discount, eligibleQty} = calculatePromotionSavings();
  const discountedSubtotal = checkoutSubtotal - discount;
  const grandTotal = discountedSubtotal + shippingCharge;
  // Order is recorded with zero collected; manual Send Money happens after an Order ID is assigned.
  const paidAmount = 0;
  const dueAmount = grandTotal;
  const paymentStatus = getPaymentMethodValue() === "Cash on Delivery" ? "Due" : "Pending Verification";
  return { shippingCharge, grandTotal, discountedSubtotal, promoDiscount:discount, eligibleQty, paidAmount, dueAmount, paymentStatus, shippingLabel: option ? option.label : "Select shipping area" };
}

function getCartCheckoutItems() {
  try {
    if (typeof getCartDetails === "function") {
      return getCartDetails().map(item => ({
        id: item.id,
        name: item.name,
        qty: item.qty,
        price: Number(item.price || 0),
        lineTotal: Number(item.lineTotal || 0)
      }));
    }
  } catch (error) {
    console.warn("Cart details unavailable", error);
  }
  return [];
}

function getDirectCheckoutItem(button) {
  const card = button.closest(".product-card");
  if (!card) return null;
  const name = card.querySelector("h3")?.textContent?.trim() || "Selected product";
  const priceText = card.querySelector(".product-card__sale-price, .sale-price, .price")?.textContent || "0";
  const price = Number(priceText.replace(/[^0-9]/g, "")) || 0;
  return { name, qty: 1, price, lineTotal: price };
}

function ensureCheckoutModal() {
  let modal = document.getElementById("checkoutModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "checkoutModal";
  modal.className = "checkout-modal";
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="checkout-modal__backdrop" data-checkout-close></div>
    <div class="checkout-modal__dialog" role="dialog" aria-modal="true" aria-label="Place order">
      <div class="checkout-modal__header">
        <div><p class="eyebrow">Place Order | অর্ডার করুন</p><h2>Confirm your order information</h2></div>
        <button class="checkout-close" type="button" data-checkout-close aria-label="Close checkout">×</button>
      </div>
      <form class="checkout-form" id="checkoutForm">
        <div class="checkout-form__grid">
          <label><span>Customer Name *</span><input id="checkoutName" name="customerName" type="text" placeholder="Your full name" required></label>
          <label><span>Phone Number *</span><input id="checkoutPhone" name="phone" type="tel" placeholder="01800000000" required></label>
        </div>
        <div class="checkout-form__grid">
          <label><span>Email (Optional)</span><input id="checkoutEmail" name="customerEmail" type="email" placeholder="you@example.com" autocomplete="email"><small>Provide an email to receive invoice updates. Without email, save your Order ID and our team will contact you by phone.</small></label>
          <label><span>Delivery Area / City *</span><input id="checkoutArea" name="deliveryArea" type="text" placeholder="Mirpur, Dhaka / Sylhet / etc." required></label>
        </div>
        <label><span>Full Delivery Address *</span><textarea id="checkoutAddress" name="address" placeholder="House, road, area, district" required></textarea></label>
        <div class="checkout-form__grid">
          <label><span>Shipping Location *</span><select id="checkoutShippingZone" name="shippingZone" required><option value="">Select shipping area</option><option value="insideDhaka">Inside Dhaka — ৳${DELIVERY_OPTIONS.insideDhaka.charge}</option><option value="outsideDhaka">Outside Dhaka — ৳${DELIVERY_OPTIONS.outsideDhaka.charge}</option></select></label>
        </div>
        <div class="checkout-promo" aria-label="Promotion code">
          <label for="checkoutPromoCode"><span>Promotion Code (Optional)</span></label>
          <div class="checkout-promo__entry">
            <input id="checkoutPromoCode" type="text" placeholder="Enter promo code"
              autocomplete="off" maxlength="40" spellcheck="false" aria-describedby="checkoutPromoMessage">
            <button type="button" id="checkoutPromoApply" class="checkout-promo__apply">Apply</button>
          </div>
          <small id="checkoutPromoMessage" role="status" aria-live="polite">Discount applies only to eligible products.</small>
        </div>
        <div class="checkout-summary" id="checkoutSummary"></div>
        <fieldset class="checkout-methods">
          <legend>Payment method</legend>
          <label class="checkout-method">
            <input type="radio" name="paymentMethod" value="Cash on Delivery" checked>
            <span><strong>Cash on Delivery</strong><small>Pay when your order arrives</small></span>
          </label>
          <label class="checkout-method ${HB_PREPAYMENT_ENABLED ? "" : "checkout-method--disabled"}">
            <input type="radio" name="paymentMethod" value="bKash" ${HB_PREPAYMENT_ENABLED ? "" : "disabled"}>
            <span><strong>bKash</strong><small>${HB_PREPAYMENT_ENABLED ? "Send Money after order placement" : "Currently unavailable"}</small></span>
          </label>
          <label class="checkout-method ${HB_PREPAYMENT_ENABLED ? "" : "checkout-method--disabled"}">
            <input type="radio" name="paymentMethod" value="Nagad" ${HB_PREPAYMENT_ENABLED ? "" : "disabled"}>
            <span><strong>Nagad</strong><small>${HB_PREPAYMENT_ENABLED ? "Send Money after order placement" : "Currently unavailable"}</small></span>
          </label>
        </fieldset>
        <div class="cod-notice" role="note" id="checkoutMethodInfo"></div>
        <label><span>Order Note</span><textarea id="checkoutNote" name="note" placeholder="Color, size, preferred delivery time, or other note"></textarea></label>
        <p class="checkout-status" id="checkoutStatus" aria-live="polite"></p>
        <button class="button button--primary button--full" type="submit">Finalize Checkout</button>
      </form>
    </div>`;
  document.body.appendChild(modal);
  return modal;
}

function renderCheckoutSummary() {
  const summary = document.getElementById("checkoutSummary");
  if (!summary) return;
  const amounts = calculateCheckoutAmounts();
  const list = checkoutItems.map(item => `<li>${safeText(item.name)} × ${item.qty} = ${formatCheckoutMoney(item.lineTotal)}</li>`).join("");
  summary.innerHTML = `
    <h3>Order Summary</h3>
    <ul>${list}</ul>
    <div class="checkout-summary__totals">
      <div class="checkout-summary__row"><span>Product Subtotal</span><strong>${formatCheckoutMoney(checkoutSubtotal)}</strong></div>
      ${checkoutPromotion && amounts.promoDiscount ? `<div class="checkout-summary__row checkout-summary__discount"><span>Promo ${safeText(checkoutPromotion.code)} (-${formatCheckoutMoney(checkoutPromotion.discountPerUnit)}/eligible unit)</span><strong>-${formatCheckoutMoney(amounts.promoDiscount)}</strong></div>` : ""}
      ${amounts.promoDiscount ? `<div class="checkout-summary__row"><span>Discounted Subtotal</span><strong>${formatCheckoutMoney(amounts.discountedSubtotal)}</strong></div>` : ""}
      <div class="checkout-summary__row"><span>Shipping Charge</span><strong>${amounts.shippingCharge ? formatCheckoutMoney(amounts.shippingCharge) : amounts.shippingLabel}</strong></div>
      <div class="checkout-summary__row checkout-summary__total"><span>Grand Total</span><strong>${formatCheckoutMoney(amounts.grandTotal)}</strong></div>
      <div class="checkout-summary__row"><span>Advance Paid</span><strong>${formatCheckoutMoney(amounts.paidAmount)}</strong></div>
      <div class="checkout-summary__row"><span>${getPaymentMethodValue() === "Cash on Delivery" ? "Due on Delivery" : "Amount to Send After Order"}</span><strong>${formatCheckoutMoney(amounts.dueAmount)}</strong></div>
    </div>
    <small class="shipping-note">${getPaymentMethodValue() === "Cash on Delivery" ? "No payment required now. The full amount, including delivery charge, is due on delivery." : "Your order will be created before payment. Your Order ID and Send Money instructions will appear immediately after submitting. Contact WhatsApp support if you need help. Payment stays unverified until checked by support."}</small>`;
}

function openCheckout(items) {
  loadCheckoutCss();
  setCheckoutButtonLabel();
  checkoutItems = items.filter(Boolean);
  checkoutSubtotal = checkoutItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
  checkoutPromotion = null;
  if (!checkoutItems.length) {
    alert("Your cart is empty. Please add a product first.");
    return;
  }
  const modal = ensureCheckoutModal();
  const promoInput = document.getElementById("checkoutPromoCode");
  if (promoInput) promoInput.value = "";
  const promoMessage = document.getElementById("checkoutPromoMessage");
  if (promoMessage) promoMessage.textContent = "Discount applies only to eligible products.";
  renderCheckoutSummary();
  refreshCheckoutAmounts();
  const status = document.getElementById("checkoutStatus");
  if (status) status.textContent = "";
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("checkout-open");
  setTimeout(() => document.getElementById("checkoutName")?.focus(), 50);
}

function closeCheckout() {
  const modal = document.getElementById("checkoutModal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("checkout-open");
}

function refreshCheckoutAmounts() {
  renderCheckoutSummary();
  const note = document.getElementById("checkoutMethodInfo");
  if (!note) return;
  if (getPaymentMethodValue() === "Cash on Delivery") {
    note.innerHTML = "<strong>Cash on Delivery — No advance payment required</strong><p>Pay the product price and delivery charge together when your order arrives. No advance payment is needed.</p>";
  } else {
    note.innerHTML = "<strong>Place your order first</strong><p>After you receive your Order ID, you will see Send Money instructions for 01816569237. If you need help or would like the instructions by email, contact HB Gadget BD on WhatsApp. We issue the Paid invoice only after verifying your transaction.</p>";
  }
}

async function buildOrderPayload() {
  const name = document.getElementById("checkoutName")?.value.trim() || "";
  const phone = document.getElementById("checkoutPhone")?.value.trim() || "";
  const email = document.getElementById("checkoutEmail")?.value.trim() || "";
  const area = document.getElementById("checkoutArea")?.value.trim() || "";
  const payment = getPaymentMethodValue();
  const shippingZoneValue = document.getElementById("checkoutShippingZone")?.value || "";
  const shippingOption = getSelectedDeliveryOption();
  const address = document.getElementById("checkoutAddress")?.value.trim() || "";
  // Preserve the customer's note verbatim in a dedicated invoice field.
  const customerNote = document.getElementById("checkoutNote")?.value ?? "";
  const note = customerNote.trim();
  const amounts = calculateCheckoutAmounts();
  const itemsText = checkoutItems.map(item => `${item.name} x ${item.qty} = ${formatCheckoutMoney(item.lineTotal)}`).join(", ");
  const finalNote = [
    `Shipping zone: ${shippingOption ? shippingOption.label : ""}`,
    `Payment method selected: ${payment}`,
    `Shipping charge: ${formatCheckoutMoney(amounts.shippingCharge)}`,
    "Advance collected at checkout: BDT 0; confirmation pending",
    note ? `Customer note: ${note}` : ""
  ].filter(Boolean).join(" | ");

  return {
    orderId: generateClientOrderId(), // provisional request token; NOT the final Order ID
    clientOrigin: window.location.origin,
    action: "create",
    customerName: name,
    phone,
    customerEmail: email,
    email,
    status: "Pending",
    statusBn: "অর্ডার গ্রহণ করা হয়েছে",
    items: itemsText,
    subtotal: amounts.discountedSubtotal,
    originalSubtotal: checkoutSubtotal,
    promoCode: checkoutPromotion && amounts.promoDiscount ? checkoutPromotion.code : "",
    promoDiscount: amounts.promoDiscount,
    cartItems: checkoutItems.map(item => ({
      name:item.name, qty:Number(item.qty), price:Number(item.price),
      lineTotal:Number(item.lineTotal)
    })),
    deliveryCharge: amounts.shippingCharge,
    shippingZone: shippingOption ? shippingOption.label : "",
    shippingZoneCode: shippingZoneValue,
    grandTotal: amounts.grandTotal,
    paidAmount: amounts.paidAmount,
    dueAmount: amounts.dueAmount,
    paymentStatus: amounts.paymentStatus,
    paymentMethod: payment,
    deliveryArea: area,
    address,
    courier: "Not assigned yet",
    trackingNumber: "Pending",
    note: finalNote,
    customerNote: customerNote,
    paymentProof: null // No funds collected at checkout; optional proof can be handled after order creation.
  };
}

async function submitOrderToSheet(payload) {
  // Exactly one request. Do not retry a submission automatically: the order
  // might have been saved even if a network response is lost.
  let response;
  try {
    response = await fetch(ORDER_CREATE_WEB_APP_URL, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(payload)
    });
  } catch (error) {
    throw new Error("Order confirmation could not be received. Contact support before trying again.");
  }
  let result;
  try {
    result = await response.json();
  } catch (error) {
    throw new Error("Order confirmation was not returned. Contact support before trying again.");
  }
  if (!response.ok || !result.success) {
    throw new Error(result.message || "Could not confirm the order. Contact support before trying again.");
  }
  if (!/^\d{12,25}$/.test(String(result.orderId || ""))) {
    throw new Error("The server did not return a valid Order ID. Contact support before trying again.");
  }
  return result;
}

function renderCheckoutSuccess(orderId, invoiceLink, paymentMethod, amountDue, hasEmail) {
  const modal = ensureCheckoutModal();
  const dialog = modal.querySelector(".checkout-modal__dialog");
  // iOS Safari may retain the form's scroll/focus when the tall checkout form is replaced.
  // Dismiss the mobile keyboard before showing the shorter confirmation panel.
  const activeElement = document.activeElement;
  if (activeElement && modal.contains(activeElement) && typeof activeElement.blur === "function") {
    activeElement.blur();
  }
  const isPrepayment = paymentMethod === "bKash" || paymentMethod === "Nagad";
  const message = isPrepayment ? `Hello HB Gadget BD, I placed order ${orderId} using ${paymentMethod}. Please help me confirm my payment. Transaction ID: ` : `Hello HB Gadget BD, I placed Cash on Delivery order ${orderId}. Please confirm delivery and availability.`;
  const paymentInstructions = isPrepayment ? `<div class="checkout-payment-steps"><h4>${safeText(paymentMethod)} — Payment instructions</h4><p>Order ID: <strong>${safeText(orderId)}</strong>. Amount: <strong>${formatCheckoutMoney(amountDue)}</strong>.</p><ol><li>Open ${safeText(paymentMethod)} and use Send Money to <strong>${HB_PREPAYMENT_NUMBER}</strong> using the HB Gadget BD payment number.</li><li>Enter the Order ID in the Reference/Note field if the app provides one.</li><li>Save your transaction ID and send it to our WhatsApp support team for manual verification.</li></ol><button type="button" data-copy-payment-number>Copy payment number</button><p>Once sent, WhatsApp your Transaction ID to HB Gadget BD. Your order is marked Paid only after the support team verifies the payment.</p></div>` : `<p>Payment method: Cash on Delivery. Pay the total when the order arrives.</p>`;
  const contactNotice = hasEmail ? "A support team member will call or email you soon to confirm your order. Your preliminary invoice will be emailed when processing succeeds." : "No email was provided, so email notifications will not be sent. Save your Order ID to track the order; our team will contact you by phone. If available, the invoice link appears below.";
  dialog.innerHTML = `<div class="checkout-success-card"><h3>Order submitted successfully!</h3><p>Your Order ID is <strong>${safeText(orderId)}</strong>.</p><p>${contactNotice}</p><div class="order-meta-grid"><div><small>Order ID</small><strong>${safeText(orderId)}</strong></div></div>${paymentInstructions}${invoiceLink ? `<p><a href="${safeText(invoiceLink)}" target="_blank" rel="noreferrer">View provisional invoice</a></p>` : ""}<div class="checkout-actions"><a href="https://wa.me/${ORDER_CREATE_SUPPORT_NUMBER}?text=${encodeURIComponent(message)}" target="_blank" rel="noreferrer">Contact WhatsApp Support</a><button type="button" data-checkout-close>Close</button></div></div>`;
  // Always show Order ID and payment instructions from the beginning of the confirmation.
  // A second reset after layout addresses Safari retaining the previous form's scroll offset.
  dialog.scrollTop = 0;
  window.requestAnimationFrame(() => { dialog.scrollTop = 0; });
}

async function handleCheckoutSubmit(event) {
  if (event.target?.id !== "checkoutForm") return;
  event.preventDefault();
  const status = document.getElementById("checkoutStatus");
  const submit = event.target.querySelector("button[type='submit']");
  if (status) status.textContent = "Saving your order and preparing the invoice. Please keep this window open.";
  if (submit) { submit.disabled = true; submit.dataset.originalText = submit.textContent; submit.textContent = "Processing order…"; }

  try {
    const payload = await buildOrderPayload();
    if (!HB_PREPAYMENT_ENABLED && payload.paymentMethod !== "Cash on Delivery") throw new Error("This payment option is currently unavailable.");
    if (!payload.customerName || !payload.phone || !payload.deliveryArea || !payload.address || !payload.shippingZone) {
      throw new Error("Please fill in all required fields, including shipping location.");
    }
    const result = await submitOrderToSheet(payload);
    if (!result.success) throw new Error(result.message || "Order could not be saved.");
    document.getElementById("clearCart")?.click();
    if (!result.orderId) throw new Error("Server did not return a confirmed Order ID.");
    renderCheckoutSuccess(result.orderId, result.invoiceLink || "", payload.paymentMethod, payload.grandTotal, Boolean(payload.customerEmail));
  } catch (error) {
    console.error(error);
    if (status) status.textContent = error.message || "Order could not be submitted automatically. Please contact WhatsApp support.";
  } finally {
    if (submit) { submit.disabled = false; submit.textContent = submit.dataset.originalText || "Finalize Checkout"; }
  }
}

function wireOrderPlacement() {
  if (window.__hbOrderPlacementWired) return;
  window.__hbOrderPlacementWired = true;
  loadCheckoutCss();
  setCheckoutButtonLabel();
  window.addEventListener("storage", event => { if (event.key === "hbGadgetCart" && typeof renderCart === "function") renderCart(); });
  document.addEventListener("change", event => {
    if (event.target?.name === "paymentMethod" || event.target?.id === "checkoutShippingZone") refreshCheckoutAmounts();
  });
  document.addEventListener("click", event => {
    if (event.target.closest("[data-copy-payment-number]")) {
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(HB_PREPAYMENT_NUMBER).then(() => alert("Payment number copied.")).catch(() => alert(HB_PREPAYMENT_NUMBER));
      else alert(HB_PREPAYMENT_NUMBER);
      return;
    }
    if (event.target.closest("#checkoutPromoApply")) {
      event.preventDefault(); applyCheckoutPromotion(); return;
    }
    if (event.target.closest("[data-checkout-close]")) { closeCheckout(); return; }
    const cartCheckout = event.target.closest("#whatsappOrder");
    if (cartCheckout) { event.preventDefault(); openCheckout(getCartCheckoutItems()); return; }
    // Only handle homepage product-card shortcuts here. On product.html,
    // [data-order-current] is handled by product-page.js and opens Your Cart.
    const orderNow = event.target.closest(".product-card .order-now");
    if (orderNow) { event.preventDefault(); event.stopImmediatePropagation(); const item = getDirectCheckoutItem(orderNow); openCheckout(item ? [item] : getCartCheckoutItems()); }
  }, true);
  document.addEventListener("input", event => {
    if (event.target?.id !== "checkoutPromoCode") return;
    if (checkoutPromotion) {
      checkoutPromotion = null;
      const status = document.getElementById("checkoutPromoMessage");
      if (status) status.textContent = "Code changed. Click Apply to check it.";
      refreshCheckoutAmounts();
    }
  });
  document.addEventListener("submit", handleCheckoutSubmit, true);
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeCheckout(); });
  // The Checkout button exists at initialization; avoid unnecessary repeated DOM work.
}

document.addEventListener("DOMContentLoaded", wireOrderPlacement);
wireOrderPlacement();
