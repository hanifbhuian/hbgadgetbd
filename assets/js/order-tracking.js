const ORDER_DATA_URL = "assets/data/orders.json";
const ORDER_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzva7OB4SqKgN51v66okHgb8LdiAmzJuEjVixpvs_gL4f0L6fRrqRnxbx-yDYWaSxtjnw/exec";
const ORDER_SUPPORT_NUMBER = "8801816569237";

const ORDER_STATUS_FLOW = [
  { key: "pending", label: "Order Received", bn: "অর্ডার গ্রহণ করা হয়েছে" },
  { key: "confirmed", label: "Confirmed", bn: "অর্ডার কনফার্ম হয়েছে" },
  { key: "processing", label: "Processing", bn: "অর্ডার প্রস্তুত করা হচ্ছে" },
  { key: "shipped", label: "Shipped", bn: "অর্ডার কুরিয়ারে পাঠানো হয়েছে" },
  { key: "delivered", label: "Delivered", bn: "অর্ডার ডেলিভারি সম্পন্ন হয়েছে" }
];

const ORDER_STATUS_MAP = {
  pending: { label: "Pending", bn: "অর্ডার গ্রহণ করা হয়েছে", level: 0 },
  confirmed: { label: "Confirmed", bn: "অর্ডার কনফার্ম হয়েছে", level: 1 },
  processing: { label: "Processing", bn: "অর্ডার প্রস্তুত করা হচ্ছে", level: 2 },
  shipped: { label: "Shipped", bn: "অর্ডার কুরিয়ারে পাঠানো হয়েছে", level: 3 },
  delivered: { label: "Delivered", bn: "অর্ডার ডেলিভারি সম্পন্ন হয়েছে", level: 4 },
  cancelled: { label: "Cancelled", bn: "অর্ডার বাতিল করা হয়েছে", level: -1 }
};

function loadOrderTrackingCss() {
  if (document.querySelector("link[href*='order-tracking.css']")) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "assets/css/order-tracking.css?v=20260710-1";
  document.head.appendChild(link);
}

function normalizeOrderId(value) {
  return String(value || "").replace(/[^0-9]/g, "");
}

function displayOrderId(value) {
  const numeric = normalizeOrderId(value);
  return numeric || String(value || "").trim() || "Unknown";
}

function normalizeStatus(value) {
  const status = String(value || "pending").trim().toLowerCase();
  if (status.includes("cancel")) return "cancelled";
  if (status.includes("deliver")) return "delivered";
  if (status.includes("ship") || status.includes("courier")) return "shipped";
  if (status.includes("process") || status.includes("prepar")) return "processing";
  if (status.includes("confirm")) return "confirmed";
  if (status.includes("pending") || status.includes("received") || status.includes("receive")) return "pending";
  return "pending";
}

function getStatusInfo(order) {
  const rawStatus = getOrderField(order, ["status"], "Pending");
  const key = normalizeStatus(rawStatus);
  return ORDER_STATUS_MAP[key] || ORDER_STATUS_MAP.pending;
}

function formatOrderMoney(value) {
  if (value === undefined || value === null || value === "") return "To be confirmed";
  if (Number.isNaN(Number(value))) return String(value);
  return `৳${Number(value).toLocaleString("en-BD")}`;
}

function formatTrackingTime(value) {
  if (!value || value === "Pending") return "Pending";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-BD", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function safeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getOrderField(order, keys, fallback = "") {
  for (const key of keys) {
    if (order && order[key] !== undefined && order[key] !== null && order[key] !== "") return order[key];
  }
  return fallback;
}

function getCancelReason(order) {
  return getOrderField(order, ["cancelReason", "cancellationReason", "cancelNote", "cancelledReason", "reasonForCancellation"], "");
}

function getOrderItems(order) {
  const items = getOrderField(order, ["items", "item", "products"], []);
  if (Array.isArray(items)) return items;
  return String(items || "").split(/,|\n/).map(item => item.trim()).filter(Boolean);
}

function getOrderTimeline(order) {
  if (Array.isArray(order.timeline)) return order.timeline;

  const statusInfo = getStatusInfo(order);
  const orderDate = formatTrackingTime(getOrderField(order, ["orderDate"], ""));
  const lastUpdated = formatTrackingTime(getOrderField(order, ["lastUpdated"], ""));

  if (statusInfo.label === "Cancelled") {
    return [
      { step: "Order Received", stepBn: ORDER_STATUS_MAP.pending.bn, done: true, time: orderDate },
      { step: "Cancelled", stepBn: ORDER_STATUS_MAP.cancelled.bn, done: true, time: lastUpdated }
    ];
  }

  return ORDER_STATUS_FLOW.map((step, index) => ({
    step: step.label,
    stepBn: step.bn,
    done: index <= statusInfo.level,
    time: index === 0 ? orderDate : (index <= statusInfo.level ? lastUpdated : "Pending")
  }));
}

