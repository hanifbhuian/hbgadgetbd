const ORDER_CREATE_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzva7OB4SqKgN51v66okHgb8LdiAmzJuEjVixpvs_gL4f0L6fRrqRnxbx-yDYWaSxtjnw/exec";
const ORDER_CREATE_SUPPORT_NUMBER = "8801816569237";
const MAX_PAYMENT_FILE_SIZE = 5 * 1024 * 1024;
const DELIVERY_OPTIONS = {
  insideDhaka: { label: "Inside Dhaka", charge: 70 },
  outsideDhaka: { label: "Outside Dhaka", charge: 150 }
};
let checkoutItems = [];
let checkoutSubtotal = 0;

function loadCheckoutCss() {
  if (document.querySelector("link[href*='order-placement.css']")) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "assets/css/order-placement.css?v=20260704-11";
  document.head.appendChild(link);
}

function setCheckoutButtonLabel() {
  const checkoutButton = document.getElementById("whatsappOrder");
  if (!checkoutButton) return;
  checkoutButton.textContent = "Checkout";
  checkoutButton.setAttribute("aria-label", "Checkout and place order");
}

function generateClientOrderId() {
  const timePart = Date.now().toString().slice(-6);
  const randomPart = Math.floor(Math.random() * 90 + 10).toString();
  return `HBG-${timePart}${randomPart}`;
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
  return document.getElementById("checkoutPayment")?.value || "Cash on Delivery";
}

function calculateCheckoutAmounts() {
  const option = getSelectedDeliveryOption();
  const shippingCharge = option ? option.charge : 0;
  const grandTotal = checkoutSubtotal + shippingCharge;
  const paymentMethod = getPaymentMethodValue();
  const isCashOnDelivery = paymentMethod === "Cash on Delivery";
  const paidAmount = option ? (isCashOnDelivery ? shippingCharge : grandTotal) : 0;
  const dueAmount = option ? Math.max(0, grandTotal - paidAmount) : grandTotal;
  const paymentStatus = dueAmount <= 0 ? "Paid" : "Due";
  return { shippingCharge, grandTotal, paidAmount, dueAmount, paymentStatus, shippingLabel: option ? option.label : "Select shipping area" };
}

