export async function onRequest(context) {
  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("text/html")) {
    return response;
  }

  let html = await response.text();
  const fixScript = `
<script id="hb-category-cleanup-20260709-v2">
(function () {
  function textOf(element) {
    return (element && element.textContent ? element.textContent : "").replace(/\s+/g, " ").trim();
  }

  function removeSectionByHeading(headingText) {
    Array.from(document.querySelectorAll("h1, h2, h3")).forEach(function (heading) {
      if (textOf(heading).toLowerCase().includes(headingText.toLowerCase())) {
        var section = heading.closest("section");
        if (section) section.remove();
      }
    });
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

  function removeUnwantedHomepageSections() {
    removeSectionByHeading("Browse popular categories");
    removeSectionByHeading("Build your own gift or gadget combo");
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
  window.setTimeout(runFix, 250);
  window.setTimeout(runFix, 1000);
  window.setTimeout(runFix, 2500);
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
