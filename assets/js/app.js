const WHATSAPP_NUMBER = "8801XXXXXXXXX";

const products = [
  {
    id: 1,
    name: "Pocket Mini Bluetooth Speaker",
    category: "Mini Speakers",
    price: 799,
    icon: "🔊",
    tag: "Hot",
    description: "Compact wireless speaker for room, travel, and gift use."
  },
  {
    id: 2,
    name: "RGB Mini Speaker with Strap",
    category: "Mini Speakers",
    price: 1190,
    icon: "🎵",
    tag: "New",
    description: "Portable speaker with colorful light effect and easy carrying strap."
  },
  {
    id: 3,
    name: "Smart Gadget Gift Box",
    category: "Gift Box",
    price: 1490,
    icon: "🎁",
    tag: "Gift",
    description: "Simple ready gift combo for birthday, friends, and office events."
  },
  {
    id: 4,
    name: "Premium Daily Gift Combo",
    category: "Gift Box",
    price: 2490,
    icon: "🛍️",
    tag: "Combo",
    description: "Curated gadget box with practical daily-use accessories."
  },
  {
    id: 5,
    name: "Fast Charging Type-C Cable",
    category: "Mobile Accessories",
    price: 290,
    icon: "🔌",
    tag: "Value",
    description: "Durable Type-C cable for daily charging and data transfer."
  },
  {
    id: 6,
    name: "Phone Stand for Desk",
    category: "Mobile Accessories",
    price: 350,
    icon: "📱",
    tag: "Useful",
    description: "Foldable stand for video calls, study, and office desk setup."
  },
  {
    id: 7,
    name: "LED Desk Light Mini",
    category: "Desk Gadgets",
    price: 690,
    icon: "💡",
    tag: "Desk",
    description: "Small LED light for study table, work desk, and bedside use."
  },
  {
    id: 8,
    name: "Cable Organizer Clips",
    category: "Desk Gadgets",
    price: 180,
    icon: "🧲",
    tag: "Clean",
    description: "Keep charging cables, earphones, and desk wires organized."
  },
  {
    id: 9,
    name: "Mini Portable Fan",
    category: "Daily Use",
    price: 650,
    icon: "🌀",
    tag: "Daily",
    description: "Rechargeable mini fan for travel, study, and hot weather."
  },
  {
    id: 10,
    name: "Multi-Use Travel Pouch",
    category: "Daily Use",
    price: 420,
    icon: "🎒",
    tag: "Travel",
    description: "Useful pouch for chargers, cables, earphones, and small gadgets."
  },
  {
    id: 11,
    name: "Mini Digital Clock",
    category: "Daily Use",
    price: 520,
    icon: "⏰",
    tag: "Home",
    description: "Clean-looking compact clock for desk, bedside, and gift use."
  },
  {
    id: 12,
    name: "Wireless Earbud Case Cover",
    category: "Mobile Accessories",
    price: 250,
    icon: "🎧",
    tag: "Style",
    description: "Protective and stylish case cover for everyday carry."
  }
];

const state = {
  filter: "All",
  search: "",
  cart: JSON.parse(localStorage.getItem("hbGadgetCart") || "[]")
};

const productGrid = document.getElementById("productGrid");
const searchInput = document.getElementById("searchInput");
const resultText = document.getElementById("resultText");
const cartCount = document.getElementById("cartCount");
const cartPanel = document.getElementById("cartPanel");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const openCart = document.getElementById("openCart");
const closeCart = document.getElementById("closeCart");
const overlay = document.getElementById("overlay");
const clearCart = document.getElementById("clearCart");
const whatsappOrder = document.getElementById("whatsappOrder");

document.getElementById("year").textContent = new Date().getFullYear();

function formatPrice(price) {
  return `৳${price.toLocaleString("en-BD")}`;
}

function saveCart() {
  localStorage.setItem("hbGadgetCart", JSON.stringify(state.cart));
}

function getFilteredProducts() {
  return products.filter(product => {
    const matchesCategory = state.filter === "All" || product.category === state.filter;
    const query = state.search.trim().toLowerCase();
    const matchesSearch = !query || [product.name, product.category, product.description].join(" ").toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });
}

