import { findPromotion } from "../../lib/promotions.js";

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store, no-cache, max-age=0",
  "X-Content-Type-Options": "nosniff"
};

export async function onRequestGet({ request }) {
  const code = new URL(request.url).searchParams.get("code") || "";
  const offer = findPromotion(code);
  if (!offer) return new Response(JSON.stringify({
    success: false, message: "Invalid or inactive promotion code."
  }), {status: 404, headers});
  return new Response(JSON.stringify({
    success: true, code: offer.code,
    discountPerUnit: offer.discountPerUnit,
    eligibleProducts: Object.keys(offer.eligibleProducts)
  }), {status: 200, headers});
}
