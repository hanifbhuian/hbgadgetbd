function positionFacebookButton() {
  const isMobile = window.matchMedia("(max-width: 640px)").matches;
  const facebookButton = document.getElementById("hbTopFacebookLink");
  const headerActions = document.querySelector(".header-actions");
  const categoryNav = document.querySelector(".category-nav__inner");

  if (!facebookButton) return;

  if (isMobile) {
    facebookButton.classList.remove("hb-facebook-nav-placement");
    if (headerActions && facebookButton.parentElement !== headerActions) {
      headerActions.appendChild(facebookButton);
    }
    return;
  }

  if (categoryNav) {
    facebookButton.classList.add("hb-facebook-nav-placement");
    if (facebookButton.parentElement !== categoryNav) {
      categoryNav.appendChild(facebookButton);
    } else if (categoryNav.lastElementChild !== facebookButton) {
      categoryNav.appendChild(facebookButton);
    }
  }
}

function applyMobileCartFix() {
  const isMobile = window.matchMedia("(max-width: 640px)").matches;
  const total = document.getElementById("cartTotal")?.textContent || "৳0";
  const label = document.getElementById("cartSummaryLabel");
  const cartButton = document.getElementById("openCart");

  if (label) {
    label.textContent = isMobile ? total : `${total} Cart`;
  }

  if (cartButton) {
    cartButton.classList.add("mobile-cart-single-line");
  }

  positionFacebookButton();
}

function injectMobileCartStyle() {
  if (document.getElementById("mobileCartSingleLineStyle")) return;

  const style = document.createElement("style");
  style.id = "mobileCartSingleLineStyle";
  style.textContent = `
    .category-nav__inner .hb-facebook-nav-placement {
      flex: 0 0 auto !important;
      min-height: 40px !important;
      padding: 8px 14px !important;
      margin: 0 !important;
      align-self: center !important;
      box-shadow: 0 7px 16px rgba(24, 119, 242, 0.18) !important;
    }

    @media (max-width: 640px) {
      .header-actions {
        display: grid !important;
        grid-template-columns: 1fr .88fr 1fr auto !important;
        gap: 7px !important;
        width: 100% !important;
        flex-wrap: nowrap !important;
      }

      .header-actions .hotline-chip,
      .header-actions .cart-button,
      .header-actions .account-button {
        min-width: 0 !important;
        width: 100% !important;
        min-height: 54px !important;
        padding: 6px 5px !important;
        font-size: clamp(13px, 3.8vw, 16px) !important;
        white-space: nowrap !important;
        overflow: hidden !important;
      }

      .header-actions .cart-button {
        gap: 3px !important;
        flex-wrap: nowrap !important;
      }

      .header-actions .cart-button strong {
        display: inline !important;
        white-space: nowrap !important;
        font-size: clamp(12px, 3.6vw, 15px) !important;
        line-height: 1 !important;
        max-width: none !important;
        word-break: keep-all !important;
        overflow-wrap: normal !important;
      }

      .header-actions .cart-button span {
        min-width: 22px !important;
        height: 22px !important;
        font-size: 11px !important;
        flex: 0 0 auto !important;
      }
    }
  `;

  document.head.appendChild(style);
}

function initMobileCartFix() {
  injectMobileCartStyle();
  applyMobileCartFix();
  window.addEventListener("resize", applyMobileCartFix);
  window.setInterval(applyMobileCartFix, 500);
}

document.addEventListener("DOMContentLoaded", initMobileCartFix);
initMobileCartFix();
