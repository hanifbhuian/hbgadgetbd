export async function onRequest(context) {
  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("text/html")) {
    return response;
  }

  let html = await response.text();
  const fixScript = `
<script id="hb-category-cleanup-20260709">
(function () {
  function textOf(element) {
    return (element && element.textContent ? element.textContent : "").replace(/\s+/g, " ").trim();
  }

  function makeCard(filter, icon, title, description) {
    var card = document.createElement("button");
    card.type = "button";
    card.className = "category-card category-card-button";
    card.dataset.filter = filter;
    card.innerHTML = "<span>" + icon + "</span><h3>" + title + "</h3><p>" + description + "</p>";
    card.addEventListener("click", function () {
      if (typeof window.setCategoryFilter === "function") {
        window.setCategoryFilter(filter, true);
      } else if (typeof setCategoryFilter === "function") {
        setCategoryFilter(filter, true);
      } else {
        window.location.href = "/?filter=" + encodeURIComponent(filter) + "#products";
      }
    });
    return card;
  }

  function cleanPopularCategories() {
    var grid = document.querySelector(".category-grid");
    if (!grid) return;

    var allowed = ["Electronics", "Gift & Boxes", "Daily Life"];
    Array.from(grid.children).forEach(function (card) {
      var label = textOf(card.querySelector("h3"));
      if (!allowed.includes(label)) {
        card.remove();
      }
    });

    var hasDailyLife = Array.from(grid.children).some(function (card) {
      return textOf(card.querySelector("h3")) === "Daily Life";
    });

    if (!hasDailyLife) {
      grid.appendChild(makeCard(
        "Daily Life",
        "🧰",
        "Daily Life",
        "Useful daily problem-solving gadgets for backup, protection, health, safety, home, study, and travel."
      ));
    }
  }

  function cleanTopMenu() {
    var nav = document.querySelector(".category-nav__inner");
    if (!nav) return;

    var removeLabels = ["Cards", "Others", "Seasonal"];
    Array.from(nav.children).forEach(function (item) {
      if (removeLabels.includes(textOf(item))) item.remove();
    });

    var hasDailyLife = Array.from(nav.children).some(function (item) {
      return textOf(item) === "Daily Life";
    });

    if (!hasDailyLife) {
      var trackOrder = Array.from(nav.children).find(function (item) { return textOf(item) === "Track Order"; });
      var daily = document.createElement("button");
      daily.type = "button";
      daily.className = "category-pill";
      daily.dataset.filter = "Daily Life";
      daily.textContent = "Daily Life";
      daily.addEventListener("click", function () {
        if (typeof window.setCategoryFilter === "function") window.setCategoryFilter("Daily Life", true);
        else if (typeof setCategoryFilter === "function") setCategoryFilter("Daily Life", true);
      });
      nav.insertBefore(daily, trackOrder || null);
    }
  }

  function runFix() {
    cleanTopMenu();
    cleanPopularCategories();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", runFix);
  } else {
    runFix();
  }
  window.setTimeout(runFix, 500);
  window.setTimeout(runFix, 1500);
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
