// Same-origin, status-only proxy to the HB Gadget BD Google Apps Script.
// Browsers cannot reliably read Google Apps Script JSON responses across origins.
// Never return customer name, phone, address, email, invoice or payment-proof links.
const DEFAULT_GOOGLE_WEBAPP =
  "https://script.google.com/macros/s/AKfycbwTSSUNQFJNprDoERK6XQZvH1-s40hdzPUrRaPgoaf4a1BEa7alh8v5EZuse3iRU9R0/exec";

function respond(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, max-age=0",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export async function onRequestGet(context) {
  const requestUrl = new URL(context.request.url);
  const orderId = String(requestUrl.searchParams.get("orderId") || "").trim();

  // 12+ digit new IDs are mobile+serial. Older timestamp IDs also remain valid.
  if (!/^\d{8,25}$/.test(orderId)) {
    return respond({ success: false, error: "invalid_id",
      message: "Please enter the numeric Order ID from your invoice." }, 400);
  }

  // Use the deployed Version 12 URL; do not accidentally fall back to an obsolete environment override.
  const endpoint = DEFAULT_GOOGLE_WEBAPP;
  const url = new URL(endpoint);
  url.searchParams.set("action", "track");
  url.searchParams.set("orderId", orderId);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      redirect: "follow",
      headers: { "Accept": "application/json" }
    });
    if (!response.ok) {
      return respond({ success: false, error: "unavailable",
        message: "Order tracking service is temporarily unavailable." }, 503);
    }

    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch (ignored) {
      // Google login pages, permission errors and HTML indicate a deployment problem.
      return respond({ success: false, error: "unavailable",
        message: "The order tracking service is not returning data. Check Apps Script deployment access." }, 503);
    }

    if (!data || data.success !== true || !data.order) {
      const message = String(data?.message || "");
      if (/phone number|order id and phone/i.test(message)) {
        return respond({ success: false, error: "outdated_backend",
          message: "The updated order-tracking Apps Script has not been deployed yet." }, 503);
      }
      if (/not found/i.test(message)) {
        return respond({ success: false, error: "not_found",
          message: "No matching order was found. Check your Order ID." }, 404);
      }
      return respond({ success: false, error: "unavailable",
        message: "Order tracking is not available yet. Please contact support." }, 503);
    }

    const o = data.order;
    const sanitized = {
      orderId: String(o.orderId || orderId),
      status: String(o.status || "Pending"),
      statusBn: String(o.statusBn || o.banglaStatus || ""),
      orderDate: String(o.orderDate || ""),
      lastUpdated: String(o.lastUpdated || ""),
      courier: String(o.courier || "Not assigned yet")
    };
    if (sanitized.status.trim().toLowerCase() === "cancelled") {
      sanitized.cancelReason = String(o.cancelReason || o.cancellationReason || "").trim().slice(0, 300);
    }
    // Order ID is already supplied by the requester; no other personally
    // identifying customer fields from the sheet are returned.
    return respond({ success: true, order: sanitized });
  } catch (error) {
    return respond({ success: false, error: "unavailable",
      message: "Could not connect to live order tracking. Please try again shortly." }, 503);
  }
}
