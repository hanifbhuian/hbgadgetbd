const WHATSAPP_NUMBER = "8801816569237";
const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/hanifbhuian/hbgadgetbd/main/";
const PRODUCT_DATA_URL = `${GITHUB_RAW_BASE}assets/data/products.json`;

let products = [];
let lightboxImages = [];
let lightboxIndex = 0;
let productDrawerImages = [];
let productDrawerIndex = 0;
let activeDetailProduct = null;

const fallbackProducts = [
  {
    id: 1,
    name: "Pocket Mini Bluetooth Speaker",
    category: "Mini Speakers",
    price: 799,
    icon: "🔊",
    tag: "Hot",
    description: "Compact wireless speaker for room, travel, and gift use."
  }
];

const state = {
  filter: "All",
  search: "",
  cart: JSON.parse(localStorage.getItem("hbGadgetCart") || "[]")
};

const productGrid = document.getElementById("productGrid");
const searchInput = document.getElementById("searchInput");
const resultText = document.getElementById("resultText");
const productSectionTitle = document.getElementById("productSectionTitle");
const cartPanel = document.getElementById("cartPanel");
const cartItems = document.getElementById("cartItems");
const openCart = document.getElementById("openCart");
const closeCart = document.getElementById("closeCart");
const overlay = document.getElementById("overlay");
const clearCart = document.getElementById("clearCart");
const whatsappOrder = document.getElementById("whatsappOrder");

document.getElementById("year").textContent = new Date().getFullYear();

function loadProductDetailCss() {
  if (document.querySelector("link[href*='product-detail-drawer.css']")) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "assets/css/product-detail-drawer.css?v=20260705-1";
  document.head.appendChild(link);
}

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

function syncCartHeader(totalItems, subtotal) {
  const subtotalText = formatPrice(subtotal);

  document.querySelectorAll("#cartCount").forEach(element => {
    element.textContent = totalItems;
  });

  document.querySelectorAll("#cartTotal").forEach(element => {
    element.textContent = subtotalText;
  });

  document.querySelectorAll("#cartSummaryLabel").forEach(element => {
    element.textContent = `${subtotalText} Cart`;
  });

  document.querySelectorAll("#cartMobileLabel").forEach(element => {
    element.textContent = `Cart ${totalItems}`;
  });
}

function resolveAssetUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("data:")) return url;
  const cleanPath = url.replace(/^\/+/, "");
  return `${GITHUB_RAW_BASE}${cleanPath}`;
}

function getProductImages(product) {
  if (Array.isArray(product.images) && product.images.length) return product.images;
  if (product.image) return [product.image];
  return [];
}

function saveCart() {
  localStorage.setItem("hbGadgetCart", JSON.stringify(state.cart));
  window.dispatchEvent(new CustomEvent("hb-cart-updated", { detail: { cart: state.cart } }));
}

function scrollToProducts() {
  const productsSection = document.getElementById("products");
  if (!productsSection) return;
  const headerOffset = document.querySelector(".site-header")?.offsetHeight || 0;
  const targetPosition = productsSection.getBoundingClientRect().top + window.scrollY - headerOffset - 12;
  window.scrollTo({ top: targetPosition, behavior: "smooth" });
}

function setCategoryFilter(category, shouldScroll = true) {
  state.filter = category || "All";
  state.search = "";
  searchInput.value = "";

  document.querySelectorAll(".category-pill").forEach(item => {
    item.classList.toggle("active", item.dataset.filter === state.filter);
  });

  document.querySelectorAll(".category-card-button").forEach(item => {
    item.classList.toggle("active", item.dataset.filter === state.filter);
  });

  if (productSectionTitle) {
    productSectionTitle.textContent = state.filter === "All" ? "All Products" : state.filter;
  }

  renderProducts();
  if (shouldScroll) scrollToProducts();
}

function getFilteredProducts() {
  return products.filter(product => {
    const matchesCategory = state.filter === "All" || product.category === state.filter;
    const query = state.search.trim().toLowerCase();
    const searchableText = [
      product.name,
      product.category,
      product.description,
      ...(Array.isArray(product.details) ? product.details : [])
    ].join(" ").toLowerCase();
    const matchesSearch = !query || searchableText.includes(query);
    return matchesCategory && matchesSearch;
  });
}

