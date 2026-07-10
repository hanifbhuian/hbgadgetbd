const HB_RETURN_POLICY = [
  ["Product damaged on arrival", "Exchange within 24–48 hours after receiving proof"],
  ["Wrong product delivered", "Free replacement"],
  ["Customer changed mind", "Return accepted only if unopened; delivery cost is not refundable"],
  ["Electronics warranty", "Supplier/brand warranty only"],
  ["Burnt/damaged due to misuse", "No warranty"],
  ["Water purifier used/installed", "Return not accepted unless defective"]
];

function normalizeDailyLifeSubCategory(value) {
  const text = String(value || "").trim();
  if (text === "Backup") return "Power & Safety";
  if (text === "Protection") return "Health & Protection";
  if (text === "Health & Safety") return "Health & Protection";
  return text;
}

function getProductSubCategory(product) {
  return normalizeDailyLifeSubCategory(product.subCategory || product.subcategory || product.sub_category || "");
}

function productMatchesCategoryFilter(product, filter) {
  const category = String(product.category || "").trim();
  const subCategory = String(getProductSubCategory(product) || "").trim();
  const mainCategories = ["Power & Safety", "Health & Protection", "Clean Living"];

  if (!filter || filter === "All") return true;

  if (filter === "Others") {
    return !mainCategories.includes(category) && !mainCategories.includes(subCategory);
  }

  return category === filter || subCategory === filter;
}

function getFilteredProducts() {
  return products.filter(product => {
    const matchesCategory = productMatchesCategoryFilter(product, state.filter);
    const query = state.search.trim().toLowerCase();
    const searchableText = [
      product.name,
      product.category,
      getProductSubCategory(product),
      product.description,
      ...(Array.isArray(product.details) ? product.details : [])
    ].join(" ").toLowerCase();
    const matchesSearch = !query || searchableText.includes(query);
    return matchesCategory && matchesSearch;
  });
}

function buildCategoryNavItem(label, filter) {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "category-pill";
  item.dataset.filter = filter || label;
  item.textContent = label;
  item.addEventListener("click", () => {
    if (typeof setCategoryFilter === "function") setCategoryFilter(filter || label, true);
  });
  return item;
}

function buildCategoryNavLink(label, href) {
  const item = document.createElement("a");
  item.className = "category-pill";
  item.href = href;
  item.textContent = label;
  return item;
}

function normalizeMainCategoryMenu() {
  const nav = document.querySelector(".category-nav__inner");
  if (!nav) return;

  const activeText = (nav.querySelector(".active")?.textContent || "All Products").trim();
  const allowed = ["Home", "All Products", "Offer Zone", "Power & Safety", "Health & Protection", "Clean Living", "Others", "Track Order"];
  const activeLabel = allowed.includes(activeText) ? activeText : "All Products";

  nav.innerHTML = "";
  nav.appendChild(buildCategoryNavLink("Home", "/"));
  nav.appendChild(buildCategoryNavItem("All Products", "All"));
  nav.appendChild(buildCategoryNavLink("Offer Zone", "#offer-zone"));
  nav.appendChild(buildCategoryNavItem("Power & Safety", "Power & Safety"));
  nav.appendChild(buildCategoryNavItem("Health & Protection", "Health & Protection"));
  nav.appendChild(buildCategoryNavItem("Clean Living", "Clean Living"));
  nav.appendChild(buildCategoryNavItem("Others", "Others"));
  nav.appendChild(buildCategoryNavLink("Track Order", "#track-order"));

  Array.from(nav.children).forEach(item => {
    item.classList.toggle("active", (item.textContent || "").trim() === activeLabel);
  });
}

