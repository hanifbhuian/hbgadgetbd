const WHATSAPP_NUMBER = "8801816569237";
const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/hanifbhuian/hbgadgetbd/main/";
const PRODUCT_DATA_URL = `${GITHUB_RAW_BASE}assets/data/products.json`;

const HB_RETURN_POLICY = [
  ["Product damaged on arrival", "Exchange within 24–48 hours after receiving proof"],
  ["Wrong product delivered", "Free replacement"],
  ["Customer changed mind", "Return accepted only if unopened; delivery cost is not refundable"],
  ["Electronics warranty", "Supplier/brand warranty only"],
  ["Burnt/damaged due to misuse", "No warranty"],
  ["Water purifier used/installed", "Return not accepted unless defective"]
];

let allProducts = [];
let currentProduct = null;
let galleryImages = [];
let galleryIndex = 0;

const params = new URLSearchParams(window.location.search);
const productId = Number(params.get("id"));
const root = document.getElementById("productDetailRoot");
const relatedRoot = document.getElementById("relatedProducts");

function htmlEscape(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatPrice(price) {
  return `৳${Number(price || 0).toLocaleString("en-BD")}`;
}

function moneyValue(value) {
  if (value === undefined || value === null || value === "") return null;
  const numeric = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function sellingPrice(product) {
  return moneyValue(product.discountPrice ?? product.salePrice ?? product.offerPrice ?? product.price) || 0;
}

function regularPrice(product) {
  return moneyValue(product.regularPrice ?? product.oldPrice ?? product.originalPrice ?? product.mrp ?? product.compareAtPrice);
}

function renderPriceBlock(product, note = false) {
  const sale = sellingPrice(product);
  const regular = regularPrice(product);
  const hasDiscount = regular && regular > sale;
  const savePercent = hasDiscount ? Math.round(((regular - sale) / regular) * 100) : 0;

  return `
    <div class="hb-price-stack">
      <span class="hb-sale-price">${formatPrice(sale)}</span>
      ${hasDiscount ? `<span class="hb-regular-price">${formatPrice(regular)}</span><span class="hb-save-badge">Save ${savePercent}%</span>` : ""}
    </div>
    ${note ? "<small>Delivery charge added at checkout</small>" : ""}
  `;
}

function ensureProductPageStyles() {
  if (document.getElementById("hbProductPageStructureStyles")) return;
  const style = document.createElement("style");
  style.id = "hbProductPageStructureStyles";
  style.textContent = `
    .hb-price-stack { display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px; }
    .hb-sale-price { color: #f04a25; font-weight: 900; font-size: 1.15em; }
    .hb-regular-price { color: #8a94a6; text-decoration: line-through; font-weight: 800; }
    .hb-save-badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 3px 9px; background: #fff2ec; color: #d93a16; font-size: 12px; font-weight: 900; }
    .product-structure-grid { display: grid; gap: 14px; }
    .product-structure-box { border: 1px solid #e5eaf2; border-radius: 18px; padding: 15px 17px; background: #fff; }
    .product-structure-box h3 { margin: 0 0 8px; color: #101828; font-size: 17px; }
    .product-structure-box ul { margin: 0; padding-left: 18px; color: #667085; }
    .product-structure-box li { margin: 5px 0; }
    .product-structure-box strong { color: #101828; }
    .related-item .hb-price-stack { gap: 6px; justify-content: center; }
    .related-item .hb-sale-price { font-size: 1em; }
    .related-item .hb-regular-price { font-size: 0.88em; }
    .related-item .hb-save-badge { display: none; }
  `;
  document.head.appendChild(style);
}

function resolveAssetUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  return `${GITHUB_RAW_BASE}${url.replace(/^\/+/, "")}`;
}

function getProductImages(product) {
  if (Array.isArray(product.images) && product.images.length) return product.images;
  if (product.image) return [product.image];
  return [];
}

function getDetailValue(product, keywords, fallback = "") {
  for (const key of keywords) {
    if (product[key] !== undefined && product[key] !== null && product[key] !== "") return product[key];
  }

  const details = Array.isArray(product.details) ? product.details : [];
  for (const detail of details) {
    const text = String(detail || "");
    const matched = keywords.find(key => text.toLowerCase().includes(String(key).toLowerCase()));
    if (!matched) continue;
    const parts = text.split(":");
    return parts.length > 1 ? parts.slice(1).join(":").trim() : text;
  }

  return fallback;
}

function getStats(product) {
  return {
    rating: getDetailValue(product, ["rating"], "Not rated yet"),
    reviews: getDetailValue(product, ["reviewCount"], Array.isArray(product.customerReviews) ? String(product.customerReviews.length) : "Not available"),
    sold: getDetailValue(product, ["sales", "sold", "soldCount"], "Not available"),
    stock: getDetailValue(product, ["stock", "availability"], "Available"),
    location: getDetailValue(product, ["location"], "Bangladesh")
  };
}

function toListItems(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(item => String(item || "").trim()).filter(Boolean);
  if (typeof value === "object") return Object.entries(value).map(([key, item]) => `${key}: ${item}`);
  return String(value).split(/\n|;/).map(item => item.trim()).filter(Boolean);
}

function renderStructureBox(title, value, fallback) {
  const items = toListItems(value);
  const content = items.length ? items.map(item => `<li>${htmlEscape(item)}</li>`).join("") : `<li>${htmlEscape(fallback)}</li>`;
  return `<div class="product-structure-box"><h3>${htmlEscape(title)}</h3><ul>${content}</ul></div>`;
}

function renderProductStructure(product) {
  const details = Array.isArray(product.details) ? product.details : [];
  return `
    <div class="product-structure-grid">
      ${renderStructureBox("Short description", product.shortDescription || product.description, "A short 2–3 line product summary will be added soon.")}
      ${renderStructureBox("Key benefits", product.benefits || product.keyBenefits, "Key benefits will be added soon.")}
      ${renderStructureBox("Specifications", product.specifications || product.specs, details.length ? details : "Brand, model, battery/voltage, size, material, warranty, and compatibility details will be added soon.")}
      ${renderStructureBox("Who should buy", product.whoShouldBuy || product.targetCustomer, "Target customer segment will be added soon.")}
      ${renderStructureBox("What is included", product.included || product.boxContents || product.whatIncluded, "Box contents and accessories will be added soon.")}
      ${renderStructureBox("Important note", product.importantNote || product.limitations || product.warrantyNote, "Please check limitations, compatibility, and warranty conditions before ordering.")}
      ${renderStructureBox("Delivery info", product.deliveryInfo || product.delivery, "Delivery charge is added at checkout. Cash on Delivery is available. For bKash/Nagad, place the order first, then follow the manual Send Money instructions using your Order ID.")}
      ${renderStructureBox("WhatsApp support", product.whatsappSupport || product.supportNote, "Contact HB Gadget BD on WhatsApp before order confirmation if you need support.")}
    </div>
  `;
}

function renderPolicyList() {
  return HB_RETURN_POLICY.map(([issue, policy]) => `<li><strong>${htmlEscape(issue)}:</strong> ${htmlEscape(policy)}</li>`).join("");
}

function getCart() {
  try {
    return JSON.parse(localStorage.getItem("hbGadgetCart") || "[]");
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem("hbGadgetCart", JSON.stringify(cart));
  updateCartHeader();
}

function updateCartHeader() {
  const cart = getCart();
  const totalItems = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const subtotal = cart.reduce((sum, item) => {
    const product = allProducts.find(productItem => Number(productItem.id) === Number(item.id));
    return sum + (product ? sellingPrice(product) * Number(item.qty || 0) : 0);
  }, 0);
  const subtotalText = formatPrice(subtotal);

  document.querySelectorAll("#cartCount, #productPageCartCount").forEach(element => {
    element.textContent = totalItems;
  });

  document.querySelectorAll("#cartSummaryLabel").forEach(element => {
    element.textContent = `${subtotalText} Cart`;
  });

  document.querySelectorAll("#productPageCartTotal").forEach(element => {
    element.textContent = subtotalText;
  });
}

function addToCart(id) {
  const product = allProducts.find(item => Number(item.id) === Number(id));
  if (!product) return;
  const cart = getCart();
  const existing = cart.find(item => Number(item.id) === Number(id));
  if (existing) existing.qty = Number(existing.qty || 0) + 1;
  else cart.push({ id: Number(id), qty: 1 });
  saveCart(cart);
}

function orderNow(product) {
  // Product order flow: add product, show the SAME website cart, then checkout.
  addToCart(product.id);
  openProductCart();
}

function updateGallery() {
  const image = document.getElementById("mainProductImage");
  if (image && galleryImages.length) image.src = galleryImages[galleryIndex];
  document.querySelectorAll("[data-thumb]").forEach(button => {
    button.classList.toggle("active", Number(button.dataset.thumb) === galleryIndex);
  });
  document.querySelectorAll("[data-gallery]").forEach(button => {
    button.hidden = galleryImages.length < 2;
  });
}

function moveGallery(direction) {
  if (galleryImages.length < 2) return;
  galleryIndex = (galleryIndex + direction + galleryImages.length) % galleryImages.length;
  updateGallery();
}

function renderProduct(product) {
  ensureProductPageStyles();
  currentProduct = product;
  galleryImages = getProductImages(product).map(resolveAssetUrl);
  galleryIndex = 0;
  const stats = getStats(product);
  const imageBlock = galleryImages.length ? `
    <div class="gallery-box">
      <div class="main-image-wrap">
        <button class="gallery-arrow gallery-arrow--prev" type="button" data-gallery="prev">‹</button>
        <img id="mainProductImage" src="${galleryImages[0]}" alt="${htmlEscape(product.name)}">
        <button class="gallery-arrow gallery-arrow--next" type="button" data-gallery="next">›</button>
      </div>
      <div class="thumbs">
        ${galleryImages.map((image, index) => `<button type="button" data-thumb="${index}" class="${index === 0 ? "active" : ""}"><img src="${image}" alt="${htmlEscape(product.name)} photo ${index + 1}"></button>`).join("")}
      </div>
    </div>` : `<div class="gallery-box"><div class="main-image-wrap"><span style="font-size:96px">${product.icon || "🛒"}</span></div></div>`;

  document.title = `${product.name} | HB Gadget BD`;
  root.innerHTML = `
    <div class="breadcrumb"><a href="/">Home</a> / <a href="/#products">Products</a> / ${htmlEscape(product.name)}</div>
    <div class="product-hero">
      ${imageBlock}
      <div class="product-info">
        <span class="category-label">${htmlEscape(product.category)}</span>
        <h1>${htmlEscape(product.name)}</h1>
        <div class="stats-row">
          <span>⭐ ${htmlEscape(stats.rating)}</span>
          <span>💬 Reviews: ${htmlEscape(stats.reviews)}</span>
          <span>🛍️ Sold: ${htmlEscape(stats.sold)}</span>
          <span>📦 ${htmlEscape(stats.stock)}</span>
          <span>📍 ${htmlEscape(stats.location)}</span>
        </div>
        <div class="price-panel">${renderPriceBlock(product, true)}</div>
        <p class="product-description">${htmlEscape(product.description || "")}</p>
        <div class="action-row">
          <button class="add-cart" type="button" data-add-current>Add to Cart</button>
          <button class="order-now" type="button" data-order-current>Order Now</button>
        </div>
      </div>
    </div>
    <div class="section-box">
      <div class="hb-product-tabs" role="tablist" aria-label="Product information and reviews">
        <button type="button" role="tab" id="hbProductDetailsTab" aria-controls="hbProductDetailsPanel" aria-selected="true" data-product-tab="details">Product Details</button>
        <button type="button" role="tab" id="hbProductReviewsTab" aria-controls="hbProductReviewsPanel" aria-selected="false" data-product-tab="reviews">Reviews & Tutorials</button>
      </div>
      <div id="hbProductDetailsPanel" role="tabpanel" aria-labelledby="hbProductDetailsTab">
        ${renderProductStructure(product)}
      </div>
      <div id="hbProductReviewsPanel" role="tabpanel" aria-labelledby="hbProductReviewsTab" hidden>
        ${renderReviewTutorialContent(product,stats)}
      </div>
    </div>
    <div class="section-box">
      <h2>Return, Exchange & Warranty Policy</h2>
      <p class="product-description">Please check the product after delivery. For exchange or return support, proof such as photo/video and order ID may be required.</p>
      <ul class="detail-list">${renderPolicyList()}</ul>
      <p class="product-description"><strong>Note:</strong> Delivery charge is non-refundable unless HB Gadget BD sends the wrong product.</p>
    </div>
  `;
  updateGallery();
}

function validVideoUrl(url) {
  try {
    const parsed = new URL(String(url));
    return parsed.protocol === "https:" && /^(www\\.)?(youtube\\.com|youtu\\.be|youtube-nocookie\\.com)$/.test(parsed.hostname) ? parsed.href : "";
  } catch { return ""; }
}
function renderReviewTutorialContent(product, stats) {
  // Reviews and video links are published only when real content exists in products.json.
  const reviews = Array.isArray(product.customerReviews) ? product.customerReviews : [];
  const candidates = [
    ...(Array.isArray(product.tutorials) ? product.tutorials : []),
    product.tutorialUrl ? {title:"Product tutorial",url:product.tutorialUrl} : null,
    product.reviewVideoUrl ? {title:"Product video review",url:product.reviewVideoUrl} : null
  ].filter(Boolean);
  const videos = candidates.map(value => typeof value === "string" ? {url:value,title:"Watch product video"} : value)
    .filter(value => validVideoUrl(value.url));
  return `
    <div class="review-grid" aria-label="Product rating and sales statistics">
      <div class="review-card"><strong>${htmlEscape(stats.rating)}</strong><span>Product rating</span></div>
      <div class="review-card"><strong>${htmlEscape(stats.reviews)}</strong><span>Published reviews</span></div>
      <div class="review-card"><strong>${htmlEscape(stats.sold)}</strong><span>Reported sales</span></div>
    </div>
    <div class="hb-review-section"><h3>Customer Reviews</h3>
      ${reviews.length ? reviews.map(review => `<article class="hb-review-entry"><strong>${htmlEscape(review.reviewer || "Verified customer")}</strong><span>${htmlEscape(review.rating ? review.rating+" / 5 stars" : "")}</span><p>${htmlEscape(review.comment || "")}</p></article>`).join("") : '<p class="hb-review-empty">No customer reviews have been published for this product yet.</p>'}
    </div>
    <div class="hb-review-section"><h3>Product Tutorials & Video Reviews</h3>
      ${videos.length ? videos.map(video => `<a class="hb-review-video" href="${htmlEscape(validVideoUrl(video.url))}" target="_blank" rel="noopener noreferrer">▶ ${htmlEscape(video.title || "Watch product tutorial")}</a>`).join("") : '<p class="hb-review-empty">No tutorial or video review has been published for this product yet.</p>'}
    </div>
    <p class="hb-review-help">Have a question or want to share feedback? <button type="button" class="hb-review-support" data-contact-panel="support">Contact Order Support</button></p>
  `;
}
function switchProductTab(name) {
  const isReviews = name === "reviews";
  document.getElementById("hbProductDetailsPanel").hidden = isReviews;
  document.getElementById("hbProductReviewsPanel").hidden = !isReviews;
  document.querySelectorAll("[data-product-tab]").forEach(tab => {
    const active = tab.dataset.productTab === name;
    tab.setAttribute("aria-selected",String(active));
    tab.tabIndex=active?0:-1;
  });
}
function getCartDetails() {
  return getCart().map(item => {
    const product=allProducts.find(p=>Number(p.id)===Number(item.id));
    const qty=Math.max(1,Number(item.qty)||1);
    const price=product?sellingPrice(product):0;
    return product?{...product,qty,price,lineTotal:price*qty}:null;
  }).filter(Boolean);
}
function renderProductCart() {
  const items=getCartDetails();
  const container=document.getElementById("cartItems");
  if (!container) return;
  container.innerHTML=items.length?items.map(item=>`
    <div class="cart-item">
      <div class="cart-item__icon">🛒</div>
      <div><h3>${htmlEscape(item.name)}</h3><small>${formatPrice(item.price)} × ${item.qty}</small></div>
      <div class="qty">
        <button type="button" data-product-cart-qty="-1" data-item-id="${Number(item.id)}" aria-label="Reduce quantity">−</button>
        <strong>${item.qty}</strong>
        <button type="button" data-product-cart-qty="1" data-item-id="${Number(item.id)}" aria-label="Increase quantity">+</button>
      </div>
    </div>`).join(""):'<div class="empty">Your cart is empty.</div>';
  const subtotal=items.reduce((sum,item)=>sum+item.lineTotal,0);
  document.getElementById("cartTotal").textContent=formatPrice(subtotal);
  updateCartHeader();
}
function openProductCart() {
  renderProductCart();
  const panel=document.getElementById("cartPanel"),overlay=document.getElementById("overlay");
  panel?.classList.add("is-open");
  panel?.setAttribute("aria-hidden","false");
  overlay?.classList.add("is-open");
}
function closeProductCart() {
  const panel=document.getElementById("cartPanel"),overlay=document.getElementById("overlay");
  panel?.classList.remove("is-open");
  panel?.setAttribute("aria-hidden","true");
  overlay?.classList.remove("is-open");
}
function modifyCartQuantity(id,change) {
  const cart=getCart();
  const found=cart.find(item=>Number(item.id)===Number(id));
  if (found) {
    found.qty=Number(found.qty||0)+change;
    if(found.qty<=0)cart.splice(cart.indexOf(found),1);
    saveCart(cart);
  }
  renderProductCart();
}

function relatedImage(product) {
  const image = getProductImages(product)[0];
  if (image) return `<img src="${resolveAssetUrl(image)}" alt="${htmlEscape(product.name)}">`;
  return `<div class="related-icon">${product.icon || "🛒"}</div>`;
}

function renderRelated(product) {
  const related = allProducts
    .filter(item => Number(item.id) !== Number(product.id))
    .sort((a, b) => {
      const sameA = a.category === product.category ? 0 : 1;
      const sameB = b.category === product.category ? 0 : 1;
      const hotA = /hot|offer|sale|deal/i.test(String(a.tag || "")) ? 0 : 1;
      const hotB = /hot|offer|sale|deal/i.test(String(b.tag || "")) ? 0 : 1;
      return sameA - sameB || hotA - hotB;
    })
    .slice(0, 6);

  relatedRoot.innerHTML = related.length ? related.map(item => `
    <button class="related-item" type="button" data-related-id="${item.id}">
      ${relatedImage(item)}
      <div>
        <h3>${htmlEscape(item.name)}</h3>
        <p>${renderPriceBlock(item)}</p>
      </div>
    </button>
  `).join("") : `<div class="empty">Related products will be added soon.</div>`;
}

async function loadProducts() {
  ensureProductPageStyles();
  const urls = [`assets/data/products.json?v=20261011-ux`, `${PRODUCT_DATA_URL}?v=${Date.now()}`];
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load product data.");
      const data = await response.json();
      allProducts = Array.isArray(data.products) ? data.products : [];
      break;
    } catch (error) {
      console.warn("Product source failed", url, error);
    }
  }

  const product = allProducts.find(item => Number(item.id) === productId);
  if (!product) {
    root.innerHTML = `<div class="empty"><h1>Product not found</h1><p>Please go back to the homepage and select a product again.</p><p><a class="header-button" href="/">Back to Home</a></p></div>`;
    updateCartHeader();
    return;
  }

  renderProduct(product);
  renderRelated(product);
  updateCartHeader();
  renderProductCart();
}