function getDetailValue(product, keywords, fallback = "") {
  for (const key of keywords) {
    if (product[key] !== undefined && product[key] !== null && product[key] !== "") return product[key];
  }

  const details = Array.isArray(product.details) ? product.details : [];
  for (const detail of details) {
    const text = String(detail || "");
    const matchKey = keywords.find(key => text.toLowerCase().includes(String(key).toLowerCase()));
    if (!matchKey) continue;
    const parts = text.split(":");
    return parts.length > 1 ? parts.slice(1).join(":").trim() : text;
  }

  return fallback;
}

function getProductStats(product) {
  return {
    rating: getDetailValue(product, ["rating"], "Not rated yet"),
    reviews: getDetailValue(product, ["reviews", "reviewCount"], "0"),
    sold: getDetailValue(product, ["sales", "sold", "soldCount"], "0"),
    stock: getDetailValue(product, ["stock", "availability"], "Available"),
    location: getDetailValue(product, ["location"], "Bangladesh")
  };
}

function renderProductDetails(product) {
  return `<button class="view-detail-button" type="button" data-detail-id="${product.id}">View product details</button>`;
}

function renderProductImage(product) {
  const images = getProductImages(product).map(image => resolveAssetUrl(image));
  if (!images.length) return product.icon || "🛒";

  const imageList = images.join("|");
  const photoCount = images.length > 1 ? `<span class="gallery-count">1/${images.length}</span>` : "";
  const hint = images.length > 1 ? `<span class="gallery-hint">Click product to view details</span>` : `<span class="gallery-hint">Click product to view details</span>`;

  return `
    <button class="product-gallery" type="button" data-images="${imageList}" data-index="0" data-title="${htmlEscape(product.name)}" aria-label="Open ${htmlEscape(product.name)} details">
      <img src="${images[0]}" alt="${htmlEscape(product.name)}" loading="lazy">
      ${photoCount}
      ${hint}
    </button>
  `;
}

function renderProducts() {
  const filtered = getFilteredProducts();
  const categoryLabel = state.filter === "All" ? "all products" : state.filter;
  resultText.textContent = `Showing ${filtered.length} ${categoryLabel} item${filtered.length === 1 ? "" : "s"}`;

  if (!filtered.length) {
    productGrid.innerHTML = `<div class="empty">No products found. Try another keyword or category.</div>`;
    return;
  }

  productGrid.innerHTML = filtered.map(product => `
    <article class="product-card" data-product-id="${product.id}">
      <div class="product-card__image">
        <span class="product-card__tag">${htmlEscape(product.tag || "New")}</span>
        ${renderProductImage(product)}
      </div>
      <div class="product-card__body">
        <span class="product-card__category">${htmlEscape(product.category)}</span>
        <h3>${htmlEscape(product.name)}</h3>
        <p>${htmlEscape(product.description)}</p>
        ${renderProductDetails(product)}
        <div class="product-card__bottom">
          <span class="price">${formatPrice(product.price)}</span>
          <button class="add-cart" type="button" data-id="${product.id}">Add</button>
        </div>
      </div>
    </article>
  `).join("");
}

function ensureProductDrawer() {
  loadProductDetailCss();
  let drawer = document.getElementById("productDetailDrawer");
  if (drawer) return drawer;

  drawer = document.createElement("aside");
  drawer.id = "productDetailDrawer";
  drawer.className = "product-detail-drawer";
  drawer.setAttribute("aria-hidden", "true");
  drawer.innerHTML = `
    <div class="product-detail-drawer__backdrop" data-product-detail-close></div>
    <div class="product-detail-drawer__panel" role="dialog" aria-modal="true" aria-label="Product details">
      <div class="product-detail-drawer__header">
        <strong>Product Details</strong>
        <button class="product-detail-close" type="button" data-product-detail-close aria-label="Close product details">×</button>
      </div>
      <div class="product-detail-body" id="productDetailBody"></div>
      <div class="product-detail-actions">
        <button class="add-detail-cart" type="button">Add to Cart</button>
        <button class="order-detail-now" type="button">Order Now</button>
      </div>
    </div>
  `;
  document.body.appendChild(drawer);
  return drawer;
}

function updateProductDrawerImage() {
  const drawer = ensureProductDrawer();
  const image = drawer.querySelector(".product-detail-main-image");
  const arrows = drawer.querySelectorAll(".product-detail-arrow");
  const thumbs = drawer.querySelectorAll(".product-detail-thumbs button");

  if (image) image.src = productDrawerImages[productDrawerIndex] || "";
  arrows.forEach(arrow => {
    arrow.hidden = productDrawerImages.length < 2;
  });
  thumbs.forEach((thumb, index) => {
    thumb.classList.toggle("is-active", index === productDrawerIndex);
  });
}

