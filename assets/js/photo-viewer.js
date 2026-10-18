/* Full-size photo viewer. Shows original, uncropped files and an overlay watermark. */
(() => {
  let gallery = [];
  let index = 0;
  let lastTrigger = null;
  let touchStart = null;
  function ensureViewer() {
    let viewer = document.getElementById("hbZoomViewer");
    if (viewer) return viewer;
    viewer = document.createElement("div");
    viewer.id = "hbZoomViewer";
    viewer.className = "hb-zoom-viewer";
    viewer.hidden = true;
    viewer.setAttribute("aria-hidden", "true");
    viewer.innerHTML =
      '<div class="hb-zoom-dialog" role="dialog" aria-modal="true" aria-label="Enlarged product photo">' +
        '<button class="hb-zoom-control hb-zoom-close" type="button" data-hb-zoom="close" aria-label="Close enlarged photo">×</button>' +
        '<button class="hb-zoom-control hb-zoom-prev" type="button" data-hb-zoom="prev" aria-label="Previous photo">‹</button>' +
        '<div class="hb-zoom-stage"><div class="hb-zoom-image-frame"><img alt="Enlarged product photo" decoding="async"></div></div>' +
        '<button class="hb-zoom-control hb-zoom-next" type="button" data-hb-zoom="next" aria-label="Next photo">›</button>' +
        '<div class="hb-zoom-toolbar"><span class="hb-zoom-count" aria-live="polite"></span>' +
          '<button class="hb-zoom-action" type="button" data-hb-zoom="size">View original size</button>' +
          '<span>Use arrows to browse · Esc to close</span></div>' +
      '</div>';
    document.body.appendChild(viewer);
    return viewer;
  }
  function isOpen() { return !ensureViewer().hidden; }
  function update() {
    const viewer = ensureViewer(), stage = viewer.querySelector(".hb-zoom-stage");
    const photo = viewer.querySelector(".hb-zoom-image-frame img");
    photo.src = gallery[index];
    photo.alt = "Product photo " + (index + 1) + " of " + gallery.length;
    viewer.querySelector(".hb-zoom-count").textContent = (index + 1) + " / " + gallery.length;
    viewer.querySelector(".hb-zoom-prev").hidden = gallery.length < 2;
    viewer.querySelector(".hb-zoom-next").hidden = gallery.length < 2;
    stage.classList.remove("is-zoomed");
    stage.scrollTop = stage.scrollLeft = 0;
    viewer.querySelector('[data-hb-zoom="size"]').textContent = "View original size";
  }
  function open(trigger) {
    const scope = trigger.closest(".gallery-box") || trigger.closest(".product-detail-body");
    if (!scope) return;
    const thumbnails = Array.from(scope.querySelectorAll(".thumbs [data-thumb] img, .product-detail-thumbs [data-product-thumb] img"));
    gallery = thumbnails.map(img => img.currentSrc || img.src).filter(Boolean);
    if (!gallery.length) gallery = [trigger.currentSrc || trigger.src];
    const chosen = thumbnails.findIndex(img =>
      img.parentElement.classList.contains("active") || img.parentElement.classList.contains("is-active")
    );
    index = chosen >= 0 ? chosen : 0;
    lastTrigger = trigger;
    const viewer = ensureViewer();
    viewer.hidden = false;
    viewer.setAttribute("aria-hidden", "false");
    document.body.classList.add("hb-photo-modal-open");
    update();
    viewer.querySelector(".hb-zoom-close").focus();
  }
  function close() {
    if (!isOpen()) return;
    const viewer = ensureViewer();
    viewer.hidden = true;
    viewer.setAttribute("aria-hidden", "true");
    viewer.querySelector(".hb-zoom-image-frame img").removeAttribute("src");
    document.body.classList.remove("hb-photo-modal-open");
    if (lastTrigger && lastTrigger.isConnected) lastTrigger.focus();
  }
  function move(direction) {
    if (gallery.length < 2) return;
    index = (index + direction + gallery.length) % gallery.length;
    update();
  }
  function toggleSize() {
    const stage = ensureViewer().querySelector(".hb-zoom-stage");
    const zoomed = stage.classList.toggle("is-zoomed");
    ensureViewer().querySelector('[data-hb-zoom="size"]').textContent = zoomed ? "Fit to screen" : "View original size";
    stage.scrollTop = stage.scrollLeft = 0;
  }
  document.addEventListener("click", event => {
    const trigger = event.target.closest("img[data-hb-photo-open]");
    if (trigger) { event.preventDefault(); open(trigger); return; }
    if (!isOpen()) return;
    const control = event.target.closest("[data-hb-zoom]");
    if (control) {
      const action = control.dataset.hbZoom;
      if (action === "close") close();
      if (action === "next") move(1);
      if (action === "prev") move(-1);
      if (action === "size") toggleSize();
    } else if (event.target.id === "hbZoomViewer" || event.target.classList.contains("hb-zoom-stage")) close();
  });
  document.addEventListener("keydown", event => {
    if (!isOpen()) {
      if ((event.key === "Enter" || event.key === " ") && event.target.matches("img[data-hb-photo-open]")) {
        event.preventDefault(); open(event.target);
      }
      return;
    }
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
    if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
    if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
  }, true);
  document.addEventListener("touchstart", event => {
    if (!isOpen() || !event.target.closest(".hb-zoom-stage")) return;
    const t = event.changedTouches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, {passive:true});
  document.addEventListener("touchend", event => {
    if (!isOpen() || !touchStart || !event.target.closest(".hb-zoom-stage")) return;
    const t = event.changedTouches[0], dx = t.clientX - touchStart.x, dy = t.clientY - touchStart.y;
    if (!ensureViewer().querySelector(".hb-zoom-stage").classList.contains("is-zoomed") &&
        Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.2) move(dx < 0 ? 1 : -1);
    touchStart = null;
  }, {passive:true});
})();