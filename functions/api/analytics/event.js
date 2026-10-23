/* Public, write-only collection endpoint. Personal information is never collected. */
const names = new Set([
  "page_view","product_click","product_view","add_to_cart",
  "checkout_start","checkout_invalid","checkout_error","order_placed"
]);
const allowedOrigins = new Set(["https://hbgadgetbd.com","https://www.hbgadgetbd.com"]);
function noContent(){ return new Response(null,{status:204,headers:{"Cache-Control":"no-store"}}); }
export async function onRequestPost({request,env}) {
  const url = new URL(request.url);
  if (!["hbgadgetbd.com","www.hbgadgetbd.com"].includes(url.hostname)) return noContent();
  if (!allowedOrigins.has(request.headers.get("Origin") || "")) return noContent();
  if (!String(request.headers.get("Content-Type") || "").startsWith("application/json")) return noContent();
  if (!env.HB_STORE_ANALYTICS || typeof env.HB_STORE_ANALYTICS.writeDataPoint !== "function") return noContent();
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 2048) return noContent();
  let item;
  try {
    const body = await request.text();
    if (body.length > 2048) return noContent();
    item = JSON.parse(body);
  } catch { return noContent(); }
  if (!names.has(item.event) || !/^[0-9a-f-]{36}$/i.test(item.anonymous_id || "")) return noContent();
  const id = /^[A-Za-z0-9_-]{1,36}$/.test(item.product_id || "") ? item.product_id : "";
  let product = typeof item.product_name === "string" ? item.product_name.slice(0,90) : "";
  if (/@|https?:|(?:\d[\s-]?){8,}/i.test(product)) product = "";
  product = product.replace(/[\x00-\x1f\x7f]/g,"");
  const source = ["Facebook","YouTube","Google","Referral","Direct"].includes(item.source) ? item.source : "Other";
  const device = ["Mobile","Desktop"].includes(item.device) ? item.device : "Unknown";
  const country = request.cf?.country || "Unknown";
  const region = country === "BD" ? (request.cf?.region || "BD / unknown") : "Outside Bangladesh";
  const page = ["/", "/index.html", "/home.html", "/product", "/product.html", "/offers.html"].includes(item.page) ? item.page : "Other";
  try {
    env.HB_STORE_ANALYTICS.writeDataPoint({
      indexes: ["hbgadgetbd"],
      blobs: [item.event, id, product, source, region, item.anonymous_id, device, page],
      doubles: [1]
    });
  } catch { /* Never impact checkout or storefront */ }
  return noContent();
}
export function onRequestGet(){ return new Response("Method not allowed",{status:405,headers:{"Cache-Control":"no-store"}}); }
