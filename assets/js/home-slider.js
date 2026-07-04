document.addEventListener("DOMContentLoaded", () => {
  const slider = document.querySelector(".homepage-slider");
  if (!slider) return;

  const slides = Array.from(slider.querySelectorAll(".slide"));
  const dots = Array.from(slider.querySelectorAll(".slider-dot"));
  const prevButton = slider.querySelector("[data-slide-action='prev']");
  const nextButton = slider.querySelector("[data-slide-action='next']");

  if (!slides.length) return;

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
});
