/* HB Gadget BD minimal, privacy-preserving store event tracking.
 * No form values, names, emails, phone numbers, addresses or payment details.
 * Session-only anonymous token: not a cross-session identity.
 * Events are best-effort and must never block shopping actions.
 */
(() => {
  "use strict";
  if (!/^(www\.)?hbgadgetbd\.com$/i.test(location.hostname)) return;
  if (navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true) return;
  const endpoint = "/api/analytics/event";
  const eventNames = new Set(["page_view", "product_click", "product_view", "add_to_cart",
    "checkout_start", "checkout_invalid", "checkout_error", "order_placed"]);
  let anon;
  try {
    anon = sessionStorage.getItem("hbAnalyticsSession");
    if (!/^[a-f0-9-]{36}$/i.test(anon || "")) {
      anon = crypto.randomUUID();
      sessionStorage.setItem("hbAnalyticsSession", anon);
    }
  } catch { anon = crypto.randomUUID(); }
  const query = new URLSearchParams(location.search);
  function source() {
    const utm = (query.get("utm_source") || "").toLowerCase();
    if (/facebook|fb|meta|instagram/.test(utm) || query.has("fbclid")) return "Facebook";
    if (/youtube|yt/.test(utm)) return "YouTube";
    if (/google|search/.test(utm) || query.has("gclid")) return "Google";
    try {
      const host = new URL(document.referrer).hostname.toLowerCase();
      if (/facebook\.com|instagram\.com|fb\.com/.test(host)) return "Facebook";
      if (/youtu\.be|youtube\.com/.test(host)) return "YouTube";
      if (/google\./.test(host)) return "Google";
      if (host && !host.endsWith("hbgadgetbd.com")) return "Referral";
    } catch {}
    return "Direct";
  }
  function productFromElement(node) {
    const card = node && node.closest && node.closest("[data-product-id], [data-id], [data-related-id]");
    const id = card?.dataset.productId || card?.dataset.id || card?.dataset.relatedId ||
      (location.pathname.endsWith("product.html") ? query.get("id") : "");
    const name = card?.querySelector?.(".product-card__title, h3")?.textContent?.trim() ||
      (location.pathname.endsWith("product.html") ?
        document.querySelector("#productDetailRoot h1, .main-product-card h1, .product-detail h1")?.textContent?.trim() : "") || "";
    return {
      product_id: String(id || "").slice(0, 36).replace(/[^A-Za-z0-9_-]/g, ""),
      product_name: String(name || "").slice(0, 90)
    };
  }
  const sentKeys = new Set();
  let sent = 0;
  function send(event, data={}, onceKey="") {
    if (!eventNames.has(event) || sent > 70) return;
    if (onceKey && sentKeys.has(onceKey)) return;
    if (onceKey) sentKeys.add(onceKey);
    sent++;
    const payload = JSON.stringify({
      event, anonymous_id: anon, source: source(),
      device: matchMedia("(max-width: 700px)").matches ? "Mobile" : "Desktop",
      page: location.pathname,
      product_id: data.product_id || "",
      product_name: data.product_name || ""
    });
    try {
      fetch(endpoint, { method: "POST", mode: "same-origin", credentials: "omit",
        keepalive: true, cache: "no-store",
        headers: { "Content-Type": "application/json" }, body: payload }).catch(() => {});
    } catch {}
  }
  const currentProduct = productFromElement(document.body);
  send("page_view", {}, "page:"+location.pathname+location.search);
  if (location.pathname.endsWith("/product") || location.pathname.endsWith("/product.html")) {
    send("product_view", currentProduct, "view:"+currentProduct.product_id);
  }
  document.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;
    const clicked = event.target;
    const card = clicked.closest(".product-card");
    if (card && (clicked.closest("[data-detail-id], .product-card__image, .product-card__title, a[href*='product']") || clicked === card)) {
      send("product_click", productFromElement(card));
    }
    const add = clicked.closest(".add-cart, .add-detail-cart, [data-add-current]");
    if (add) { const product=productFromElement(add.closest(".product-card") || add); send("add_to_cart", product.product_id ? product : currentProduct); }
  }, true);
  document.addEventListener("invalid", event => {
    if (event.target?.closest?.("#checkoutForm")) send("checkout_invalid", currentProduct, "checkout-invalid");
  }, true);
  let wasOpen = false, wasComplete = false, errorDetected = false;
  function monitor() {
    const modal = document.getElementById("checkoutModal");
    const open = !!modal?.classList.contains("is-open");
    if (open && !wasOpen) {
      send("checkout_start", currentProduct, "checkout-start");
    }
    wasOpen = open;
    const done = !!modal?.querySelector(".checkout-success-card");
    if (done && !wasComplete) send("order_placed", currentProduct, "order-success");
    wasComplete = done;
    const error = (document.getElementById("checkoutStatus")?.textContent || "");
    if (error && /(could not|failed|error|please fill|not received|unavailable|contact support)/i.test(error) && !errorDetected) {
      errorDetected = true; send("checkout_error", currentProduct, "checkout-error");
    }
  }
  const observer = new MutationObserver(monitor);
  observer.observe(document.documentElement, {childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
  monitor();
})();
