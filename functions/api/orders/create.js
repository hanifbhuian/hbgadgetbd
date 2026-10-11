// Same-origin order submission proxy for HB Gadget BD.
// Provides one confirmed server-generated Order ID rather than trusting a browser
// timestamp, and avoids retrying a POST when Google blocks cross-origin reads.
const ORDERS_WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbwTSSUNQFJNprDoERK6XQZvH1-s40hdzPUrRaPgoaf4a1BEa7alh8v5EZuse3iRU9R0/exec";
const MAX_BODY_SIZE = 8 * 1024 * 1024; // Supports 5 MB payment-proof attachment.

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, no-cache, max-age=0",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export async function onRequestPost({ request, env }) {
  const type = String(request.headers.get("Content-Type") || "");
  if (!type.toLowerCase().includes("application/json")) {
    return json({success:false,message:"Invalid checkout data format."},415);
  }
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > MAX_BODY_SIZE) {
    return json({success:false,message:"Payment-proof file is too large."},413);
  }

  let data;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_SIZE) return json({success:false,message:"Order request is too large."},413);
    data = JSON.parse(raw);
  } catch (ignored) {
    return json({success:false,message:"Invalid order data. Please review your checkout details."},400);
  }
  if (!data || data.action !== "create" || typeof data.orderId !== "string" ||
      !data.customerName || !data.phone || !(data.customerEmail || data.email) ||
      !data.address) {
    return json({success:false,message:"Missing required checkout information."},400);
  }

  // Manual payment instructions are shown after order creation.
  // This endpoint NEVER marks customer funds received or verified.
  const method = String(data.paymentMethod || "");
  const prepayMethod = method === "bKash" || method === "Nagad";
  if (method !== "Cash on Delivery" && !prepayMethod) {
    return json({success:false,message:"This payment method is not available yet. Choose Cash on Delivery."},400);
  }
  const subtotal = Number(data.subtotal);
  const deliveryCharge = Number(data.deliveryCharge);
  const grandTotal = Number(data.grandTotal);
  if (![subtotal, deliveryCharge, grandTotal].every(Number.isFinite) ||
      subtotal <= 0 || deliveryCharge < 0 || grandTotal !== subtotal + deliveryCharge) {
    return json({success:false,message:"Invalid order totals. Please refresh and try again."},400);
  }
  data.paidAmount = 0;
  data.dueAmount = grandTotal;
  data.paymentStatus = prepayMethod ? "Pending Verification" : "Due";
  data.paymentProof = null;

  try {
    const upstream = await fetch(ORDERS_WEBAPP_URL, {
      method: "POST",
      headers: {"Content-Type":"text/plain;charset=utf-8","Accept":"application/json"},
      body:JSON.stringify(data),
      redirect:"follow"
    });
    if (!upstream.ok) {
      return json({success:false,message:"Order server is unavailable. Check with support before retrying; your order may have been received."},503);
    }
    let result;
    try {
      result = await upstream.json();
    } catch (ignored) {
      return json({success:false,message:"Order confirmation was not returned. Please contact support before resubmitting."},502);
    }
    if (!result?.success) {
      return json({success:false,message:String(result?.message || "Order could not be saved.")},400);
    }

    // The server must return the customer-phone+serial Order ID, not the
    // long provisional request ID used for idempotency.
    const finalId = String(result.orderId || "");
    if (!/^\d{12,25}$/.test(finalId)) {
      return json({success:false,message:"The server did not return a valid Order ID. Contact support before retrying."},502);
    }
    return json({
      success:true,
      orderId:finalId,
      invoiceLink:/^https:\/\/drive\.google\.com\//.test(String(result.invoiceLink || "")) ? result.invoiceLink : "",
      invoiceStatus:String(result.invoiceStatus || ""),
      emailStatus:String(result.emailStatus || ""),
      message:String(result.message || "Order saved successfully.")
    });
  } catch (ignored) {
    return json({success:false,message:"Could not verify your order with the server. Contact support before submitting again."},503);
  }
}