function getCartCheckoutItems() {
  try {
    if (typeof getCartDetails === "function") {
      return getCartDetails().map(item => ({
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
  const priceText = card.querySelector(".price")?.textContent || "0";
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
      <div class="checkout-summary" id="checkoutSummary"></div>
      <form class="checkout-form" id="checkoutForm">
        <div class="checkout-form__grid">
          <label><span>Customer Name *</span><input id="checkoutName" name="customerName" type="text" placeholder="Your full name" required></label>
          <label><span>Phone Number *</span><input id="checkoutPhone" name="phone" type="tel" placeholder="01800000000" required></label>
        </div>
        <div class="checkout-form__grid">
          <label><span>Email for invoice *</span><input id="checkoutEmail" name="customerEmail" type="email" placeholder="you@example.com" required></label>
          <label><span>Delivery Area / City *</span><input id="checkoutArea" name="deliveryArea" type="text" placeholder="Mirpur, Dhaka / Sylhet / etc." required></label>
        </div>
        <label><span>Full Delivery Address *</span><textarea id="checkoutAddress" name="address" placeholder="House, road, area, district" required></textarea></label>
        <div class="checkout-form__grid">
          <label><span>Shipping Location *</span><select id="checkoutShippingZone" name="shippingZone" required><option value="">Select shipping area</option><option value="insideDhaka">Inside Dhaka — ৳70</option><option value="outsideDhaka">Outside Dhaka — ৳150</option></select></label>
          <label><span>Payment Method</span><select id="checkoutPayment" name="paymentMethod"><option value="Cash on Delivery">Cash on Delivery</option><option value="Bkash/Nagad before delivery">Bkash/Nagad before delivery</option><option value="Bank transfer before delivery">Bank transfer before delivery</option></select></label>
        </div>
        <div class="payment-proof" id="paymentProofBox">
          <div class="payment-proof__header"><strong>Shipping/payment proof *</strong><button class="payment-help" type="button" data-payment-help aria-label="Payment help">?</button></div>
          <p>Shipping charge is mandatory for every order. Attach your payment screenshot/image/PDF after paying the shipping charge.</p>
          <input id="paymentProofFile" type="file" accept="image/*,.pdf" required>
          <small>Shipping charge: Inside Dhaka ৳70, Outside Dhaka ৳150. Maximum file size: 5 MB.</small>
        </div>
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
      <div class="checkout-summary__row"><span>Shipping Charge</span><strong>${amounts.shippingCharge ? formatCheckoutMoney(amounts.shippingCharge) : amounts.shippingLabel}</strong></div>
      <div class="checkout-summary__row checkout-summary__total"><span>Grand Total</span><strong>${formatCheckoutMoney(amounts.grandTotal)}</strong></div>
      <div class="checkout-summary__row"><span>Pay Now</span><strong>${formatCheckoutMoney(amounts.paidAmount)}</strong></div>
      <div class="checkout-summary__row"><span>Due on Delivery</span><strong>${formatCheckoutMoney(amounts.dueAmount)}</strong></div>
    </div>
    <small class="shipping-note">Shipping payment proof is required for all checkout methods, including Cash on Delivery.</small>`;
}

function openCheckout(items) {
  loadCheckoutCss();
  setCheckoutButtonLabel();
  checkoutItems = items.filter(Boolean);
  checkoutSubtotal = checkoutItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);
  if (!checkoutItems.length) {
    alert("Your cart is empty. Please add a product first.");
    return;
  }
  const modal = ensureCheckoutModal();
  renderCheckoutSummary();
  updatePaymentProofVisibility();
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

function updatePaymentProofVisibility() {
  const proofBox = document.getElementById("paymentProofBox");
  const proofInput = document.getElementById("paymentProofFile");
  if (proofBox) proofBox.hidden = false;
  if (proofInput) proofInput.required = true;
  renderCheckoutSummary();
}

function readPaymentProofFile() {
  const file = document.getElementById("paymentProofFile")?.files?.[0];
  if (!file) return Promise.reject(new Error("Please attach your shipping/payment proof screenshot or document."));
  if (file.size > MAX_PAYMENT_FILE_SIZE) return Promise.reject(new Error("Payment file is too large. Maximum size is 5 MB."));

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      resolve({
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        data: dataUrl.split(",")[1] || ""
      });
    };
    reader.onerror = () => reject(new Error("Payment file could not be read."));
    reader.readAsDataURL(file);
  });
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
  const note = document.getElementById("checkoutNote")?.value.trim() || "";
  const amounts = calculateCheckoutAmounts();
  const itemsText = checkoutItems.map(item => `${item.name} x ${item.qty} = ${formatCheckoutMoney(item.lineTotal)}`).join(", ");
  const finalNote = [
    `Shipping zone: ${shippingOption ? shippingOption.label : ""}`,
    `Shipping charge paid: ${amounts.shippingCharge ? formatCheckoutMoney(amounts.shippingCharge) : ""}`,
    note ? `Customer note: ${note}` : ""
  ].filter(Boolean).join(" | ");
  const paymentProof = await readPaymentProofFile();

  return {
    orderId: generateClientOrderId(),
    action: "create",
    customerName: name,
    phone,
    customerEmail: email,
    email,
    status: "Pending",
    statusBn: "অর্ডার গ্রহণ করা হয়েছে",
    items: itemsText,
    subtotal: checkoutSubtotal,
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
    paymentProof
  };
}

function submitOrderByHiddenForm(payload) {
  return new Promise(resolve => {
    const frameName = `hbOrderFrame${Date.now()}`;
    const iframe = document.createElement("iframe");
    iframe.name = frameName;
    iframe.style.display = "none";
    const form = document.createElement("form");
    form.method = "POST";
    form.action = ORDER_CREATE_WEB_APP_URL;
    form.target = frameName;
    form.style.display = "none";
    const field = document.createElement("textarea");
    field.name = "payload";
    field.value = JSON.stringify(payload);
    form.appendChild(field);
    document.body.appendChild(iframe);
    document.body.appendChild(form);
    form.submit();
    window.setTimeout(() => {
      form.remove();
      window.setTimeout(() => iframe.remove(), 8000);
      resolve({ success: true, orderId: payload.orderId, receiptLink: "" });
    }, 3000);
  });
}

async function submitOrderToSheet(payload) {
  try {
    const response = await fetch(ORDER_CREATE_WEB_APP_URL, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error("Order submission failed.");
    return await response.json();
  } catch (error) {
    console.warn("Fetch submission failed; using form submission fallback.", error);
    return submitOrderByHiddenForm(payload);
  }
}

function renderCheckoutSuccess(orderId, phone, receiptLink) {
  const modal = ensureCheckoutModal();
  const dialog = modal.querySelector(".checkout-modal__dialog");
  const message = `Hello HB Gadget BD, I placed order ${orderId}. Please confirm delivery charge and availability.`;
  dialog.innerHTML = `<div class="checkout-success-card"><h3>Order submitted successfully!</h3><p>Your Order ID is <strong>${safeText(orderId)}</strong>.</p><p>Please save this Order ID and your phone number to track the delivery status. An invoice email will be sent after Google Sheet processing is complete.</p><div class="order-meta-grid"><div><small>Order ID</small><strong>${safeText(orderId)}</strong></div><div><small>Phone</small><strong>${safeText(phone)}</strong></div></div>${receiptLink ? `<p><a href="${safeText(receiptLink)}" target="_blank" rel="noreferrer">View invoice</a></p>` : ""}<div class="checkout-actions"><a href="https://wa.me/${ORDER_CREATE_SUPPORT_NUMBER}?text=${encodeURIComponent(message)}" target="_blank" rel="noreferrer">Confirm on WhatsApp</a><button type="button" data-checkout-close>Close</button></div></div>`;
}

async function handleCheckoutSubmit(event) {
  if (event.target?.id !== "checkoutForm") return;
  event.preventDefault();
  const status = document.getElementById("checkoutStatus");
  const submit = event.target.querySelector("button[type='submit']");
  if (status) status.textContent = "Submitting your order... Please do not close this window.";
  if (submit) submit.disabled = true;

  try {
    const payload = await buildOrderPayload();
    if (!payload.customerName || !payload.phone || !payload.customerEmail || !payload.deliveryArea || !payload.address || !payload.shippingZone) {
      throw new Error("Please fill in all required fields, including shipping location.");
    }
    if (!payload.paymentProof) {
      throw new Error("Please attach your shipping/payment proof.");
    }
    const result = await submitOrderToSheet(payload);
    if (!result.success) throw new Error(result.message || "Order could not be saved.");
    document.getElementById("clearCart")?.click();
    renderCheckoutSuccess(result.orderId || payload.orderId, payload.phone, result.receiptLink || "");
  } catch (error) {
    console.error(error);
    if (status) status.textContent = error.message || "Order could not be submitted automatically. Please contact WhatsApp support.";
  } finally {
    if (submit) submit.disabled = false;
  }
}

function showPaymentHelp() {
  alert("Payment help:\n\n1. Select your shipping location first:\n   • Inside Dhaka: ৳70\n   • Outside Dhaka: ৳150\n\n2. Shipping charge must be paid before checkout for every order, including Cash on Delivery.\n\n3. For Cash on Delivery, pay only the shipping charge now. Product price will be due on delivery.\n\n4. For Bkash/Nagad or bank transfer before delivery, pay the full total if confirmed by HB Gadget BD.\n\n5. Upload your payment screenshot/image/PDF before final checkout.\n\nFor payment details, contact WhatsApp/Hotline: +8801816569237");
}

function wireOrderPlacement() {
  if (window.__hbOrderPlacementWired) return;
  window.__hbOrderPlacementWired = true;
  loadCheckoutCss();
  setCheckoutButtonLabel();
  window.addEventListener("storage", event => { if (event.key === "hbGadgetCart" && typeof renderCart === "function") renderCart(); });
  document.addEventListener("change", event => {
    if (event.target?.id === "checkoutPayment" || event.target?.id === "checkoutShippingZone") updatePaymentProofVisibility();
  });
  document.addEventListener("click", event => {
    if (event.target.closest("[data-payment-help]")) { showPaymentHelp(); return; }
    if (event.target.closest("[data-checkout-close]")) { closeCheckout(); return; }
    const cartCheckout = event.target.closest("#whatsappOrder");
    if (cartCheckout) { event.preventDefault(); openCheckout(getCartCheckoutItems()); return; }
    const orderNow = event.target.closest(".order-now");
    if (orderNow) { event.preventDefault(); event.stopImmediatePropagation(); const item = getDirectCheckoutItem(orderNow); openCheckout(item ? [item] : getCartCheckoutItems()); }
  }, true);
  document.addEventListener("submit", handleCheckoutSubmit, true);
  document.addEventListener("keydown", event => { if (event.key === "Escape") closeCheckout(); });
  setInterval(setCheckoutButtonLabel, 1000);
}

document.addEventListener("DOMContentLoaded", wireOrderPlacement);
wireOrderPlacement();