function enhanceTrackOrderForm() {
  const form = document.getElementById("trackOrderForm");
  if (!form) return false;
  const orderInput = document.getElementById("trackOrderInput");
  const result = document.getElementById("trackOrderResult");
  if (!orderInput || !result) return false;

  orderInput.placeholder = "Enter Order ID, e.g. 1001";
  orderInput.autocomplete = "off";
  orderInput.inputMode = "numeric";
  orderInput.pattern = "[0-9]*";
  orderInput.required = true;

  const oldPhoneInput = document.getElementById("trackPhoneInput");
  if (oldPhoneInput) oldPhoneInput.remove();

  Array.from(form.querySelectorAll(".track-order-help")).forEach(help => help.remove());

  if (!document.getElementById("trackOrderOnlyHelp")) {
    const help = document.createElement("p");
    help.id = "trackOrderOnlyHelp";
    help.className = "track-order-help";
    help.textContent = "Enter only your numeric Order ID. Phone number is not required.";
    orderInput.insertAdjacentElement("afterend", help);
  }

  form.dataset.trackingReady = "true";
  return true;
}

async function fetchOrderFromGoogleSheet(orderId) {
  const numericOrderId = normalizeOrderId(orderId);
  const url = new URL(ORDER_WEB_APP_URL);
  url.searchParams.set("action", "track");
  url.searchParams.set("orderId", numericOrderId);
  url.searchParams.set("v", Date.now());

  const response = await fetch(url.toString(), { method: "GET", cache: "no-store" });
  if (!response.ok) throw new Error("Google Sheet order data could not be loaded.");
  const data = await response.json();
  if (!data.success) return null;
  return data.order || null;
}

async function fetchOrderFromLocalFile(orderId) {
  const numericOrderId = normalizeOrderId(orderId);
  const response = await fetch(`${ORDER_DATA_URL}?v=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Local order data could not be loaded.");
  const data = await response.json();
  const orders = Array.isArray(data.orders) ? data.orders : [];
  return orders.find(order => normalizeOrderId(order.orderId || order.orderID) === numericOrderId) || null;
}

async function findOrder(orderId) {
  try {
    const googleOrder = await fetchOrderFromGoogleSheet(orderId);
    if (googleOrder) return googleOrder;
  } catch (error) {
    console.warn("Google Sheet tracking failed. Trying local fallback.", error);
  }
  return fetchOrderFromLocalFile(orderId);
}

function renderOrder(order) {
  const orderId = displayOrderId(getOrderField(order, ["orderId", "orderID"], "Unknown"));
  const statusInfo = getStatusInfo(order);
  const timeline = getOrderTimeline(order);
  const items = getOrderItems(order);
  const cancelReason = getCancelReason(order);
  const isCancelled = statusInfo.label === "Cancelled";
  const supportMessage = `Hello HB Gadget BD, I need an update for order ${orderId}.`;

  return `
    <div class="order-result-card ${isCancelled ? "is-cancelled" : ""}">
      <span class="order-status-badge ${isCancelled ? "is-cancelled" : ""}">● ${statusInfo.label} / ${statusInfo.bn}</span>
      <h3>Order ${safeHtml(orderId)}</h3>
      <p>${safeHtml(getOrderField(order, ["note"], "Your order information is shown below."))}</p>
      ${isCancelled ? `<div class="cancel-reason-box"><strong>Cancellation Reason</strong><p>${safeHtml(cancelReason || "No cancellation reason has been added yet. Please contact support for details.")}</p></div>` : ""}
      <div class="order-meta-grid">
        <div><small>Customer</small><strong>${safeHtml(getOrderField(order, ["customerName"], "Customer"))}</strong></div>
        <div><small>Last Updated</small><strong>${safeHtml(formatTrackingTime(getOrderField(order, ["lastUpdated"], "Not updated")))}</strong></div>
        <div><small>Payment</small><strong>${safeHtml(getOrderField(order, ["paymentMethod"], "To be confirmed"))}</strong></div>
        <div><small>Subtotal</small><strong>${safeHtml(formatOrderMoney(getOrderField(order, ["subtotal"])))}</strong></div>
        <div><small>Delivery Charge</small><strong>${safeHtml(formatOrderMoney(getOrderField(order, ["deliveryCharge"])))}</strong></div>
        <div><small>Delivery Area</small><strong>${safeHtml(getOrderField(order, ["deliveryArea"], "To be confirmed"))}</strong></div>
        <div><small>Courier</small><strong>${safeHtml(getOrderField(order, ["courier"], "Not assigned"))}</strong></div>
        <div><small>Tracking No.</small><strong>${safeHtml(getOrderField(order, ["trackingNumber"], "Pending"))}</strong></div>
      </div>
      <h4>Items</h4>
      <ul class="order-items">${items.map(item => `<li>${safeHtml(item)}</li>`).join("") || "<li>Product details will be confirmed soon.</li>"}</ul>
      <h4>Order Timeline</h4>
      <div class="order-timeline">
        ${timeline.map(step => `
          <div class="order-timeline-step ${step.done ? "is-done" : ""} ${step.step === "Cancelled" ? "is-cancelled" : ""}">
            <span class="order-timeline-dot">${step.done ? "✓" : "•"}</span>
            <div><strong>${safeHtml(step.step || "Update")}</strong><small>${safeHtml(step.stepBn || "")} ${step.time ? `• ${safeHtml(step.time)}` : ""}</small></div>
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
      <p>${safeHtml(message)}</p>
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
  const result = document.getElementById("trackOrderResult");
  if (!result) return;

  if (!normalizeOrderId(orderId)) {
    result.innerHTML = renderOrderError("Please enter your numeric Order ID.");
    return;
  }

  result.innerHTML = `<div class="order-result-card"><p>Checking order status...</p></div>`;

  try {
    const match = await findOrder(orderId);
    if (!match) {
      result.innerHTML = renderOrderError("Please check your Order ID. If the order was placed recently, contact support for a live update.");
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
