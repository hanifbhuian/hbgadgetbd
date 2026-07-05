function moveOfferZoneAboveHighlights() {
  document.querySelectorAll(".feature-strip").forEach(section => section.remove());
  document.querySelectorAll(".store-overview, .store-welcome").forEach(section => section.remove());

  const slider = document.querySelector(".homepage-slider");
  const offer = document.getElementById("offer-zone");

  if (slider && offer && slider.nextElementSibling !== offer) {
    slider.insertAdjacentElement("afterend", offer);
  }
}

function initHomeLayoutFix() {
  moveOfferZoneAboveHighlights();

  let attempts = 0;
  const timer = window.setInterval(() => {
    moveOfferZoneAboveHighlights();
    attempts += 1;
    if (attempts >= 12 || document.getElementById("offer-zone")) {
      window.clearInterval(timer);
    }
  }, 300);
}

document.addEventListener("DOMContentLoaded", initHomeLayoutFix);
initHomeLayoutFix();