function moveProductDrawerImage(direction) {
  if (productDrawerImages.length < 2) return;
  productDrawerIndex = (productDrawerIndex + direction + productDrawerImages.length) % productDrawerImages.length;
  updateProductDrawerImage();
}

function renderProductDrawer(product) {
  const drawer = ensureProductDrawer();
  const body = drawer.querySelector("#productDetailBody");
  const stats = getProductStats(product);
  const rawImages = getProductImages(product);
  productDrawerImages = rawImages.length ? rawImages.map(image => resolveAssetUrl(image)) : [];
  productDrawerIndex = 0;

  const imageMarkup = productDrawerImages.length ? `
    <div class="product-detail-image">
      <button class="product-detail-arrow product-detail-arrow--prev" type="button" data-product-slide="prev" aria-label="Previous product photo">‹</button>
      <img class="product-detail-main-image" src="${productDrawerImages[0]}" alt="${htmlEscape(product.name)}">
      <button class="product-detail-arrow product-detail-arrow--next" type="button" data-product-slide="next" aria-label="Next product photo">›</button>
    </div>
    <div class="product-detail-thumbs">
      ${productDrawerImages.map((image, index) => `<button type="button" data-product-thumb="${index}" class="${index === 0 ? "is-active" : ""}"><img src="${image}" alt="${htmlEscape(product.name)} photo ${index + 1}"></button>`).join("")}
    </div>
  ` : `<div class="product-detail-image"><span style="font-size:72px">${product.icon || "🛒"}</span></div>`;

  const details = Array.isArray(product.details) ? product.details : [];
  body.innerHTML = `
    ${imageMarkup}
    <div class="product-detail-meta">
      <span>⭐ ${htmlEscape(stats.rating)}</span>
      <span>💬 ${htmlEscape(stats.reviews)} reviews</span>
      <span>🛍️ ${htmlEscape(stats.sold)} sold</span>
      <span>📦 ${htmlEscape(stats.stock)}</span>
      <span>📍 ${htmlEscape(stats.location)}</span>
    </div>
    <span class="product-card__category">${htmlEscape(product.category)}</span>
    <h2>${htmlEscape(product.name)}</h2>
    <div class="product-detail-price"><span>${formatPrice(product.price)}</span><small>Delivery charge added at checkout</small></div>
    <p class="product-detail-description">${htmlEscape(product.description || "")}</p>
    <div class="product-detail-section">
      <h3>Product Information</h3>
      <ul class="product-detail-list">
        ${details.length ? details.map(detail => `<li>${htmlEscape(detail)}</li>`).join("") : "<li>More product details will be added soon.</li>"}
      </ul>
    </div>
    <div class="product-detail-section">
      <h3>Customer Review</h3>
      <ul class="product-detail-list">
        <li>Rating: ${htmlEscape(stats.rating)}</li>
        <li>Reviews: ${htmlEscape(stats.reviews)}</li>
        <li>Sold: ${htmlEscape(stats.sold)}</li>
      </ul>
    </div>
  `;

  drawer.querySelector(".add-detail-cart").dataset.id = product.id;
  drawer.querySelector(".order-detail-now").dataset.id = product.id;
  updateProductDrawerImage();
}

function openProductDetails(productId) {
  const product = products.find(item => item.id === Number(productId));
  if (!product) return;
  activeDetailProduct = product;
  const drawer = ensureProductDrawer();
  renderProductDrawer(product);
  drawer.classList.add("is-open");
  drawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("product-detail-open");
}

function closeProductDetails() {
  const drawer = document.getElementById("productDetailDrawer");
  if (!drawer) return;
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("product-detail-open");
}

function ensureLightbox() {
  let lightbox = document.getElementById("productLightbox");
  if (lightbox) return lightbox;

  lightbox = document.createElement("div");
  lightbox.id = "productLightbox";
  lightbox.className = "product-lightbox";
  lightbox.setAttribute("aria-hidden", "true");
  lightbox.innerHTML = `
    <div class="product-lightbox__backdrop" data-lightbox="close"></div>
    <div class="product-lightbox__dialog" role="dialog" aria-modal="true" aria-label="Product photo viewer">
      <button class="product-lightbox__close" type="button" data-lightbox="close" aria-label="Close photo viewer">×</button>
      <button class="product-lightbox__arrow product-lightbox__arrow--prev" type="button" data-lightbox="prev" aria-label="Previous photo">‹</button>
      <img class="product-lightbox__image" src="" alt="Product photo">
      <button class="product-lightbox__arrow product-lightbox__arrow--next" type="button" data-lightbox="next" aria-label="Next photo">›</button>
      <div class="product-lightbox__footer">
        <strong class="product-lightbox__title"></strong>
        <span class="product-lightbox__count"></span>
      </div>
    </div>
  `;
  document.body.appendChild(lightbox);
  return lightbox;
}

