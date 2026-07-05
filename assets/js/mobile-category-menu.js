const MOBILE_CATEGORY_ITEMS = [
  { label: "Home", href: "https://hbgadgetbd.com/" },
  { label: "All Products", filter: "All" },
  { label: "Offer Zone", href: "#offer-zone" },
  { label: "Track Order", href: "#track-order" },
  { label: "Electronics", children: [
    { label: "Mobile gadgets", filter: "Mobile Accessories" },
    { label: "PC Gadgets", filter: "Desk Gadgets" },
    { label: "Speakers", filter: "Mini Speakers" },
    { label: "Others", filter: "Electronics" }
  ]},
  { label: "Gift & Boxes", children: [
    { label: "Gift Box", filter: "Gift Box" },
    { label: "Envelope", filter: "Envelope" },
    { label: "Gift Items", filter: "Gift Items" }
  ]},
  { label: "Cards", children: [
    { label: "Birthday", filter: "Birthday" },
    { label: "Family", filter: "Family Cards" },
    { label: "Wedding", filter: "Wedding" },
    { label: "Others", filter: "Cards" }
  ]},
  { label: "Others", children: [
    { label: "Kids Toys", filter: "Kids Toys" },
    { label: "Bag and Travel", filter: "Bag and Travel" },
    { label: "Leather Bags", filter: "Leather Bags" }
  ]},
  { label: "Seasonal", children: [
    { label: "Summer", filter: "Summer" },
    { label: "Winter", filter: "Winter" },
    { label: "Rainy", filter: "Rainy" },
    { label: "Others", filter: "Seasonal" }
  ]}
];

function openMobileCategoryDrawer() {
  document.body.classList.add("mobile-category-open");
  document.querySelector(".mobile-category-drawer")?.setAttribute("aria-hidden", "false");
}

function closeMobileCategoryDrawer() {
  document.body.classList.remove("mobile-category-open");
  document.querySelector(".mobile-category-drawer")?.setAttribute("aria-hidden", "true");
}

function runMobileCategoryAction(item) {
  if (item.filter && typeof setCategoryFilter === "function") {
    setCategoryFilter(item.filter, true);
    closeMobileCategoryDrawer();
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (item.href) {
    closeMobileCategoryDrawer();
    window.location.href = item.href;
  }
}

function createMobileCategoryButton(item) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = item.label;
  button.addEventListener("click", () => runMobileCategoryAction(item));
  return button;
}

function buildMobileCategoryGroup(item) {
  const group = document.createElement("div");
  group.className = "mobile-category-group";

  const title = document.createElement("h3");
  title.textContent = item.label;
  group.appendChild(title);

  const list = document.createElement("div");
  list.className = "mobile-category-list";
  item.children.forEach(child => list.appendChild(createMobileCategoryButton(child)));
  group.appendChild(list);

  return group;
}

function ensureMobileCategoryDrawer() {
  if (document.querySelector(".mobile-category-drawer")) return;

  const drawer = document.createElement("aside");
  drawer.className = "mobile-category-drawer";
  drawer.setAttribute("aria-hidden", "true");
  drawer.setAttribute("aria-label", "Browse product categories");

  const quickItems = MOBILE_CATEGORY_ITEMS.filter(item => !item.children);
  const groups = MOBILE_CATEGORY_ITEMS.filter(item => item.children);

  const panel = document.createElement("div");
  panel.className = "mobile-category-panel";
  panel.innerHTML = `
    <div class="mobile-category-panel__head">
      <div>
        <strong>Browse Categories</strong>
        <small>ক্যাটাগরি নির্বাচন করুন</small>
      </div>
      <button type="button" class="mobile-category-close" aria-label="Close categories">×</button>
    </div>
  `;

  const quick = document.createElement("div");
  quick.className = "mobile-category-list mobile-category-list--quick";
  quickItems.forEach(item => quick.appendChild(createMobileCategoryButton(item)));
  panel.appendChild(quick);

  groups.forEach(item => panel.appendChild(buildMobileCategoryGroup(item)));

  const backdrop = document.createElement("button");
  backdrop.type = "button";
  backdrop.className = "mobile-category-backdrop";
  backdrop.setAttribute("aria-label", "Close categories");

  drawer.appendChild(backdrop);
  drawer.appendChild(panel);
  document.body.appendChild(drawer);

  drawer.querySelector(".mobile-category-close")?.addEventListener("click", closeMobileCategoryDrawer);
  backdrop.addEventListener("click", closeMobileCategoryDrawer);
}

function ensureMobileCategoryBar() {
  const nav = document.querySelector(".category-nav");
  if (!nav || nav.querySelector(".mobile-category-bar")) return;

  const bar = document.createElement("div");
  bar.className = "mobile-category-bar container";
  bar.innerHTML = `
    <button type="button" class="mobile-category-toggle" aria-label="Open categories">☰</button>
    <strong>Browse Categories</strong>
    <span>Tap menu</span>
  `;

  nav.insertBefore(bar, nav.firstChild);
  bar.querySelector(".mobile-category-toggle")?.addEventListener("click", openMobileCategoryDrawer);
}

function wireMobileBrowseButtons() {
  document.addEventListener("click", event => {
    const bottomBrowse = event.target.closest(".mobile-bottom-nav a[href='#categories']");
    if (!bottomBrowse) return;
    event.preventDefault();
    openMobileCategoryDrawer();
  });
}

function initMobileCategoryMenu() {
  ensureMobileCategoryDrawer();
  ensureMobileCategoryBar();
  wireMobileBrowseButtons();
}

document.addEventListener("DOMContentLoaded", initMobileCategoryMenu);
initMobileCategoryMenu();
