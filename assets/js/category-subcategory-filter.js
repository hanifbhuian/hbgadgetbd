function getProductSubCategory(product) {
  return product.subCategory || product.subcategory || product.sub_category || "";
}

function productMatchesCategoryFilter(product, filter) {
  const category = String(product.category || "").trim();
  const subCategory = String(getProductSubCategory(product) || "").trim();

  if (!filter || filter === "All") return true;
  if (filter === "Daily Life") {
    return category === "Daily Life" || ["Backup", "Protection", "Health & Safety"].includes(subCategory);
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

function buildDailyLifeNavItem() {
  const wrapper = document.createElement("span");
  wrapper.className = "nav-dropdown daily-life-auto-nav";
  wrapper.innerHTML = `
    <button class="category-pill" data-filter="Daily Life" type="button">Daily Life</button>
    <span class="daily-life-submenu" aria-label="Daily Life subcategories">
      <button class="category-pill" data-filter="Backup" type="button">Backup</button>
      <button class="category-pill" data-filter="Protection" type="button">Protection</button>
      <button class="category-pill" data-filter="Health & Safety" type="button">Health &amp; Safety</button>
    </span>
  `;
  return wrapper;
}

function normalizeMainCategoryMenu() {
  const nav = document.querySelector(".category-nav__inner");
  if (!nav) return;

  const items = Array.from(nav.children);

  items.forEach(item => {
    const text = (item.textContent || "").trim().toLowerCase();
    if (["cards", "others", "seasonal"].includes(text)) {
      item.remove();
    }
  });

  const hasDailyLife = Array.from(nav.children).some(item =>
    (item.textContent || "").trim().toLowerCase().includes("daily life")
  );
  if (hasDailyLife) return;

  const trackOrder = Array.from(nav.children).find(item =>
    (item.textContent || "").trim().toLowerCase() === "track order"
  );
  const dailyLifeItem = buildDailyLifeNavItem();

  if (trackOrder) nav.insertBefore(dailyLifeItem, trackOrder);
  else nav.appendChild(dailyLifeItem);
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
