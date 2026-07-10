export async function onRequest(context) {
  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("text/html")) {
    return response;
  }

  let html = await response.text();
  const fixScript = `
<style id="hb-home-category-revision-style-20260709-v4">
  .hb-force-hidden-section { display: none !important; }
</style>
<script id="hb-home-category-revision-20260709-v4">
(function () {
  function textOf(element) {
    return (element && element.textContent ? element.textContent : "").replace(/\s+/g, " ").trim();
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

  function cleanTopMenu() {
    var nav = document.querySelector(".category-nav__inner");
    if (!nav) return;

    var activeLabel = "";
    var activeItem = nav.querySelector(".active");
    if (activeItem) activeLabel = textOf(activeItem);

    nav.innerHTML = "";
    nav.appendChild(makeNavItem("Home", null, "/"));
    nav.appendChild(makeNavItem("All Products", "All"));
    nav.appendChild(makeNavItem("Offer Zone", null, "#offer-zone"));
    nav.appendChild(makeNavItem("Electronics", "Electronics"));
    nav.appendChild(makeNavItem("Gift & Boxes", "Gift Box"));
    nav.appendChild(makeNavItem("Daily Life", "Daily Life"));
    nav.appendChild(makeNavItem("Track Order", null, "#track-order"));

    Array.from(nav.children).forEach(function (item) {
      var label = textOf(item);
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
        filter: "Electronics",
        icon: "📱",
        title: "Electronics",
        description: "Useful electronic gadgets, speakers, accessories, and practical tech items."
      },
      {
        filter: "Gift Box",
        icon: "🎁",
        title: "Gift & Boxes",
        description: "Gift boxes, family gifts, and gift-ready selections for special moments."
      },
      {
        filter: "Daily Life",
        icon: "🧰",
        title: "Daily Life",
        description: "Useful daily problem-solving gadgets for Bangladeshi homes and families."
      },
      {
        filter: "Backup",
        icon: "🔋",
        title: "Backup",
        description: "Helpful backup, light, charging, and power-support products for daily use."
      },
      {
        filter: "Protection",
        icon: "🛡️",
        title: "Protection",
        description: "Practical protection and organization items for gadgets, home, and travel."
      },
      {
        filter: "Health & Safety",
        icon: "🏠",
        title: "Health & Safety",
        description: "Comfort and safety-focused daily gadgets for family home use."
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
        return product.subCategory || product.subcategory || product.sub_category || "";
      };

      getFilteredProducts = function () {
        return products.filter(function (product) {
          var category = String(product.category || "").trim();
          var subCategory = String(window.getProductSubCategory(product) || "").trim();
          var matchesCategory = state.filter === "All" || category === state.filter || subCategory === state.filter;
          if (state.filter === "Daily Life") {
            matchesCategory = category === "Daily Life" || ["Backup", "Protection", "Health & Safety"].indexOf(subCategory) >= 0;
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