document.addEventListener("click", event => {
  if (event.target.closest("[data-gallery='next']")) moveGallery(1);
  if (event.target.closest("[data-gallery='prev']")) moveGallery(-1);

  const thumb = event.target.closest("[data-thumb]");
  if (thumb) {
    galleryIndex = Number(thumb.dataset.thumb || 0);
    updateGallery();
  }

  if (event.target.closest("[data-add-current]")) {
    addToCart(currentProduct.id);
    const addButton = event.target.closest("[data-add-current]");
    addButton.textContent = "Added to Cart";
    window.setTimeout(() => { addButton.textContent = "Add to Cart"; }, 1200);
  }

  if (event.target.closest("[data-order-current]")) orderNow(currentProduct);
  const productTab=event.target.closest("[data-product-tab]");
  if(productTab) switchProductTab(productTab.dataset.productTab);
  const qty=event.target.closest("[data-product-cart-qty]");
  if(qty) modifyCartQuantity(qty.dataset.itemId,Number(qty.dataset.productCartQty));
  if(event.target.closest("#closeCart") || event.target.id==="overlay") closeProductCart();
  if(event.target.closest("#clearCart")) { saveCart([]); renderProductCart(); }

  const related = event.target.closest("[data-related-id]");
  if (related) {
    window.location.href = `product.html?id=${encodeURIComponent(related.dataset.relatedId)}`;
  }
});

const productPageCartButton = document.getElementById("productPageCart");
if (productPageCartButton) productPageCartButton.addEventListener("click", openProductCart);
window.addEventListener("hb-cart-updated", renderProductCart);
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeProductCart();});

loadProducts();
window.addEventListener("storage", updateCartHeader);
