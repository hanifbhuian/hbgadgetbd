const ORDER_DATA_URL = "assets/data/orders.json";
const ORDER_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyTm7rIja7hfGy_BjKfDol425tTHbWYTkZyQIty6uerr2spZGeKouxFFInTsJt2K9_5/exec";
const ORDER_SUPPORT_NUMBER = "8801816569237";

function loadOrderTrackingCss() {
  if (document.querySelector("link[href*='order-tracking.css']")) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "assets/css/order-tracking.css?v=20260704-6";
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

function getOrderField(order, keys, fallback = "") {
  for (const key of keys) {
    if (order && order[key] !== undefined && order[key] !== null && order[key] !== "") return order[key];
  }
  return fallback;
}

function getOrderItems(order) {
  const items = getOrderField(order, ["items", "item", "products"], []);
  if (Array.isArray(items)) return items;
  return String(items || "").split(/,|\n/).map(item => item.trim()).filter(Boolean);
}

function getOrderTimeline(order) {
  if (Array.isArray(order.timeline)) return order.timeline;
  const status = getOrderField(order, ["status"], "Processing");
  const statusBn = getOrderField(order, ["statusBn", "banglaStatus"], "প্রসেসিং");
  const lastUpdated = getOrderField(order, ["lastUpdated"], "Pending");
  return [
    { step: "Order Received", stepBn: "অর্ডার গ্রহণ করা হয়েছে", done: true, time: getOrderField(order, ["orderDate"], "" ) },
    { step: status, stepBn: statusBn, done: true, time: lastUpdated },
    { step: "Delivered", stepBn: "ডেলিভারি সম্পন্ন", done: String(status).toLowerCase() === "delivered", time: String(status).toLowerCase() === "delivered" ? lastUpdated : "Pending" }
  ];
}

function enhanceTrackOrderForm() {
  const form = document.getElementById("trackOrderForm");
  if (!form || form.dataset.trackingReady === "true") return false;

  const orderInput = document.getElementById("trackOrderInput");
  const result = document.getElementById("trackOrderResult");
  if (!orderInput || !result) return false;

  orderInput.placeholder = "Order ID, e.g. HBG-1001";
  orderInput.autocomplete = "off";

  if (!document.getElementById("trackPhoneInput")) {
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
    help.textContent = "Enter the Order ID and phone number used when placing the order.";
    phoneInput.insertAdjacentElement("afterend", help);
  }

  form.dataset.trackingReady = "true";
  return true;
}

async function fetchOrderFromGoogleSheet(orderId, phone) {
  const url = new URL(ORDER_WEB_APP_URL);
  url.searchParams.set("action", "track");
  url.searchParams.set("orderId", orderId);
  url.searchParams.set("phone", phone);
  url.searchParams.set("v", Date.now());

  const response = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  if (!response.ok) throw new Error("Google Sheet order data could not be loaded.");
  const data = await response.json();
  if (!data.success) return null;
  return data.order || null;
}

async function fetchOrderFromLocalFile(orderId, phone) {
  const response = await fetch(`${ORDER_DATA_URL}?v=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Local order data could not be loaded.");
  const data = await response.json();
  const orders = Array.isArray(data.orders) ? data.orders : [];
  return orders.find(order => normalizeValue(order.orderId) === normalizeValue(orderId) && normalizePhone(order.phone) === normalizePhone(phone)) || null;
}

async function findOrder(orderId, phone) {
  try {
    const googleOrder = await fetchOrderFromGoogleSheet(orderId, phone);
    if (googleOrder) return googleOrder;
  } catch (error) {
    console.warn("Google Sheet tracking failed. Trying local fallback.", error);
  }

  return fetchOrderFromLocalFile(orderId, phone);
}

function renderOrder(order) {
  const orderId = getOrderField(order, ["orderId", "orderID"], "Unknown");
  const status = getOrderField(order, ["status"], "Processing");
  const statusBn = getOrderField(order, ["statusBn", "banglaStatus"], "প্রসেসিং");
  const timeline = getOrderTimeline(order);
  const items = getOrderItems(order);
  const supportMessage = `Hello HB Gadget BD, I need an update for order ${orderId}.`;

  return `
    <div class="order-result-card">
      <span class="order-status-badge">● ${status} / ${statusBn}</span>
      <h3>Order ${orderId}</h3>
      <p>${getOrderField(order, ["note"], "Your order information is shown below.")}</p>
      <div class="order-meta-grid">
        <div><small>Customer</small><strong>${getOrderField(order, ["customerName"], "Customer")}</strong></div>
        <div><small>Last Updated</small><strong>${getOrderField(order, ["lastUpdated"], "Not updated")}</strong></div>
        <div><small>Payment</small><strong>${getOrderField(order, ["paymentMethod"], "To be confirmed")}</strong></div>
        <div><small>Subtotal</small><strong>${formatOrderMoney(getOrderField(order, ["subtotal"]))}</strong></div>
        <div><small>Delivery Charge</small><strong>${formatOrderMoney(getOrderField(order, ["deliveryCharge"]))}</strong></div>
        <div><small>Delivery Area</small><strong>${getOrderField(order, ["deliveryArea"], "To be confirmed")}</strong></div>
        <div><small>Courier</small><strong>${getOrderField(order, ["courier"], "Not assigned")}</strong></div>
        <div><small>Tracking No.</small><strong>${getOrderField(order, ["trackingNumber"], "Pending")}</strong></div>
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
    const match = await findOrder(orderId, phone);

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
