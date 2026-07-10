export async function onRequest(context) {
  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("text/html")) {
    return response;
  }

  let html = await response.text();
  const fixScript = `
<style id="hb-home-category-revision-style-20260709-v6">
  .hb-force-hidden-section { display: none !important; }
</style>
<script id="hb-home-category-revision-20260709-v6">
(function () {
  var electronicsSubcategories = ["Mobile Accessories", "Mini Speakers"];
  var giftBoxSubcategories = ["Gift Box"];
  var dailyLifeSubcategories = ["Power & Safety", "Health & Protection", "Clean Living"];

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
    item.textContent = label;
    return item;
  }

  function makeDailyLifeNavItem() {
    var wrapper = document.createElement("span");
    wrapper.className = "nav-dropdown daily-life-auto-nav";

    var main = document.createElement("button");
    main.type = "button";
    main.className = "category-pill";
    main.dataset.filter = "Daily Life";
    main.textContent = "Daily Life";
    main.addEventListener("click", function () { setFilter("Daily Life"); });

    var submenu = document.createElement("span");
    submenu.className = "daily-life-submenu";
    submenu.setAttribute("aria-label", "Daily Life subcategories");

    dailyLifeSubcategories.forEach(function (label) {
      var sub = document.createElement("button");
      sub.type = "button";
      sub.className = "category-pill";
      sub.dataset.filter = label;
      sub.textContent = label;
      sub.addEventListener("click", function (event) {
        event.stopPropagation();
        setFilter(label);
      });
      submenu.appendChild(sub);
    });

    wrapper.appendChild(main);
    wrapper.appendChild(submenu);
    return wrapper;
  }

  function cleanTopMenu() {
    var nav = document.querySelector(".category-nav__inner");
    if (!nav) return;

    var activeLabel = "";
    var activeItem = nav.querySelector(".active");
    if (activeItem) activeLabel = textOf(activeItem);
    if (activeLabel.indexOf("Daily Life") === 0) activeLabel = "Daily Life";

    nav.innerHTML = "";
    nav.appendChild(makeNavItem("Home", null, "/"));
    nav.appendChild(makeNavItem("All Products", "All"));
    nav.appendChild(makeNavItem("Offer Zone", null, "#offer-zone"));
    nav.appendChild(makeNavItem("Electronics", "Electronics"));
    nav.appendChild(makeNavItem("Gift & Boxes", "Gift Box"));
    nav.appendChild(makeDailyLifeNavItem());
    nav.appendChild(makeNavItem("Track Order", null, "#track-order"));

    Array.from(nav.children).forEach(function (item) {
      var label = textOf(item);
      var isDaily = label.indexOf("Daily Life") === 0 && activeLabel === "Daily Life";
      item.classList.toggle("active", isDaily || label === activeLabel || (!activeLabel && label === "All Products"));
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
        filter: "Electronics",
        icon: "📱",
        title: "Electronics",
        description: "Main category for phone gadgets, mini speakers, and practical electronic accessories."
      },
      {
        filter: "Mobile Accessories",
        icon: "🔌",
        title: "Mobile Accessories",
        description: "Phone stands, cables, covers, holders, and useful everyday mobile items."
      },
      {
        filter: "Mini Speakers",
        icon: "🔊",
        title: "Mini Speakers",
        description: "Portable wireless speakers and sound gadgets for home, travel, and gifts."
      },
      {
        filter: "Gift Box",
        icon: "🎁",
        title: "Gift & Boxes",
        description: "Main category for gift boxes, family gifts, and gift-ready selections."
      },
      {
        filter: "Gift Box",
        icon: "🛍️",
        title: "Gift Box",
        description: "Ready-made gift boxes and simple packaging options for special moments."
      },
      {
        filter: "Daily Life",
        icon: "🧰",
        title: "Daily Life",
        description: "Useful daily problem-solving gadgets for Bangladeshi homes and families."
      },
      {
        filter: "Power & Safety",
        icon: "🔋",
        title: "Power & Safety",
        description: "Backup lights, charging support, cable safety, and power-use essentials."
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
      }
    ];

    grid.innerHTML = "";
    categories.forEach(function (category) {
      grid.appendChild(makeCategoryCard(category.filter, category.icon, category.title, category.description));
    });
  }

  function patchSubcategoryFiltering() {
    try {
      window.getProductSubCategory = function (product) {
        return normalizeSubCategory(product.subCategory || product.subcategory || product.sub_category || "");
      };

      getFilteredProducts = function () {
        return products.filter(function (product) {
          var category = String(product.category || "").trim();
          var subCategory = String(window.getProductSubCategory(product) || "").trim();
          var matchesCategory = state.filter === "All" || category === state.filter || subCategory === state.filter;

          if (state.filter === "Electronics") {
            matchesCategory = category === "Electronics" || electronicsSubcategories.indexOf(category) >= 0 || electronicsSubcategories.indexOf(subCategory) >= 0;
          }

          if (state.filter === "Gift Box" || state.filter === "Gift & Boxes") {
            matchesCategory = category === "Gift Box" || category === "Gift & Boxes" || giftBoxSubcategories.indexOf(subCategory) >= 0;
          }

          if (state.filter === "Daily Life") {
            matchesCategory = category === "Daily Life" || dailyLifeSubcategories.indexOf(subCategory) >= 0;
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
    patchSubcategoryFiltering();
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
