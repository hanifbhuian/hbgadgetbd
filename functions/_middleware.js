export async function onRequest(context) {
  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("text/html")) {
    return response;
  }

  let html = await response.text();
  const fixScript = `
<style id="hb-category-final-style-20260710-v3">
  .hb-force-hidden-section { display: none !important; }

  .category-nav__inner .hb-category-highlight {
    position: relative !important;
    background: linear-gradient(135deg, #0f766e 0%, #1d4ed8 100%) !important;
    border-color: rgba(29, 78, 216, 0.72) !important;
    color: #ffffff !important;
    font-weight: 850 !important;
    letter-spacing: -0.01em;
    box-shadow: 0 10px 22px rgba(29, 78, 216, 0.22) !important;
  }

  .category-nav__inner .hb-category-highlight::before {
    content: attr(data-icon);
    margin-right: 7px;
    font-size: 0.95em;
  }

  .category-nav__inner .hb-category-highlight:hover,
  .category-nav__inner .hb-category-highlight:focus-visible,
  .category-nav__inner .hb-category-highlight.active {
    background: linear-gradient(135deg, #0b5f59 0%, #173ea5 100%) !important;
    border-color: #173ea5 !important;
    color: #ffffff !important;
    transform: translateY(-1px);
    box-shadow: 0 13px 28px rgba(15, 118, 110, 0.28) !important;
  }

  .category-nav__inner .track-order-highlight {
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
  .category-nav__inner .track-order-highlight.active {
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

  @media (max-width: 768px) {
    .category-nav__inner .hb-category-highlight {
      box-shadow: 0 8px 18px rgba(29, 78, 216, 0.2) !important;
    }

    .category-nav__inner .track-order-highlight {
      box-shadow: 0 8px 18px rgba(255, 74, 32, 0.28) !important;
    }
  }
</style>
<script id="hb-category-final-20260710-v3">
(function () {
  var mainCategories = ["Power & Safety", "Health & Protection", "Clean Living"];
  var otherCategories = ["Mobile Accessories", "Mini Speakers", "Gift Box", "Gift & Boxes", "Electronics", "Daily Life", "Others"];
  var categoryIcons = {
    "Power & Safety": "🔋",
    "Health & Protection": "🛡️",
    "Clean Living": "💧",
    "Others": "🛒"
  };

  function textOf(element) {
    return (element && element.textContent ? element.textContent : "").replace(/\s+/g, " ").trim();
  }

  function normalizeSubCategory(value) {
    var text = String(value || "").trim();
    if (text === "Backup") return "Power & Safety";
    if (text === "Protection") return "Health & Protection";
    if (text === "Health & Safety") return "Health & Protection";
    return text;
  }

  function setFilter(filter) {
    if (typeof window.setCategoryFilter === "function") {
      window.setCategoryFilter(filter, true);
    } else if (typeof setCategoryFilter === "function") {
      setCategoryFilter(filter, true);
    } else {
      window.location.href = "/?filter=" + encodeURIComponent(filter) + "#products";
    }
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

    if (categoryIcons[label]) {
      item.classList.add("hb-category-highlight");
      item.setAttribute("data-icon", categoryIcons[label]);
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

    var activeLabel = "";
    var activeItem = nav.querySelector(".active");
    if (activeItem) activeLabel = textOf(activeItem).replace(/^📦\s*/, "").replace(/^(🔋|🛡️|💧|🛒)\s*/, "");

    var allowed = ["Home", "All Products", "Offer Zone", "Power & Safety", "Health & Protection", "Clean Living", "Others", "Track Order"];
    if (allowed.indexOf(activeLabel) === -1) activeLabel = "All Products";

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
      var label = textOf(item).replace(/^📦\s*/, "").replace(/^(🔋|🛡️|💧|🛒)\s*/, "");
      item.classList.toggle("active", label === activeLabel || (!activeLabel && label === "All Products"));
    });
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
