document.addEventListener("DOMContentLoaded", () => {
  const slider = document.querySelector(".homepage-slider");

  function loadOrderPlacement() {
    if (window.__hbOrderPlacementRequested) return;
    window.__hbOrderPlacementRequested = true;
    const placementScript = document.createElement("script");
    placementScript.src = "assets/js/order-placement.js?v=20260704-11";
    document.body.appendChild(placementScript);
  }

  function loadOrderTracking() {
    if (window.__hbOrderTrackingRequested) {
      loadOrderPlacement();
      return;
    }
    window.__hbOrderTrackingRequested = true;
    const orderScript = document.createElement("script");
    orderScript.src = "assets/js/order-tracking.js?v=20260704-7";
    orderScript.onload = loadOrderPlacement;
    document.body.appendChild(orderScript);
  }

  function loadMobileCategoryMenu() {
    if (window.__hbMobileCategoryRequested) {
      loadOrderTracking();
      return;
    }
    window.__hbMobileCategoryRequested = true;
    const mobileMenuScript = document.createElement("script");
    mobileMenuScript.src = "assets/js/mobile-category-menu.js?v=20260704-1";
    mobileMenuScript.onload = loadOrderTracking;
    document.body.appendChild(mobileMenuScript);
  }

  function loadHomeLayoutFix() {
    if (window.__hbHomeLayoutFixRequested) {
      loadMobileCategoryMenu();
      return;
    }
    window.__hbHomeLayoutFixRequested = true;
    const layoutScript = document.createElement("script");
    layoutScript.src = "assets/js/home-layout-fix.js?v=20260704-1";
    layoutScript.onload = loadMobileCategoryMenu;
    document.body.appendChild(layoutScript);
  }

  function loadShopUpgrade() {
    if (!document.querySelector("link[href*='shop-upgrade.css']")) {
      const style = document.createElement("link");
      style.rel = "stylesheet";
      style.href = "assets/css/shop-upgrade.css?v=20260704-4";
      document.head.appendChild(style);
    }

    if (!document.querySelector("link[href*='mobile-header-fix.css']")) {
      const mobileFix = document.createElement("link");
      mobileFix.rel = "stylesheet";
      mobileFix.href = "assets/css/mobile-header-fix.css?v=20260704-2";
      document.head.appendChild(mobileFix);
    }

    if (window.__hbShopUpgradeRequested) {
      loadHomeLayoutFix();
      return;
    }
    window.__hbShopUpgradeRequested = true;

    const script = document.createElement("script");
    script.src = "assets/js/site-enhancements.js?v=20260704-5";
    script.onload = () => {
      if (window.__hbShopUpgradeLoaded) return;
      window.__hbShopUpgradeLoaded = true;
      if (typeof addPrimaryNavigation === "function") addPrimaryNavigation();
      if (typeof upgradeCategoryNavigation === "function") upgradeCategoryNavigation();
      if (typeof replaceHomeSections === "function") replaceHomeSections();
      if (typeof upgradeFooterAndMobileNav === "function") upgradeFooterAndMobileNav();
      if (typeof wireEvents === "function") wireEvents();
      if (typeof startCountdown === "function") startCountdown();
      if (typeof enhanceProductCards === "function") enhanceProductCards();
      if (typeof updateCartLabels === "function") updateCartLabels();
      const grid = document.getElementById("productGrid");
      if (grid && typeof enhanceProductCards === "function") {
        new MutationObserver(() => {
          enhanceProductCards();
          if (typeof updateCartLabels === "function") updateCartLabels();
        }).observe(grid, { childList: true, subtree: true });
      }
      const cart = document.getElementById("cartItems");
      if (cart && typeof updateCartLabels === "function") {
        new MutationObserver(updateCartLabels).observe(cart, { childList: true, subtree: true });
      }
      loadHomeLayoutFix();
    };
    document.body.appendChild(script);
  }

  if (!slider) {
    loadShopUpgrade();
    return;
  }

  const slides = Array.from(slider.querySelectorAll(".slide"));
  const dots = Array.from(slider.querySelectorAll(".slider-dot"));
  const prevButton = slider.querySelector("[data-slide-action='prev']");
  const nextButton = slider.querySelector("[data-slide-action='next']");

  if (!slides.length) {
    loadShopUpgrade();
    return;
  }

  let currentSlide = 0;
  let timerId = null;
  const intervalMs = 4500;

  function showSlide(index) {
    currentSlide = (index + slides.length) % slides.length;

    slides.forEach((slide, slideIndex) => {
      slide.classList.toggle("active", slideIndex === currentSlide);
    });

    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("active", dotIndex === currentSlide);
      dot.setAttribute("aria-current", dotIndex === currentSlide ? "true" : "false");
    });
  }

  function nextSlide() {
    showSlide(currentSlide + 1);
  }

  function previousSlide() {
    showSlide(currentSlide - 1);
  }

  function startAutoSlide() {
    stopAutoSlide();
    timerId = window.setInterval(nextSlide, intervalMs);
  }

  function stopAutoSlide() {
    if (timerId) window.clearInterval(timerId);
  }

  function restartAutoSlide() {
    startAutoSlide();
  }

  nextButton?.addEventListener("click", () => {
    nextSlide();
    restartAutoSlide();
  });

  prevButton?.addEventListener("click", () => {
    previousSlide();
    restartAutoSlide();
  });

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      showSlide(index);
      restartAutoSlide();
    });
  });

  slider.addEventListener("mouseenter", stopAutoSlide);
  slider.addEventListener("mouseleave", startAutoSlide);

  let touchStartX = 0;
  slider.addEventListener("touchstart", event => {
    touchStartX = event.changedTouches[0].screenX;
  }, { passive: true });

  slider.addEventListener("touchend", event => {
    const touchEndX = event.changedTouches[0].screenX;
    const difference = touchStartX - touchEndX;

    if (Math.abs(difference) > 45) {
      difference > 0 ? nextSlide() : previousSlide();
      restartAutoSlide();
    }
  }, { passive: true });

  showSlide(0);
  startAutoSlide();
  loadShopUpgrade();
});
