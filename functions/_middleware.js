export async function onRequest(context) {
  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("text/html")) {
    return response;
  }

  let html = await response.text();
  const fixScript = `
<style id="hb-home-section-cleanup-style-20260709-v3">
  .hb-force-hidden-section { display: none !important; }
</style>
<script id="hb-category-cleanup-20260709-v3">
(function () {
  function textOf(element) {
    return (element && element.textContent ? element.textContent : "").replace(/\s+/g, " ").trim();
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
        var selected = filter || label;
        if (typeof window.setCategoryFilter === "function") window.setCategoryFilter(selected, true);
        else if (typeof setCategoryFilter === "function") setCategoryFilter(selected, true);
        else window.location.href = "/?filter=" + encodeURIComponent(selected) + "#products";
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

  function hideBlockByHeadingText(headingText, extraSelector) {
    var target = headingText.toLowerCase();
    Array.from(document.querySelectorAll("h1, h2, h3, .section__heading, .marketplace-section__header")).forEach(function (node) {
      if (!textOf(node).toLowerCase().includes(target)) return;

      var block = node.closest("section");
      if (!block) block = node.closest(".marketplace-section");
      if (!block) block = node.closest(".section");
      if (!block) block = node.closest(".container");
      if (!block && extraSelector) block = document.querySelector(extraSelector)?.closest("section, .section, .marketplace-section, .container");
      if (block) {
        block.classList.add("hb-force-hidden-section");
        block.remove();
      }
    });
  }

  function removeUnwantedHomepageSections() {
    hideBlockByHeadingText("Browse popular categories", ".category-grid");
    hideBlockByHeadingText("Build your own gift or gadget combo", ".combo-grid");

    // Fallback for old homepage layout: remove the category grid area even if the heading text is changed.
    var categoryGrid = document.querySelector(".category-grid");
    if (categoryGrid) {
      var categoryBlock = categoryGrid.closest("section, .section, .marketplace-section, .container");
      if (categoryBlock && textOf(categoryBlock).toLowerCase().includes("featured categories")) {
        categoryBlock.classList.add("hb-force-hidden-section");
        categoryBlock.remove();
      }
    }

    // Fallback for combo offer section.
    Array.from(document.querySelectorAll("h1, h2, h3")).forEach(function (heading) {
      var text = textOf(heading).toLowerCase();
      if (text.includes("combo") && text.includes("gift")) {
        var block = heading.closest("section, .section, .marketplace-section, .container");
        if (block) {
          block.classList.add("hb-force-hidden-section");
          block.remove();
        }
      }
    });
  }

  function runFix() {
    cleanTopMenu();
    removeUnwantedHomepageSections();
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