function ensureProductStructureStyles() {
  if (document.getElementById("hbProductStructureStyles")) return;
  const style = document.createElement("style");
  style.id = "hbProductStructureStyles";
  style.textContent = `
    .hb-policy-section { margin-top: 36px; padding: 28px; border: 1px solid #e5eaf2; border-radius: 28px; background: #fff; box-shadow: 0 18px 46px rgba(15, 23, 42, 0.06); }
    .hb-policy-section__head { margin-bottom: 20px; }
    .hb-policy-section__head h2 { margin: 0; color: #101828; font-size: clamp(24px, 3vw, 38px); line-height: 1.05; }
    .hb-policy-section__head p { margin: 8px 0 0; color: #667085; max-width: 760px; }
    .hb-policy-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .hb-policy-item { border: 1px solid #e5eaf2; border-radius: 18px; padding: 14px 16px; background: #f8fafc; }
    .hb-policy-item strong { display: block; color: #101828; margin-bottom: 5px; }
    .hb-policy-item span { display: block; color: #667085; line-height: 1.45; }
    .hb-policy-note { margin: 16px 0 0; color: #8b3f1f; font-weight: 800; }
    .hb-price-stack { display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px; }
    .hb-sale-price { color: #f04a25; font-weight: 900; font-size: 1.15em; }
    .hb-regular-price { color: #8a94a6; text-decoration: line-through; font-weight: 800; }
    .hb-save-badge { display: inline-flex; align-items: center; border-radius: 999px; padding: 3px 8px; background: #fff2ec; color: #d93a16; font-size: 12px; font-weight: 900; }
    .hb-structure-section, .hb-product-policy-box { border-top: 1px solid #e7edf5; padding-top: 14px; margin-top: 14px; }
    .hb-structure-section h3, .hb-product-policy-box h3 { margin: 0 0 8px; font-size: 16px; color: #101828; }
    .hb-structure-section ul, .hb-product-policy-box ul { margin: 0; padding-left: 18px; color: #667085; }
    .hb-structure-section li, .hb-product-policy-box li { margin: 5px 0; }
    .hb-policy-list strong { color: #101828; }
    @media (max-width: 720px) { .hb-policy-section { padding: 20px; border-radius: 22px; } .hb-policy-grid { grid-template-columns: 1fr; } }
  `;
  document.head.appendChild(style);
}

