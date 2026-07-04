const ORDER_CREATE_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyTm7rIja7hfGy_BjKfDol425tTHbWYTkZyQIty6uerr2spZGeKouxFFInTsJt2K9_5/exec";
const ORDER_CREATE_SUPPORT_NUMBER = "8801816569237";
let checkoutItems = [];
let checkoutSubtotal = 0;

function loadCheckoutCss() {
  if (document.querySelector("link[href*='order-placement.css']")) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "assets/css/order-placement.css?v=20260704-7";
  document.head.appendChild(link);
}

function formatCheckoutMoney(value) {
  return `৳${Number(value || 0).toLocaleString("en-BD")}`;
}

function safeText(value) {
  return String(value || "").replace(/[<>]/g, "");
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
        <div>
          <p class="eyebrow">Place Order | অর্ডার করুন</p>
          <h2>Confirm your order information</h2>
        </div>
        <button class="checkout-close" type="button" data-checkout-close aria-label="Close checkout">×</button>
      </div>
      <div class="checkout-summary" id="checkoutSummary"></div>
      <form class="checkout-form" id="checkoutForm">
        <div class="checkout-form__grid">
          <label><span>Customer Name *</span><input id="checkoutName" name="customerName" type="text" placeholder="Your full name" required></label>
          <label><span>Phone Number *</span><input id="checkoutPhone" name="phone" type="tel" placeholder="01800000000" required></label>
        </div>
        <div class="checkout-form__grid">
          <label><span>Delivery Area *</span><input id="checkoutArea" name="deliveryArea" type="text" placeholder="Dhaka / Chattogram / etc." required></label>
          <label><span>Payment Method</span><select id="checkoutPayment" name="paymentMethod"><option value="Cash on Delivery">Cash on Delivery</option><option value="Bkash/Nagad before delivery">Bkash/Nagad before delivery</option></select></label>
        </div>
        <label><span>Full Delivery Address *</span><textarea id="checkoutAddress" name="address" placeholder="House, road, area, district" required></textarea></label>
        <label><span>Order Note</span><textarea id="checkoutNote" name="note" placeholder="Color, size, preferred delivery time, or other note"></textarea></label>
        <p class="checkout-status" id="checkoutStatus" aria-live="polite"></p>
        <button class="button button--primary button--full" type="submit">Finalize Order</button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function renderCheckoutSummary() {
  const summary = document.getElementById("checkoutSummary");
  if (!summary) return;
  const list = checkoutItems.map(item => `<li>${safeText(item.name)} × ${item.qty} = ${formatCheckoutMoney(item.lineTotal)}</li>`).join("");
  summary.innerHTML = `<h3>Order Summary</h3><ul>${list}</ul><strong>Subtotal: ${formatCheckoutMoney(checkoutSubtotal)}</strong><small>Delivery charge will be confirmed before final delivery.</small>`;
}

function openCheckout(items) {
  loadCheckoutCss();
  checkoutItems = items.filter(Boolean);
  checkoutSubtotal = checkoutItems.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0);

  if (!checkoutItems.length) {
    alert("Your cart is empty. Please add a product first.");
    return;
  }

  const modal = ensureCheckoutModal();
  renderCheckoutSummary();
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

function buildOrderPayload() {
  const name = document.getElementById("checkoutName")?.value.trim() || "";
  const phone = document.getElementById("checkoutPhone")?.value.trim() || "";
  const area = document.getElementById("checkoutArea")?.value.trim() || "";
  const payment = document.getElementById("checkoutPayment")?.value || "Cash on Delivery";
  const address = document.getElementById("checkoutAddress")?.value.trim() || "";
  const note = document.getElementById("checkoutNote")?.value.trim() || "";
  const itemsText = checkoutItems.map(item => `${item.name} x ${item.qty} = ${formatCheckoutMoney(item.lineTotal)}`).join(", ");
  const finalNote = [`Address: ${address}`, note ? `Customer note: ${note}` : ""].filter(Boolean).join(" | ");

  return {
    action: "create",
    customerName: name,
    phone,
    status: "Pending",
    statusBn: "অর্ডার গ্রহণ করা হয়েছে",
    items: itemsText,
    subtotal: checkoutSubtotal,
    deliveryCharge: "To be confirmed",
    paymentMethod: payment,
    deliveryArea: area,
    courier: "Not assigned yet",
    trackingNumber: "Pending",
    note: finalNote
  };
}

async function submitOrderToSheet(payload) {
  const response = await fetch(ORDER_CREATE_WEB_APP_URL, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error("Order submission failed.");
  return response.json();
}

function renderCheckoutSuccess(orderId, phone) {
  const modal = ensureCheckoutModal();
  const dialog = modal.querySelector(".checkout-modal__dialog");
  const message = `Hello HB Gadget BD, I placed order ${orderId}. Please confirm delivery charge and availability.`;
  dialog.innerHTML = `
    <div class="checkout-success-card">
      <h3>Order placed successfully!</h3>
      <p>Your Order ID is <strong>${safeText(orderId)}</strong>.</p>
      <p>Please save this Order ID and your phone number to track the delivery status.</p>
      <div class="order-meta-grid">
        <div><small>Order ID</small><strong>${safeText(orderId)}</strong></div>
        <div><small>Phone</small><strong>${safeText(phone)}</strong></div>
      </div>
      <div class="checkout-actions">
        <a href="https://wa.me/${ORDER_CREATE_SUPPORT_NUMBER}?text=${encodeURIComponent(message)}" target="_blank" rel="noreferrer">Confirm on WhatsApp</a>
        <button type="button" data-checkout-close>Close</button>
      </div>
    </div>
  `;
}

async function handleCheckoutSubmit(event) {
  if (event.target?.id !== "checkoutForm") return;
  event.preventDefault();
  const status = document.getElementById("checkoutStatus");
  const submit = event.target.querySelector("button[type='submit']");

  const payload = buildOrderPayload();
  if (!payload.customerName || !payload.phone || !payload.deliveryArea || !payload.note.includes("Address:")) {
    if (status) status.textContent = "Please fill in all required fields.";
    return;
  }

  if (status) status.textContent = "Submitting your order...";
  if (submit) submit.disabled = true;

  try {
    const result = await submitOrderToSheet(payload);
    if (!result.success) throw new Error(result.message || "Order could not be saved.");
    document.getElementById("clearCart")?.click();
    renderCheckoutSuccess(result.orderId || "Pending", payload.phone);
  } catch (error) {
    console.error(error);
    if (status) status.textContent = "Order could not be submitted automatically. Please contact WhatsApp support.";
  } finally {
    if (submit) submit.disabled = false;
  }
}

function wireOrderPlacement() {
  loadCheckoutCss();

  document.addEventListener("click", event => {
    if (event.target.closest("[data-checkout-close]")) {
      closeCheckout();
      return;
    }

    const cartCheckout = event.target.closest("#whatsappOrder");
    if (cartCheckout) {
      event.preventDefault();
      openCheckout(getCartCheckoutItems());
      return;
    }

    const orderNow = event.target.closest(".order-now");
    if (orderNow) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const item = getDirectCheckoutItem(orderNow);
      openCheckout(item ? [item] : getCartCheckoutItems());
    }
  }, true);

  document.addEventListener("submit", handleCheckoutSubmit, true);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeCheckout();
  });
}

document.addEventListener("DOMContentLoaded", wireOrderPlacement);
wireOrderPlacement();
