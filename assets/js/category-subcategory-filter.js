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

(function applyRequestedCategoryFilter() {
  normalizeMainCategoryMenu();

  const params = new URLSearchParams(window.location.search);
  const requestedFilter = params.get("filter") || sessionStorage.getItem("hbRequestedCategoryFilter");
  if (!requestedFilter) return;

  sessionStorage.removeItem("hbRequestedCategoryFilter");
  window.setTimeout(() => {
    normalizeMainCategoryMenu();
    if (typeof setCategoryFilter === "function") {
      setCategoryFilter(requestedFilter, true);
    }
  }, 250);
})();

document.addEventListener("DOMContentLoaded", normalizeMainCategoryMenu);
window.addEventListener("load", normalizeMainCategoryMenu);