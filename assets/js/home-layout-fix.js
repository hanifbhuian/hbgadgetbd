function fixHomepageOrder() {
  document.querySelectorAll(".feature-strip").forEach(section => section.remove());
  document.querySelectorAll(".store-overview, .store-welcome").forEach(section => section.remove());

  const slider = document.querySelector(".homepage-slider");
  const offer = document.getElementById("offer-zone");
  const products = document.getElementById("products");
  const categories = document.getElementById("categories");

  if (slider && offer && slider.nextElementSibling !== offer) {
    slider.insertAdjacentElement("afterend", offer);
  }

  if (offer && products && offer.nextElementSibling !== products) {
    offer.insertAdjacentElement("afterend", products);
  } else if (!offer && slider && products && slider.nextElementSibling !== products) {
    slider.insertAdjacentElement("afterend", products);
  }

  if (products && categories && products.nextElementSibling !== categories) {
    products.insertAdjacentElement("afterend", categories);
  }
}

function initHomeLayoutFix() {
  fixHomepageOrder();

  let attempts = 0;
  const timer = window.setInterval(() => {
    fixHomepageOrder();
    attempts += 1;
    if (attempts >= 20) {
      window.clearInterval(timer);
    }
  }, 300);
}

document.addEventListener("DOMContentLoaded", initHomeLayoutFix);
initHomeLayoutFix();