function showLightboxImage() {
  const lightbox = ensureLightbox();
  const image = lightbox.querySelector(".product-lightbox__image");
  const count = lightbox.querySelector(".product-lightbox__count");
  const arrows = lightbox.querySelectorAll(".product-lightbox__arrow");

  if (image) image.src = lightboxImages[lightboxIndex] || "";
  if (count) count.textContent = lightboxImages.length > 1 ? `${lightboxIndex + 1}/${lightboxImages.length}` : "1/1";
  arrows.forEach(arrow => {
    arrow.hidden = lightboxImages.length < 2;
  });
}

function openImageViewer(gallery) {
  lightboxImages = (gallery.dataset.images || "").split("|").filter(Boolean);
  if (!lightboxImages.length) return;
  lightboxIndex = Number(gallery.dataset.index || 0);

  const lightbox = ensureLightbox();
  const title = lightbox.querySelector(".product-lightbox__title");
  if (title) title.textContent = gallery.dataset.title || "Product photo";

  showLightboxImage();
  lightbox.classList.add("is-open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("lightbox-open");
}

function closeImageViewer() {
  const lightbox = document.getElementById("productLightbox");
  if (!lightbox) return;
  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("lightbox-open");
}

function moveLightbox(direction) {
  if (lightboxImages.length < 2) return;
  lightboxIndex = (lightboxIndex + direction + lightboxImages.length) % lightboxImages.length;
  showLightboxImage();
}

function addToCart(productId) {
  const product = products.find(item => item.id === Number(productId));
  if (!product) return;

  const existing = state.cart.find(item => item.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({ id: product.id, qty: 1 });
  }
  saveCart();
  renderCart();
}

function orderProductNow(productId) {
  const product = products.find(item => item.id === Number(productId));
  if (!product) return;

  if (typeof openCheckout === "function") {
    openCheckout([{ name: product.name, qty: 1, price: Number(product.price || 0), lineTotal: Number(product.price || 0) }]);
    return;
  }

  const message = `Hello HB Gadget BD, I want to order: ${product.name}. Please confirm stock and delivery.`;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank");
}

function updateQuantity(productId, change) {
  const item = state.cart.find(cartItem => cartItem.id === Number(productId));
  if (!item) return;
  item.qty += change;
  if (item.qty <= 0) {
    state.cart = state.cart.filter(cartItem => cartItem.id !== Number(productId));
  }
  saveCart();
  renderCart();
}

function getCartDetails() {
  return state.cart
    .map(item => {
      const product = products.find(productItem => productItem.id === item.id);
      return product ? { ...product, qty: item.qty, lineTotal: Number(product.price || 0) * item.qty } : null;
    })
    .filter(Boolean);
}

function renderCart() {
  const details = getCartDetails();
  const totalItems = details.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = details.reduce((sum, item) => sum + item.lineTotal, 0);

  syncCartHeader(totalItems, subtotal);

  if (!details.length) {
    cartItems.innerHTML = `<div class="empty">Your cart is empty.</div>`;
    whatsappOrder.href = `https://wa.me/${WHATSAPP_NUMBER}`;
    return;
  }

  cartItems.innerHTML = details.map(item => `
    <div class="cart-item">
      <div class="cart-item__icon">${item.icon || "🛒"}</div>
      <div>
        <h3>${htmlEscape(item.name)}</h3>
        <small>${formatPrice(item.price)} × ${item.qty}</small>
      </div>
      <div class="qty">
        <button type="button" data-qty="-1" data-id="${item.id}">−</button>
        <strong>${item.qty}</strong>
        <button type="button" data-qty="1" data-id="${item.id}">+</button>
      </div>
    </div>
  `).join("");

  const lines = details.map(item => `- ${item.name} x ${item.qty} = ${formatPrice(item.lineTotal)}`);
  const message = [
    "Hello HB Gadget, I want to order:",
    ...lines,
    `Subtotal: ${formatPrice(subtotal)}`,
    "Please confirm availability and delivery charge."
  ].join("\n");
  whatsappOrder.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function openCartPanel() {
  cartPanel.classList.add("is-open");
  overlay.classList.add("is-open");
  cartPanel.setAttribute("aria-hidden", "false");
}

function closeCartPanel() {
  cartPanel.classList.remove("is-open");
  overlay.classList.remove("is-open");
  cartPanel.setAttribute("aria-hidden", "true");
}

async function loadProducts() {
  productGrid.innerHTML = `<div class="empty">Loading products...</div>`;
  const urls = [
    `${PRODUCT_DATA_URL}?v=${Date.now()}`,
    `assets/data/products.json?v=${Date.now()}`
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error("Product file could not be loaded.");
      const data = await response.json();
      products = Array.isArray(data.products) ? data.products : fallbackProducts;
      renderProducts();
      renderCart();
      return;
    } catch (error) {
      console.warn(`Product source failed: ${url}`, error);
    }
  }

  products = fallbackProducts;
  renderProducts();
  renderCart();
}

document.querySelector(".search").addEventListener("submit", event => {
  event.preventDefault();
  state.search = searchInput.value;
  state.filter = "All";
  document.querySelectorAll(".category-pill").forEach(item => item.classList.toggle("active", item.dataset.filter === "All"));
  document.querySelectorAll(".category-card-button").forEach(item => item.classList.remove("active"));
  if (productSectionTitle) productSectionTitle.textContent = "Search Results";
  renderProducts();
  scrollToProducts();
});

searchInput.addEventListener("input", event => {
  state.search = event.target.value;
  if (productSectionTitle) productSectionTitle.textContent = state.search ? "Search Results" : (state.filter === "All" ? "All Products" : state.filter);
  renderProducts();
});

document.querySelectorAll(".category-pill").forEach(button => {
  button.addEventListener("click", () => {
    setCategoryFilter(button.dataset.filter, true);
  });
});

document.querySelectorAll(".category-card-button").forEach(button => {
  button.addEventListener("click", () => {
    setCategoryFilter(button.dataset.filter, true);
  });
});

productGrid.addEventListener("click", event => {
  const addButton = event.target.closest(".add-cart");
  if (addButton) {
    event.preventDefault();
    event.stopPropagation();
    addToCart(addButton.dataset.id);
    openCartPanel();
    return;
  }

  const detailButton = event.target.closest("[data-detail-id]");
  if (detailButton) {
    event.preventDefault();
    openProductDetails(detailButton.dataset.detailId);
    return;
  }

  const card = event.target.closest(".product-card");
  if (card) {
    event.preventDefault();
    openProductDetails(card.dataset.productId);
  }
});

document.addEventListener("click", event => {
  const action = event.target.closest("[data-lightbox]")?.dataset.lightbox;
  if (!action) return;

  if (action === "close") closeImageViewer();
  if (action === "next") moveLightbox(1);
  if (action === "prev") moveLightbox(-1);
});

document.addEventListener("click", event => {
  if (event.target.closest("[data-product-detail-close]")) {
    closeProductDetails();
    return;
  }

  const slideAction = event.target.closest("[data-product-slide]")?.dataset.productSlide;
  if (slideAction === "next") moveProductDrawerImage(1);
  if (slideAction === "prev") moveProductDrawerImage(-1);

  const thumb = event.target.closest("[data-product-thumb]");
  if (thumb) {
    productDrawerIndex = Number(thumb.dataset.productThumb || 0);
    updateProductDrawerImage();
  }

  const addDetail = event.target.closest(".add-detail-cart");
  if (addDetail) {
    addToCart(addDetail.dataset.id);
    closeProductDetails();
    openCartPanel();
  }

  const orderDetail = event.target.closest(".order-detail-now");
  if (orderDetail) {
    closeProductDetails();
    orderProductNow(orderDetail.dataset.id);
  }
});

cartItems.addEventListener("click", event => {
  const button = event.target.closest("button[data-qty]");
  if (!button) return;
  updateQuantity(button.dataset.id, Number(button.dataset.qty));
});

openCart.addEventListener("click", openCartPanel);
closeCart.addEventListener("click", closeCartPanel);
overlay.addEventListener("click", closeCartPanel);
clearCart.addEventListener("click", () => {
  state.cart = [];
  saveCart();
  renderCart();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeImageViewer();
    closeCartPanel();
    closeProductDetails();
  }
  if (event.key === "ArrowRight") {
    if (document.getElementById("productDetailDrawer")?.classList.contains("is-open")) moveProductDrawerImage(1);
    else moveLightbox(1);
  }
  if (event.key === "ArrowLeft") {
    if (document.getElementById("productDetailDrawer")?.classList.contains("is-open")) moveProductDrawerImage(-1);
    else moveLightbox(-1);
  }
});

loadProductDetailCss();
loadProducts();
