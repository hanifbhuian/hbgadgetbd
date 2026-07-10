export async function onRequest(context) {
  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("text/html")) {
    return response;
  }

  let html = await response.text();
  const fixScript = `
<style id="hb-category-final-style-20260710-v5">
  .hb-force-hidden-section { display: none !important; }

  /* Standard desktop category pills: clean white style like Home / All Products / Offer Zone */
  .category-nav__inner .hb-category-standard {
    background: #ffffff !important;
    border: 1px solid #dfe6f0 !important;
    color: #667085 !important;
    font-weight: 700 !important;
    box-shadow: none !important;
    transform: none !important;
  }

  .category-nav__inner .hb-category-standard:hover,
  .category-nav__inner .hb-category-standard:focus-visible {
    background: #f8fafc !important;
    border-color: #cbd5e1 !important;
    color: #16428f !important;
    box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06) !important;
  }

  .category-nav__inner .hb-category-standard.active {
    background: #8b3f1f !important;
    border-color: #8b3f1f !important;
    color: #ffffff !important;
    box-shadow: 0 8px 18px rgba(139, 63, 31, 0.18) !important;
  }

  /* Track Order remains separate and more highlighted */
  .category-nav__inner .track-order-highlight,
  .mobile-category-list .track-order-highlight {
    position: relative !important;
    overflow: visible !important;
    background: linear-gradient(135deg, #ff3f1f 0%, #ff7a00 100%) !important;
    border-color: #ff4b22 !important;
    color: #ffffff !important;
    font-weight: 900 !important;
    box-shadow: 0 12px 26px rgba(255, 74, 32, 0.32) !important;
    transform: translateY(-1px);
  }

  .category-nav__inner .track-order-highlight:hover,
  .category-nav__inner .track-order-highlight:focus-visible,
  .category-nav__inner .track-order-highlight.active,
  .mobile-category-list .track-order-highlight:hover,
  .mobile-category-list .track-order-highlight:focus-visible {
    background: linear-gradient(135deg, #e63116 0%, #ff6500 100%) !important;
    border-color: #e63116 !important;
    color: #ffffff !important;
    box-shadow: 0 14px 30px rgba(230, 49, 22, 0.38) !important;
  }

  .category-nav__inner .track-order-highlight::before {
    content: "📦";
    margin-right: 7px;
  }

  .category-nav__inner .track-order-highlight::after {
    content: "";
    position: absolute;
    inset: -5px;
    border: 2px solid rgba(255, 91, 45, 0.35);
    border-radius: 999px;
    animation: hbTrackOrderPulse 1.7s ease-out infinite;
    pointer-events: none;
  }

  @keyframes hbTrackOrderPulse {
    0% { opacity: 0.72; transform: scale(0.98); }
    70% { opacity: 0; transform: scale(1.12); }
    100% { opacity: 0; transform: scale(1.12); }
  }

  .mobile-category-bar,
  .mobile-category-drawer {
    display: none;
  }

  @media (max-width: 640px) {
    .category-nav {
      background: #ffffff !important;
      border-top: 1px solid #e5eaf2 !important;
      border-bottom: 1px solid #e5eaf2 !important;
    }

    .category-nav .category-nav__inner {
      display: none !important;
    }

    .mobile-category-bar {
      display: grid !important;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: 10px;
      padding: 8px 0;
    }

    .mobile-category-toggle {
      width: 42px;
      height: 42px;
      border: 1px solid #dfe6f0;
      background: #ffffff;
      border-radius: 14px;
      color: #16428f;
      font-size: 24px;
      font-weight: 900;
      line-height: 1;
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.06);
    }

    .mobile-category-bar strong {
      display: block;
      font-size: 15px;
      color: #101828;
      line-height: 1.15;
    }

    .mobile-category-bar span {
      display: block;
      color: #667085;
      font-size: 12px;
      font-weight: 800;
      margin-top: 2px;
    }

    .mobile-track-mini {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 38px;
      padding: 8px 12px;
      border-radius: 999px;
      background: linear-gradient(135deg, #ff3f1f 0%, #ff7a00 100%);
      color: #ffffff !important;
      font-size: 13px;
      font-weight: 900;
      text-decoration: none;
      box-shadow: 0 8px 18px rgba(255, 74, 32, 0.26);
      white-space: nowrap;
    }

    .mobile-category-drawer {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: block;
      pointer-events: none;
    }

    .mobile-category-backdrop {
      position: absolute;
      inset: 0;
      border: 0;
      background: rgba(15, 23, 42, 0.55);
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .mobile-category-panel {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: min(86vw, 360px);
      overflow: auto;
      background: #ffffff;
      box-shadow: 20px 0 55px rgba(15, 23, 42, 0.22);
      transform: translateX(-102%);
      transition: transform 0.24s ease;
      padding: 18px;
    }

    body.mobile-category-open {
      overflow: hidden;
    }

    body.mobile-category-open .mobile-category-drawer {
      pointer-events: auto;
    }

    body.mobile-category-open .mobile-category-backdrop {
      opacity: 1;
    }

    body.mobile-category-open .mobile-category-panel {
      transform: translateX(0);
    }

    .mobile-category-panel__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-bottom: 14px;
      border-bottom: 1px solid #e5eaf2;
      margin-bottom: 14px;
    }

    .mobile-category-panel__head strong {
      display: block;
      font-size: 20px;
      color: #101828;
    }

    .mobile-category-panel__head small {
      display: block;
      color: #667085;
      margin-top: 2px;
    }

    .mobile-category-close {
      width: 38px;
      height: 38px;
      border-radius: 999px;
      border: 1px solid #dfe6f0;
      background: #ffffff;
      color: #101828;
      font-size: 26px;
    }

    .mobile-category-group {
      margin-top: 14px;
    }

    .mobile-category-group h3 {
      margin: 0 0 8px;
      color: #16428f;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: .05em;
    }

    .mobile-category-list {
      display: grid;
      gap: 8px;
    }

    .mobile-category-list--quick {
      grid-template-columns: 1fr 1fr;
      margin-bottom: 16px;
    }

    .mobile-category-list button,
    .mobile-category-list a {
      width: 100%;
      min-height: 42px;
      border: 1px solid #dfe6f0;
      border-radius: 14px;
      background: #f8fafc;
      color: #101828;
      font-weight: 850;
      text-align: left;
      padding: 10px 12px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: flex-start;
    }

    .mobile-category-list button.active,
    .mobile-category-list button:hover,
    .mobile-category-list button:focus-visible,
    .mobile-category-list a:hover,
    .mobile-category-list a:focus-visible {
      border-color: #8b3f1f !important;
      color: #ffffff !important;
      background: #8b3f1f !important;
    }
  }
</style>
<script id="hb-category-final-20260710-v5">
(function () {
  var mainCategories = ["Power & Safety", "Health & Protection", "Clean Living"];
  var standardCategoryLabels = ["Power & Safety", "Health & Protection", "Clean Living", "Others"];
  var finalCategoryLabels = ["Home", "All Products", "Offer Zone", "Power & Safety", "Health & Protection", "Clean Living", "Others", "Track Order"];

  function textOf(element) {
    return (element && element.textContent ? element.textContent : "").replace(/\s+/g, " ").trim();
  }

  function normalizeLabel(value) {
    return String(value || "")
      .replace(/^📦\s*/, "")
      .replace(/^(🔋|🛡️|💧|🛒)\s*/, "")
      .trim();
  }

  function normalizeSubCategory(value) {
    var text = String(value || "").trim();
    if (text === "Backup") return "Power & Safety";
    if (text === "Protection") return "Health & Protection";
    if (text === "Health & Safety") return "Health & Protection";
    return text;
  }

  function currentFilterLabel() {
    if (window.state && window.state.filter) {
      return window.state.filter === "All" ? "All Products" : window.state.filter;
    }
    var activeItem = document.querySelector(".category-nav__inner .active, .mobile-category-list .active");
    var label = normalizeLabel(textOf(activeItem));
    return finalCategoryLabels.indexOf(label) >= 0 ? label : "All Products";
  }

  function updateMobileCurrent(label) {
    var current = document.querySelector(".mobile-category-current");
    if (current) current.textContent = label || currentFilterLabel();

    document.querySelectorAll(".mobile-category-list button[data-filter]").forEach(function (button) {
      var buttonLabel = button.dataset.filter === "All" ? "All Products" : button.dataset.filter;
      button.classList.toggle("active", buttonLabel === (label || currentFilterLabel()));
    });
  }

  function closeMobileCategories() {
    document.body.classList.remove("mobile-category-open");
    var drawer = document.getElementById("hbMobileCategoryDrawer");
    if (drawer) drawer.setAttribute("aria-hidden", "true");
    var toggle = document.querySelector(".mobile-category-toggle");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  }

  function openMobileCategories() {
    document.body.classList.add("mobile-category-open");
    var drawer = document.getElementById("hbMobileCategoryDrawer");
    if (drawer) drawer.setAttribute("aria-hidden", "false");
    var toggle = document.querySelector(".mobile-category-toggle");
    if (toggle) toggle.setAttribute("aria-expanded", "true");
  }

  function setFilter(filter) {
    var label = filter === "All" ? "All Products" : filter;
    if (typeof window.setCategoryFilter === "function") {
      window.setCategoryFilter(filter, true);
    } else if (typeof setCategoryFilter === "function") {
      setCategoryFilter(filter, true);
    } else {
      window.location.href = "/?filter=" + encodeURIComponent(filter) + "#products";
      return;
    }
    updateMobileCurrent(label);
    closeMobileCategories();
  }

  function makeNavItem(label, filter, href) {
    var item;
    if (href) {
      item = document.createElement("a");
      item.href = href;
      item.className = "category-pill";
    } else {
      item = document.createElement("button");
      item.type = "button";
      item.className = "category-pill";
      item.dataset.filter = filter || label;
      item.addEventListener("click", function () {
        setFilter(filter || label);
      });
    }

    if (standardCategoryLabels.indexOf(label) >= 0) {
      item.classList.add("hb-category-standard");
    }

    if (label === "Track Order") {
      item.classList.add("track-order-highlight");
      item.setAttribute("aria-label", "Track your HB Gadget BD order");
    }

    item.textContent = label;
    return item;
  }

  function cleanTopMenu() {
    var nav = document.querySelector(".category-nav__inner");
    if (!nav) return;

    var activeLabel = currentFilterLabel();
    if (finalCategoryLabels.indexOf(activeLabel) === -1) activeLabel = "All Products";

    nav.innerHTML = "";
    nav.appendChild(makeNavItem("Home", null, "/"));
    nav.appendChild(makeNavItem("All Products", "All"));
    nav.appendChild(makeNavItem("Offer Zone", null, "#offer-zone"));
    nav.appendChild(makeNavItem("Power & Safety", "Power & Safety"));
    nav.appendChild(makeNavItem("Health & Protection", "Health & Protection"));
    nav.appendChild(makeNavItem("Clean Living", "Clean Living"));
    nav.appendChild(makeNavItem("Others", "Others"));
    nav.appendChild(makeNavItem("Track Order", null, "#track-order"));

    Array.from(nav.children).forEach(function (item) {
      var label = normalizeLabel(textOf(item));
      item.classList.toggle("active", label === activeLabel || (!activeLabel && label === "All Products"));
    });
  }

  function makeMobileLink(label, href, className) {
    var link = document.createElement("a");
    link.href = href;
    link.textContent = label;
    if (className) link.className = className;
    link.addEventListener("click", closeMobileCategories);
    return link;
  }

  function makeMobileFilterButton(label, filter) {
    var button = document.createElement("button");
    button.type = "button";
    button.dataset.filter = filter || label;
    button.textContent = label;
    button.addEventListener("click", function () {
      setFilter(filter || label);
    });
    return button;
  }

  function buildMobileCategoryMenu() {
    var categoryNav = document.querySelector(".category-nav");
    if (!categoryNav || !document.body) return;

    categoryNav.querySelectorAll(".mobile-category-bar").forEach(function (item) { item.remove(); });
    document.querySelectorAll("#hbMobileCategoryDrawer").forEach(function (item) { item.remove(); });

    var barContainer = document.createElement("div");
    barContainer.className = "container mobile-category-bar";
    barContainer.innerHTML = '<button class="mobile-category-toggle" type="button" aria-label="Open product categories" aria-expanded="false">☰</button><div><strong>Categories</strong><span class="mobile-category-current">' + currentFilterLabel() + '</span></div><a class="mobile-track-mini" href="#track-order">📦 Track</a>';
    categoryNav.appendChild(barContainer);

    var drawer = document.createElement("div");
    drawer.id = "hbMobileCategoryDrawer";
    drawer.className = "mobile-category-drawer";
    drawer.setAttribute("aria-hidden", "true");
    drawer.innerHTML = '<button class="mobile-category-backdrop" type="button" aria-label="Close categories"></button><div class="mobile-category-panel" role="dialog" aria-modal="true" aria-label="Product categories"><div class="mobile-category-panel__head"><div><strong>Categories</strong><small>Choose product type</small></div><button class="mobile-category-close" type="button" aria-label="Close categories">×</button></div><div class="mobile-category-group"><h3>Quick</h3><div class="mobile-category-list mobile-category-list--quick" data-mobile-quick></div></div><div class="mobile-category-group"><h3>Product Categories</h3><div class="mobile-category-list" data-mobile-categories></div></div></div>';
    document.body.appendChild(drawer);

    var quick = drawer.querySelector("[data-mobile-quick]");
    quick.appendChild(makeMobileLink("Home", "/"));
    quick.appendChild(makeMobileFilterButton("All Products", "All"));
    quick.appendChild(makeMobileLink("Offer Zone", "#offer-zone"));
    quick.appendChild(makeMobileLink("Track Order", "#track-order", "track-order-highlight"));

    var categories = drawer.querySelector("[data-mobile-categories]");
    categories.appendChild(makeMobileFilterButton("Power & Safety", "Power & Safety"));
    categories.appendChild(makeMobileFilterButton("Health & Protection", "Health & Protection"));
    categories.appendChild(makeMobileFilterButton("Clean Living", "Clean Living"));
    categories.appendChild(makeMobileFilterButton("Others", "Others"));

    var toggle = barContainer.querySelector(".mobile-category-toggle");
    toggle.addEventListener("click", openMobileCategories);
    barContainer.querySelector(".mobile-track-mini").addEventListener("click", closeMobileCategories);
    drawer.querySelector(".mobile-category-backdrop").addEventListener("click", closeMobileCategories);
    drawer.querySelector(".mobile-category-close").addEventListener("click", closeMobileCategories);

    updateMobileCurrent(currentFilterLabel());
  }

  function makeCategoryCard(filter, icon, title, description) {
    var card = document.createElement("button");
    card.type = "button";
    card.className = "category-card category-card-button";
    card.dataset.filter = filter;
    card.innerHTML = "<span>" + icon + "</span><h3>" + title + "</h3><p>" + description + "</p>";
    card.addEventListener("click", function () {
      setFilter(filter);
    });
    return card;
  }

  function revisePopularCategories() {
    var grid = document.querySelector(".category-grid");
    if (!grid) return;

    var categories = [
      {
        filter: "Power & Safety",
        icon: "🔋",
        title: "Power & Safety",
        description: "Backup lights, charging support, cable safety, and daily power-use essentials."
      },
      {
        filter: "Health & Protection",
        icon: "🛡️",
        title: "Health & Protection",
        description: "Comfort, hygiene, mosquito-exposure reduction, and family safety-focused items."
      },
      {
        filter: "Clean Living",
        icon: "💧",
        title: "Clean Living",
        description: "Clean and organized home gadgets for air, water, desk, storage, and convenience."
      },
      {
        filter: "Others",
        icon: "🛒",
        title: "Others",
        description: "Mobile accessories, mini speakers, gift boxes, and other useful gadget items."
      }
    ];

    grid.innerHTML = "";
    categories.forEach(function (category) {
      grid.appendChild(makeCategoryCard(category.filter, category.icon, category.title, category.description));
    });
  }

  function patchCategoryFiltering() {
    try {
      window.getProductSubCategory = function (product) {
        return normalizeSubCategory(product.subCategory || product.subcategory || product.sub_category || "");
      };

      getFilteredProducts = function () {
        return products.filter(function (product) {
          var category = String(product.category || "").trim();
          var subCategory = String(window.getProductSubCategory(product) || "").trim();
          var filter = state.filter;
          var matchesCategory = filter === "All" || category === filter || subCategory === filter;

          if (filter === "Others") {
            matchesCategory = mainCategories.indexOf(subCategory) === -1 && mainCategories.indexOf(category) === -1;
          }

          var query = state.search.trim().toLowerCase();
          var searchableText = [
            product.name,
            product.category,
            subCategory,
            product.description
          ].concat(Array.isArray(product.details) ? product.details : []).join(" ").toLowerCase();
          var matchesSearch = !query || searchableText.includes(query);
          return matchesCategory && matchesSearch;
        });
      };
    } catch (error) {}
  }

  function removeComboSectionOnly() {
    Array.from(document.querySelectorAll("h1, h2, h3")).forEach(function (heading) {
      var text = textOf(heading).toLowerCase();
      if (text.includes("build your own gift") || (text.includes("combo") && text.includes("gift"))) {
        var block = heading.closest("section, .section, .marketplace-section, .container");
        if (block) {
          block.classList.add("hb-force-hidden-section");
          block.remove();
        }
      }
    });
  }

  function runFix() {
    patchCategoryFiltering();
    cleanTopMenu();
    buildMobileCategoryMenu();
    revisePopularCategories();
    removeComboSectionOnly();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runFix);
  } else {
    runFix();
  }
  window.setTimeout(runFix, 100);
  window.setTimeout(runFix, 500);
  window.setTimeout(runFix, 1500);
  window.setTimeout(runFix, 3000);
  window.addEventListener("resize", function () { window.setTimeout(runFix, 100); });
})();
</script>`;

  if (html.includes("</body>")) {
    html = html.replace("</body>", fixScript + "\n</body>");
  } else {
    html += fixScript;
  }

  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store, no-cache, must-revalidate, max-age=0");
  headers.delete("content-length");

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