function formatMoney(value) {
  const formatter = typeof formatPrice === "function" ? formatPrice : amount => `৳${Number(amount || 0).toLocaleString("en-BD")}`;
  return formatter(value);
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

function renderProductPriceMarkup(product, note = false) {
  const sale = sellingPrice(product);
  const regular = regularPrice(product);
  const hasDiscount = regular && regular > sale;
  const savePercent = hasDiscount ? Math.round(((regular - sale) / regular) * 100) : 0;
  return `
    <div class="hb-price-stack">
      <span class="hb-sale-price">${formatMoney(sale)}</span>
      ${hasDiscount ? `<span class="hb-regular-price">${formatMoney(regular)}</span><span class="hb-save-badge">Save ${savePercent}%</span>` : ""}
    </div>
    ${note ? "<small>Delivery charge added at checkout</small>" : ""}
  `;
}

function toListItems(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(item => String(item || "").trim()).filter(Boolean);
  if (typeof value === "object") return Object.entries(value).map(([key, item]) => `${key}: ${item}`);
  return String(value).split(/\n|;/).map(item => item.trim()).filter(Boolean);
}

function renderStructureSection(title, value, fallback) {
  const items = toListItems(value);
  const content = items.length ? items.map(item => `<li>${htmlEscape(item)}</li>`).join("") : `<li>${htmlEscape(fallback)}</li>`;
  return `<div class="hb-structure-section"><h3>${htmlEscape(title)}</h3><ul>${content}</ul></div>`;
}

function renderProductStructure(product) {
  const details = Array.isArray(product.details) ? product.details : [];
  return `
    ${renderStructureSection("Short description", product.shortDescription || product.description, "A short 2–3 line product summary will be added soon.")}
    ${renderStructureSection("Key benefits", product.benefits || product.keyBenefits, "Key benefits will be added soon.")}
    ${renderStructureSection("Specifications", product.specifications || product.specs, details.length ? details : "Brand, model, battery/voltage, size, material, warranty, and compatibility details will be added soon.")}
    ${renderStructureSection("Who should buy", product.whoShouldBuy || product.targetCustomer, "Target customer segment will be added soon.")}
    ${renderStructureSection("What is included", product.included || product.boxContents || product.whatIncluded, "Box contents and accessories will be added soon.")}
    ${renderStructureSection("Important note", product.importantNote || product.limitations || product.warrantyNote, "Please check limitations, compatibility, and warranty conditions before ordering.")}
    ${renderStructureSection("Delivery info", product.deliveryInfo || product.delivery, "Delivery charge is added at checkout. COD/advance payment, courier, and delivery time will be confirmed before final order.")}
    ${renderStructureSection("WhatsApp support", product.whatsappSupport || product.supportNote, "Contact HB Gadget BD on WhatsApp before order confirmation if you need support.")}
  `;
}

function renderPolicyList() {
  return HB_RETURN_POLICY.map(([issue, policy]) => `<li><strong>${htmlEscape(issue)}:</strong> ${htmlEscape(policy)}</li>`).join("");
}

function renderPolicyCards() {
  return HB_RETURN_POLICY.map(([issue, policy]) => `<div class="hb-policy-item"><strong>${issue}</strong><span>${policy}</span></div>`).join("");
}

function insertWebsitePolicySection() {
  if (document.getElementById("hbReturnPolicySection")) return;
  const productsSection = document.getElementById("products");
  if (!productsSection) return;
  ensureProductStructureStyles();

  const section = document.createElement("section");
  section.id = "hbReturnPolicySection";
  section.className = "container hb-policy-section";
  section.innerHTML = `
    <div class="hb-policy-section__head">
      <p class="eyebrow">Return, Exchange & Warranty</p>
      <h2>HB Gadget BD product policy</h2>
      <p>Please check your product after delivery. For exchange or return support, proof such as photo/video and order ID may be required.</p>
    </div>
    <div class="hb-policy-grid">${renderPolicyCards()}</div>
    <p class="hb-policy-note">Delivery charge is non-refundable unless HB Gadget BD sends the wrong product.</p>
  `;

  const categoriesSection = document.getElementById("categories");
  if (categoriesSection) categoriesSection.insertAdjacentElement("afterend", section);
  else productsSection.insertAdjacentElement("afterend", section);
}

function patchProductRendering() {
  ensureProductStructureStyles();

  if (typeof renderProducts === "function" && typeof productGrid !== "undefined" && !window.hbProductCardPricePatched) {
    window.hbProductCardPricePatched = true;
    renderProducts = function () {
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
              <span class="price">${renderProductPriceMarkup(product)}</span>
              <button class="add-cart" type="button" data-id="${product.id}">Add</button>
            </div>
          </div>
        </article>
      `).join("");
    };
  }

  if (typeof renderProductDrawer === "function" && !window.hbProductDrawerStructurePatched) {
    window.hbProductDrawerStructurePatched = true;
    renderProductDrawer = function (product) {
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

      body.innerHTML = `
        ${imageMarkup}
        <div class="product-detail-meta"><span>⭐ ${htmlEscape(stats.rating)}</span><span>💬 ${htmlEscape(stats.reviews)} reviews</span><span>🛍️ ${htmlEscape(stats.sold)} sold</span><span>📦 ${htmlEscape(stats.stock)}</span><span>📍 ${htmlEscape(stats.location)}</span></div>
        <span class="product-card__category">${htmlEscape(product.category)}</span>
        <h2>${htmlEscape(product.name)}</h2>
        <div class="product-detail-price">${renderProductPriceMarkup(product, true)}</div>
        <p class="product-detail-description">${htmlEscape(product.description || "")}</p>
        ${renderProductStructure(product)}
        <div class="hb-structure-section"><h3>Product Reviews & Sales</h3><ul><li>Rating: ${htmlEscape(stats.rating)}</li><li>Reviews: ${htmlEscape(stats.reviews)}</li><li>Sold: ${htmlEscape(stats.sold)}</li></ul></div>
        <div class="hb-product-policy-box"><h3>Return, Exchange & Warranty</h3><ul class="hb-policy-list">${renderPolicyList()}</ul></div>
      `;

      drawer.querySelector(".add-detail-cart").dataset.id = product.id;
      drawer.querySelector(".order-detail-now").dataset.id = product.id;
      updateProductDrawerImage();
    };
  }
}

function bootEnhancements() {
  normalizeMainCategoryMenu();
  insertWebsitePolicySection();
  patchProductRendering();
}

(function applyRequestedCategoryFilter() {
  bootEnhancements();
  const params = new URLSearchParams(window.location.search);
  const requestedFilter = params.get("filter") || sessionStorage.getItem("hbRequestedCategoryFilter");
  if (!requestedFilter) return;

  sessionStorage.removeItem("hbRequestedCategoryFilter");
  window.setTimeout(() => {
    bootEnhancements();
    if (typeof setCategoryFilter === "function") setCategoryFilter(requestedFilter, true);
  }, 250);
})();

document.addEventListener("DOMContentLoaded", bootEnhancements);
window.addEventListener("load", bootEnhancements);
window.setTimeout(bootEnhancements, 500);
window.setTimeout(bootEnhancements, 1500);