function renderProducts() {
  const filtered = getFilteredProducts();
  resultText.textContent = filtered.length === products.length
    ? "Showing all products"
    : `Showing ${filtered.length} product${filtered.length === 1 ? "" : "s"}`;

  if (!filtered.length) {
    productGrid.innerHTML = `<div class="empty">No products found. Try another keyword or category.</div>`;
    return;
  }

  productGrid.innerHTML = filtered.map(product => `
    <article class="product-card">
      <div class="product-card__image">
        <span class="product-card__tag">${product.tag}</span>
        ${product.icon}
      </div>
      <div class="product-card__body">
        <span class="product-card__category">${product.category}</span>
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <div class="product-card__bottom">
          <span class="price">${formatPrice(product.price)}</span>
          <button class="add-cart" type="button" data-id="${product.id}">Add</button>
        </div>
      </div>
    </article>
  `).join("");
}

function addToCart(productId) {
  const product = products.find(item => item.id === Number(productId));
  if (!product) return;

  const existing = state.cart.find(item => item.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({ id: product.id, qty: 1 });
  }
  saveCart();
  renderCart();
}

function updateQuantity(productId, change) {
  const item = state.cart.find(cartItem => cartItem.id === Number(productId));
  if (!item) return;
  item.qty += change;
  if (item.qty <= 0) {
    state.cart = state.cart.filter(cartItem => cartItem.id !== Number(productId));
  }
  saveCart();
  renderCart();
}

function getCartDetails() {
  return state.cart
    .map(item => {
      const product = products.find(productItem => productItem.id === item.id);
      return product ? { ...product, qty: item.qty, lineTotal: product.price * item.qty } : null;
    })
    .filter(Boolean);
}

function renderCart() {
  const details = getCartDetails();
  const totalItems = details.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = details.reduce((sum, item) => sum + item.lineTotal, 0);

  cartCount.textContent = totalItems;
  cartTotal.textContent = formatPrice(subtotal);

  if (!details.length) {
    cartItems.innerHTML = `<div class="empty">Your cart is empty.</div>`;
    whatsappOrder.href = `https://wa.me/${WHATSAPP_NUMBER}`;
    return;
  }

  cartItems.innerHTML = details.map(item => `
    <div class="cart-item">
      <div class="cart-item__icon">${item.icon}</div>
      <div>
        <h3>${item.name}</h3>
        <small>${formatPrice(item.price)} × ${item.qty}</small>
      </div>
      <div class="qty">
        <button type="button" data-qty="-1" data-id="${item.id}">−</button>
        <strong>${item.qty}</strong>
        <button type="button" data-qty="1" data-id="${item.id}">+</button>
      </div>
    </div>
  `).join("");

  const lines = details.map(item => `- ${item.name} x ${item.qty} = ${formatPrice(item.lineTotal)}`);
  const message = [
    "Hello HB Gadget, I want to order:",
    ...lines,
    `Subtotal: ${formatPrice(subtotal)}`,
    "Please confirm availability and delivery charge."
  ].join("\n");
  whatsappOrder.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function openCartPanel() {
  cartPanel.classList.add("is-open");
  overlay.classList.add("is-open");
  cartPanel.setAttribute("aria-hidden", "false");
}

function closeCartPanel() {
  cartPanel.classList.remove("is-open");
  overlay.classList.remove("is-open");
  cartPanel.setAttribute("aria-hidden", "true");
}

document.querySelector(".search").addEventListener("submit", event => {
  event.preventDefault();
  state.search = searchInput.value;
  renderProducts();
  document.getElementById("products").scrollIntoView({ behavior: "smooth" });
});

searchInput.addEventListener("input", event => {
  state.search = event.target.value;
  renderProducts();
});

document.querySelectorAll(".category-pill").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".category-pill").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    state.filter = button.dataset.filter;
    renderProducts();
  });
});

productGrid.addEventListener("click", event => {
  const button = event.target.closest(".add-cart");
  if (!button) return;
  addToCart(button.dataset.id);
  openCartPanel();
});

cartItems.addEventListener("click", event => {
  const button = event.target.closest("button[data-qty]");
  if (!button) return;
  updateQuantity(button.dataset.id, Number(button.dataset.qty));
});

openCart.addEventListener("click", openCartPanel);
closeCart.addEventListener("click", closeCartPanel);
overlay.addEventListener("click", closeCartPanel);
clearCart.addEventListener("click", () => {
  state.cart = [];
  saveCart();
  renderCart();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeCartPanel();
});

renderProducts();
renderCart();
