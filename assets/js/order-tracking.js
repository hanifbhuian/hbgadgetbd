// Same-origin Cloudflare Pages API reads the Google Sheet via Apps Script.
const ORDER_TRACKING_API = "/api/orders/track";
const ORDER_SUPPORT_NUMBER = "8801816569237";

const ORDER_STATUS_FLOW = [
  { key: "pending", label: "Order Received", bn: "অর্ডার গ্রহণ করা হয়েছে" },
  { key: "confirmed", label: "Confirmed", bn: "অর্ডার কনফার্ম হয়েছে" },
  { key: "processing", label: "Processing", bn: "অর্ডার প্রস্তুত করা হচ্ছে" },
  { key: "packed", label: "Packed", bn: "প্যাক করা হয়েছে" },
  { key: "shipped", label: "Shipped", bn: "কুরিয়ারে পাঠানো হয়েছে" },
  { key: "out-for-delivery", label: "Out for Delivery", bn: "ডেলিভারির জন্য বের হয়েছে" },
  { key: "delivered", label: "Delivered", bn: "ডেলিভারি সম্পন্ন হয়েছে" }
];
const ORDER_STATUS_MAP = {
  pending: { label: "Pending", bn: "অর্ডার গ্রহণ করা হয়েছে", level: 0 },
  confirmed: { label: "Confirmed", bn: "অর্ডার কনফার্ম হয়েছে", level: 1 },
  processing: { label: "Processing", bn: "অর্ডার প্রস্তুত করা হচ্ছে", level: 2 },
  packed: { label: "Packed", bn: "প্যাক করা হয়েছে", level: 3 },
  shipped: { label: "Shipped", bn: "কুরিয়ারে পাঠানো হয়েছে", level: 4 },
  "out-for-delivery": { label: "Out for Delivery", bn: "ডেলিভারির জন্য বের হয়েছে", level: 5 },
  delivered: { label: "Delivered", bn: "ডেলিভারি সম্পন্ন হয়েছে", level: 6 },
  cancelled: { label: "Cancelled", bn: "অর্ডার বাতিল হয়েছে", level: -1 },
  returned: { label: "Returned", bn: "পণ্য ফেরত এসেছে", level: -2 },
  "on-hold": { label: "On Hold", bn: "সাময়িক স্থগিত", level: -3 }
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
  if (status.includes("return")) return "returned";
  if (status.includes("hold")) return "on-hold";
  if (status.includes("out for delivery")) return "out-for-delivery";
  if (status.includes("deliver")) return "delivered";
  if (status.includes("ship") || status.includes("courier")) return "shipped";
  if (status.includes("pack")) return "packed";
  if (status.includes("process") || status.includes("prepar")) return "processing";
  if (status.includes("confirm")) return "confirmed";
  return "pending";
}

function getStatusInfo(order) {
  const key = normalizeStatus(getOrderField(order, ["status"], "Pending"));
  const status = ORDER_STATUS_MAP[key] || ORDER_STATUS_MAP.pending;
  const providedBn = getOrderField(order, ["statusBn", "banglaStatus"], "");
  return { ...status, bn: providedBn || status.bn };
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
  const statusInfo = getStatusInfo(order);
  const orderDate = formatTrackingTime(getOrderField(order, ["orderDate"], ""));
  const lastUpdated = formatTrackingTime(getOrderField(order, ["lastUpdated"], ""));
  if (statusInfo.level < 0) {
    return [
      { step: "Order Received", stepBn: ORDER_STATUS_MAP.pending.bn, done: true, time: orderDate },
      { step: statusInfo.label, stepBn: statusInfo.bn, done: true, time: lastUpdated }
    ];
  }
  return ORDER_STATUS_FLOW.map((step, index) => ({
    step: step.label,
    stepBn: step.key === normalizeStatus(getOrderField(order, ["status"], "Pending")) ? statusInfo.bn : step.bn,
    done: index <= statusInfo.level,
    time: index === 0 ? orderDate : (index === statusInfo.level ? lastUpdated : "")
  }));
}

// The original storefront also contained an old tracking widget with identical IDs.
// Keep the current standalone panel and remove legacy duplicates after any DOM inserts.
function dedupeTrackingSections() {
  const sections = Array.from(document.querySelectorAll('section[id="track-order"], section.track-order-section'));
  if (sections.length <= 1) return;
  const keep = sections.find(section => section.dataset.hbTrackPrimary === "true")
    || sections.find(section => section.querySelector(".hb-track-panel"))
    || sections[0];
  sections.forEach(section => { if (section !== keep) section.remove(); });
}

