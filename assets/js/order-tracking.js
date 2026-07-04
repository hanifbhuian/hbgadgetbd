const ORDER_DATA_URL = "assets/data/orders.json";
const ORDER_SUPPORT_NUMBER = "8801816569237";

function loadOrderTrackingCss() {
  if (document.querySelector("link[href*='order-tracking.css']")) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "assets/css/order-tracking.css?v=20260704-5";
  document.head.appendChild(link);
}

function normalizeValue(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizePhone(value) {
  let phone = String(value || "").replace(/[^0-9]/g, "");
  if (phone.startsWith("880")) phone = phone.slice(3);
  if (phone.startsWith("0")) phone = phone.slice(1);
  return phone;
}

function formatOrderMoney(value) {
  if (value === undefined || value === null || value === "") return "To be confirmed";
  if (Number.isNaN(Number(value))) return String(value);
  return `৳${Number(value).toLocaleString("en-BD")}`;
}

function enhanceTrackOrderForm() {
  const form = document.getElementById("trackOrderForm");
  if (!form || form.dataset.trackingReady === "true") return false;

  const orderInput = document.getElementById("trackOrderInput");
  const result = document.getElementById("trackOrderResult");
  if (!orderInput || !result) return false;

  orderInput.placeholder = "Order ID, e.g. HBG-1001";
  orderInput.autocomplete = "off";

  const phoneInput = document.createElement("input");
  phoneInput.id = "trackPhoneInput";
  phoneInput.className = "phone-field";
  phoneInput.type = "tel";
  phoneInput.placeholder = "Phone number, e.g. 01800000000";
  phoneInput.autocomplete = "tel";
  phoneInput.required = true;
  orderInput.insertAdjacentElement("afterend", phoneInput);

  const help = document.createElement("p");
  help.className = "track-order-help";
  help.textContent = "For testing: use HBG-1001 with 01800000000 or HBG-1002 with 01900000000.";
  phoneInput.insertAdjacentElement("afterend", help);

  form.dataset.trackingReady = "true";
  return true;
}

async function fetchOrders() {
  const response = await fetch(`${ORDER_DATA_URL}?v=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Order data could not be loaded.");
  const data = await response.json();
  return Array.isArray(data.orders) ? data.orders : [];
}

function renderOrder(order) {
  const timeline = Array.isArray(order.timeline) ? order.timeline : [];
  const items = Array.isArray(order.items) ? order.items : [];
  const supportMessage = `Hello HB Gadget BD, I need an update for order ${order.orderId}.`;

  return `
    <div class="order-result-card">
      <span class="order-status-badge">● ${order.status || "Processing"} / ${order.statusBn || "প্রসেসিং"}</span>
      <h3>Order ${order.orderId}</h3>
      <p>${order.note || "Your order information is shown below."}</p>
      <div class="order-meta-grid">
        <div><small>Customer</small><strong>${order.customerName || "Customer"}</strong></div>
        <div><small>Last Updated</small><strong>${order.lastUpdated || "Not updated"}</strong></div>
        <div><small>Payment</small><strong>${order.paymentMethod || "To be confirmed"}</strong></div>
        <div><small>Subtotal</small><strong>${formatOrderMoney(order.subtotal)}</strong></div>
        <div><small>Delivery Charge</small><strong>${formatOrderMoney(order.deliveryCharge)}</strong></div>
        <div><small>Delivery Area</small><strong>${order.deliveryArea || "To be confirmed"}</strong></div>
        <div><small>Courier</small><strong>${order.courier || "Not assigned"}</strong></div>
        <div><small>Tracking No.</small><strong>${order.trackingNumber || "Pending"}</strong></div>
      </div>
      <h4>Items</h4>
      <ul class="order-items">${items.map(item => `<li>${item}</li>`).join("") || "<li>Product details will be confirmed soon.</li>"}</ul>
      <h4>Order Timeline</h4>
      <div class="order-timeline">
        ${timeline.map(step => `
          <div class="order-timeline-step ${step.done ? "is-done" : ""}">
            <span class="order-timeline-dot">${step.done ? "✓" : "•"}</span>
            <div><strong>${step.step || "Update"}</strong><small>${step.stepBn || ""} ${step.time ? `• ${step.time}` : ""}</small></div>
          </div>
        `).join("")}
      </div>
      <div class="order-support-actions">
        <a href="https://wa.me/${ORDER_SUPPORT_NUMBER}?text=${encodeURIComponent(supportMessage)}" target="_blank" rel="noreferrer">Ask on WhatsApp</a>
        <a href="tel:+8801816569237">Call Hotline</a>
      </div>
    </div>
  `;
}

function renderOrderError(message) {
  return `
    <div class="order-result-card is-error">
      <h3>Order not found</h3>
      <p>${message}</p>
      <div class="order-support-actions">
        <a href="https://wa.me/${ORDER_SUPPORT_NUMBER}?text=${encodeURIComponent("Hello HB Gadget BD, I need help tracking my order.")}" target="_blank" rel="noreferrer">Contact WhatsApp Support</a>
        <a href="tel:+8801816569237">Call Hotline</a>
      </div>
    </div>
  `;
}

async function handleTrackOrderSubmit(event) {
  if (event.target?.id !== "trackOrderForm") return;
  event.preventDefault();
  event.stopImmediatePropagation();

  const orderId = document.getElementById("trackOrderInput")?.value || "";
  const phone = document.getElementById("trackPhoneInput")?.value || "";
  const result = document.getElementById("trackOrderResult");
  if (!result) return;

  if (!orderId.trim() || !phone.trim()) {
    result.innerHTML = renderOrderError("Please enter both Order ID and phone number.");
    return;
  }

  result.innerHTML = `<div class="order-result-card"><p>Checking order status...</p></div>`;

  try {
    const orders = await fetchOrders();
    const match = orders.find(order => normalizeValue(order.orderId) === normalizeValue(orderId) && normalizePhone(order.phone) === normalizePhone(phone));

    if (!match) {
      result.innerHTML = renderOrderError("Please check your Order ID and phone number. If the order was placed recently, contact support for a live update.");
      return;
    }

    result.innerHTML = renderOrder(match);
  } catch (error) {
    console.error(error);
    result.innerHTML = renderOrderError("Tracking data is not available right now. Please contact support for the latest update.");
  }
}

function initOrderTracking() {
  loadOrderTrackingCss();
  enhanceTrackOrderForm();
  document.addEventListener("submit", handleTrackOrderSubmit, true);
}

function waitForTrackForm() {
  if (enhanceTrackOrderForm()) return;
  const observer = new MutationObserver(() => {
    if (enhanceTrackOrderForm()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

document.addEventListener("DOMContentLoaded", () => {
  initOrderTracking();
  waitForTrackForm();
});

initOrderTracking();
waitForTrackForm();
