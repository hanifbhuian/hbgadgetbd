const HB_RETURN_POLICY = [
  {
    issue: "Product damaged on arrival",
    policy: "Exchange within 24–48 hours after receiving proof"
  },
  {
    issue: "Wrong product delivered",
    policy: "Free replacement"
  },
  {
    issue: "Customer changed mind",
    policy: "Return accepted only if unopened; delivery cost is not refundable"
  },
  {
    issue: "Electronics warranty",
    policy: "Supplier/brand warranty only"
  },
  {
    issue: "Burnt/damaged due to misuse",
    policy: "No warranty"
  },
  {
    issue: "Water purifier used/installed",
    policy: "Return not accepted unless defective"
  }
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
    if (typeof setCategoryFilter === "function") {
      setCategoryFilter(filter || label, true);
    }
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

function ensurePolicyStyles() {
  if (document.getElementById("hbReturnPolicyStyles")) return;

  const style = document.createElement("style");
  style.id = "hbReturnPolicyStyles";
  style.textContent = `
    .hb-policy-section {
      margin-top: 36px;
      padding: 28px;
      border: 1px solid #e5eaf2;
      border-radius: 28px;
      background: #ffffff;
      box-shadow: 0 18px 46px rgba(15, 23, 42, 0.06);
    }

    .hb-policy-section__head {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      align-items: flex-end;
      margin-bottom: 20px;
    }

    .hb-policy-section__head h2 {
      margin: 0;
      color: #101828;
      font-size: clamp(24px, 3vw, 38px);
      line-height: 1.05;
    }

    .hb-policy-section__head p {
      margin: 8px 0 0;
      color: #667085;
      max-width: 760px;
    }

    .hb-policy-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .hb-policy-item {
      border: 1px solid #e5eaf2;
      border-radius: 18px;
      padding: 14px 16px;
      background: #f8fafc;
    }

    .hb-policy-item strong {
      display: block;
      color: #101828;
      margin-bottom: 5px;
    }

    .hb-policy-item span {
      display: block;
      color: #667085;
      line-height: 1.45;
    }

    .hb-policy-note {
      margin: 16px 0 0;
      color: #8b3f1f;
      font-weight: 800;
    }

    .hb-product-policy-box {
      margin-top: 18px;
      border: 1px solid #e5eaf2;
      border-radius: 18px;
      padding: 16px;
      background: #fffaf7;
    }

    .hb-product-policy-box h3 {
      margin: 0 0 10px;
      color: #101828;
    }

    .hb-product-policy-box ul {
      margin: 0;
      padding-left: 18px;
      color: #667085;
    }

    .hb-product-policy-box li + li {
      margin-top: 7px;
    }

    @media (max-width: 720px) {
      .hb-policy-section {
        padding: 20px;
        border-radius: 22px;
      }

      .hb-policy-section__head {
        display: block;
      }

      .hb-policy-grid {
        grid-template-columns: 1fr;
      }
    }
  `;
  document.head.appendChild(style);
}

function renderPolicyCards() {
  return HB_RETURN_POLICY.map(item => `
    <div class="hb-policy-item">
      <strong>${item.issue}</strong>
      <span>${item.policy}</span>
    </div>
  `).join("");
}

function insertWebsitePolicySection() {
  if (document.getElementById("hbReturnPolicySection")) return;
  const productsSection = document.getElementById("products");
  if (!productsSection) return;

  ensurePolicyStyles();

  const section = document.createElement("section");
  section.id = "hbReturnPolicySection";
  section.className = "container hb-policy-section";
  section.innerHTML = `
    <div class="hb-policy-section__head">
      <div>
        <p class="eyebrow">Return, Exchange & Warranty</p>
        <h2>HB Gadget BD product policy</h2>
        <p>Please check your product after delivery. For exchange or return support, proof such as photo/video and order ID may be required.</p>
      </div>
    </div>
    <div class="hb-policy-grid">${renderPolicyCards()}</div>
    <p class="hb-policy-note">Delivery charge is non-refundable unless HB Gadget BD sends the wrong product.</p>
  `;

  const categoriesSection = document.getElementById("categories");
  if (categoriesSection) {
    categoriesSection.insertAdjacentElement("afterend", section);
  } else {
    productsSection.insertAdjacentElement("afterend", section);
  }
}

function insertDrawerPolicy() {
  const body = document.getElementById("productDetailBody");
  if (!body || body.querySelector(".hb-product-policy-box")) return;

  ensurePolicyStyles();

  const box = document.createElement("div");
  box.className = "hb-product-policy-box";
  box.innerHTML = `
    <h3>Return, Exchange & Warranty</h3>
    <ul>
      <li>Damaged on arrival: exchange within 24–48 hours after proof.</li>
      <li>Wrong product delivered: free replacement.</li>
      <li>Changed mind: return accepted only if unopened; delivery cost not refundable.</li>
      <li>Electronics warranty: supplier/brand warranty only.</li>
      <li>Burnt or damaged due to misuse: no warranty.</li>
      <li>Used/installed water purifier: return not accepted unless defective.</li>
    </ul>
  `;
  body.appendChild(box);
}

function observeProductPolicy() {
  insertDrawerPolicy();
  if (window.hbPolicyObserverReady) return;
  window.hbPolicyObserverReady = true;

  const observer = new MutationObserver(() => insertDrawerPolicy());
  observer.observe(document.body, { childList: true, subtree: true });
}

(function applyRequestedCategoryFilter() {
  normalizeMainCategoryMenu();
  insertWebsitePolicySection();
  observeProductPolicy();

  const params = new URLSearchParams(window.location.search);
  const requestedFilter = params.get("filter") || sessionStorage.getItem("hbRequestedCategoryFilter");
  if (!requestedFilter) return;

  sessionStorage.removeItem("hbRequestedCategoryFilter");
  window.setTimeout(() => {
    normalizeMainCategoryMenu();
    insertWebsitePolicySection();
    observeProductPolicy();
    if (typeof setCategoryFilter === "function") {
      setCategoryFilter(requestedFilter, true);
    }
  }, 250);
})();

document.addEventListener("DOMContentLoaded", () => {
  normalizeMainCategoryMenu();
  insertWebsitePolicySection();
  observeProductPolicy();
});
window.addEventListener("load", () => {
  normalizeMainCategoryMenu();
  insertWebsitePolicySection();
  observeProductPolicy();
});