function watchTrackingSections() {
  if (window.__hbTrackingSectionObserver || !document.body) return;
  const observer = new MutationObserver(() => {
    if (document.querySelectorAll('section[id="track-order"], section.track-order-section').length > 1) {
      dedupeTrackingSections();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  window.__hbTrackingSectionObserver = observer;
}

function enhanceTrackOrderForm() {
  const form = document.getElementById("trackOrderForm");
  if (!form) return false;
  const orderInput = document.getElementById("trackOrderInput");
  const result = document.getElementById("trackOrderResult");
  if (!orderInput || !result) return false;

  orderInput.placeholder = "Enter your Order ID";
  orderInput.autocomplete = "off";
  orderInput.inputMode = "numeric";
  orderInput.pattern = "[0-9]*";
  orderInput.required = true;

  const oldPhoneInput = document.getElementById("trackPhoneInput");
  if (oldPhoneInput) oldPhoneInput.remove();

  // Keep helper text BELOW the input/button row, not between them in the flex layout.
  const otherHelp = Array.from(form.querySelectorAll(".track-order-help"))
    .filter(element => element.id !== "trackOrderOnlyHelp");
  otherHelp.forEach(element => element.remove());
  let help = document.getElementById("trackOrderOnlyHelp");
  if (!help) {
    help = document.createElement("p");
    help.id = "trackOrderOnlyHelp";
    help.className = "track-order-help";
  }
  help.textContent = "Enter your Order ID from the invoice. No phone number is needed.";
  const controls = orderInput.closest(".hb-track-controls");
  if (controls) controls.insertAdjacentElement("afterend", help);
  else orderInput.insertAdjacentElement("afterend", help);

  form.dataset.trackingReady = "true";
  return true;
}

async function findOrder(orderId) {
  const url = new URL(ORDER_TRACKING_API, window.location.origin);
  url.searchParams.set("orderId", normalizeOrderId(orderId));
  const response = await fetch(url.toString(), { method: "GET", cache: "no-store", headers: { "Accept": "application/json" } });
  let payload;
  try { payload = await response.json(); } catch (error) {
    throw new Error("Live order tracking is temporarily unavailable. Please try again later.");
  }
  if (response.status === 404 && payload.error === "not_found") return null;
  if (!response.ok || !payload.success) {
    throw new Error(payload.message || "Live order tracking is currently unavailable.");
  }
  if (!payload.order || !payload.order.orderId) {
    throw new Error("The tracking service returned an incomplete response.");
  }
  return payload.order;
}

function renderOrder(order) {
  const orderId = displayOrderId(getOrderField(order, ["orderId", "orderID"], "Unknown"));
  const statusInfo = getStatusInfo(order);
  const timeline = getOrderTimeline(order);
  const isCancelled = statusInfo.label === "Cancelled";
  const cancelReason = String(getOrderField(order, ["cancelReason", "cancellationReason", "cancelledReason"], "")).trim();
  const supportMessage = `Hello HB Gadget BD, I need an update for order ${orderId}.`;
  return `
    <div class="order-result-card ${isCancelled ? "is-cancelled" : ""}">
      <span class="order-status-badge ${isCancelled ? "is-cancelled" : ""}">● ${safeHtml(statusInfo.label)} / ${safeHtml(statusInfo.bn)}</span>
      <h3>Order ${safeHtml(orderId)}</h3>
      <p>Current delivery status from the HB Gadget BD order sheet.</p>
      <div class="order-meta-grid">
        <div><small>Last Updated</small><strong>${safeHtml(formatTrackingTime(getOrderField(order, ["lastUpdated"], "")))}</strong></div>
        <div><small>Courier</small><strong>${safeHtml(getOrderField(order, ["courier"], "Not assigned"))}</strong></div>
      </div>
      ${isCancelled ? `<div class="cancel-reason-box" role="status"><strong>Cancellation Reason | বাতিলের কারণ</strong><p>${safeHtml(cancelReason || "Our team has not added a cancellation reason yet.")}</p></div>` : ""}
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

function renderOrderError(message, title = "Order not found") {
  return `
    <div class="order-result-card is-error">
      <h3>${safeHtml(title)}</h3>
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

  if (normalizeOrderId(orderId).length < 8) {
    result.innerHTML = renderOrderError("Please enter the complete numeric Order ID from your invoice.", "Invalid Order ID");
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
    result.innerHTML = renderOrderError(error.message || "Tracking data is temporarily unavailable. Please contact support.", "Tracking unavailable");
  }
}

function initOrderTracking() {
  loadOrderTrackingCss();
  dedupeTrackingSections();
  enhanceTrackOrderForm();
  watchTrackingSections();
  if (!window.__hbOrderTrackingSubmitWired) {
    window.__hbOrderTrackingSubmitWired = true;
    document.addEventListener("submit", handleTrackOrderSubmit, true);
  }
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
