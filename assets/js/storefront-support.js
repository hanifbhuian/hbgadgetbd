// HB Gadget BD — consistent, accessible contact popup used by home and product pages.
(() => {
  const PHONE = "+8801816569237";
  const EMAIL = "support@hbgadgetbd.com";
  const style = document.createElement("style");
  style.textContent = `
    .hb-contact-overlay { position:fixed; inset:0; background:rgba(15,23,42,.55); z-index:2000; display:none; align-items:center; justify-content:center; padding:16px; }
    .hb-contact-overlay.is-open {display:flex}
    .hb-contact-dialog { background:#fff; color:#172033; width:min(440px,100%); border-radius:20px; padding:24px; box-shadow:0 20px 60px rgba(0,0,0,.2); position:relative; }
    .hb-contact-dialog h2 {font-size:21px; margin:0 40px 8px 0;}
    .hb-contact-dialog p {color:#5b667a; margin:0 0 14px; line-height:1.5}
    .hb-contact-row {display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin:12px 0; padding:12px; background:#f6f8fc; border-radius:12px; }
    .hb-contact-row strong {flex:1; min-width:175px; word-break:break-all;}
    .hb-contact-row button {background:#174b9e; color:white; border:0; border-radius:9px; padding:9px 13px; cursor:pointer; font-weight:700;}
    .hb-contact-dismiss {position:absolute;top:12px;right:13px;background:#eff2f8;border:0;border-radius:50%;width:34px;height:34px;cursor:pointer;font-size:22px;}
    .hb-contact-note {font-size:12px;color:#51627d}
    .hb-contact-status {font-size:13px;min-height:16px;color:#14532d}
    .header-actions {display:flex; align-items:center; justify-content:flex-end;gap:9px;}
    .header-actions .hotline-chip, .header-actions .account-button {background:#fff;border:1px solid #dce4f2;border-radius:999px;padding:10px 13px;color:#174078;font-weight:800;cursor:pointer;white-space:nowrap;min-height:42px;}
    .header-actions .account-button {display:inline-flex;align-items:center;flex-direction:column;line-height:1.1;text-align:center;}
    .header-actions .account-button small {font-size:10px; color:#66748b;}
    .header-actions .cart-button {white-space:nowrap;display:inline-flex;gap:5px;align-items:center;justify-content:center}
    .hb-footer-social {display:flex;align-items:center;gap:10px;margin-top:14px;}
    .hb-footer-social a,.hb-footer-social span {display:inline-grid;place-items:center;width:38px;height:38px;border-radius:50%;font-weight:900;font-size:20px;color:#fff;}
    .hb-footer-social a {background:#1877f2;text-decoration:none;margin:0;}
    .hb-footer-social .hb-footer-social__youtube {background:#f00;opacity:1;cursor:pointer;}
    @media(max-width:1100px) and (min-width:641px) {
      .header__inner:not(.marketplace-header) {grid-template-columns:1fr;gap:10px;padding:12px 0}
      .header__inner:not(.marketplace-header) .header-actions {justify-content:flex-start;}
    }
    @media(max-width:640px) {
      .header-actions .hotline-chip,.header-actions .account-button,.header-actions .cart-button {min-width:0;width:100%;padding:6px 5px;font-size:clamp(12px,3.4vw,15px);min-height:48px}
      .header-actions .account-button small {font-size:10px}
    }
    .hb-top-facebook-link { width:38px !important;height:38px !important; min-width:38px !important; min-height:38px !important; padding:0 !important;border-radius:50% !important; background:#1877f2 !important;color:#fff !important;display:inline-flex !important;align-items:center !important;justify-content:center !important; }
    .hb-top-facebook-link .hb-fb-mark {font:bold 23px Arial,sans-serif !important;}
    .hb-top-facebook-link .hb-fb-name {display:none !important;}
    .header-actions #hbTopFacebookLink {flex:0 0 38px !important;}
    @media(max-width:640px){.header-actions {grid-template-columns:minmax(65px,1fr) minmax(100px,1.25fr) minmax(75px,1fr) 38px !important;}}
  `;
  document.head.appendChild(style);
  let lastTrigger = null;
  function element() {
    let overlay = document.getElementById("hbContactOverlay");
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.id = "hbContactOverlay";
    overlay.className = "hb-contact-overlay";
    overlay.innerHTML = `<div class="hb-contact-dialog" role="dialog" aria-modal="true" aria-labelledby="hbContactTitle">
      <button type="button" class="hb-contact-dismiss" data-contact-close aria-label="Close contact information">×</button>
      <h2 id="hbContactTitle">HB Gadget BD Support</h2><p id="hbContactIntro">Choose how to contact our team.</p>
      <div class="hb-contact-row"><strong id="hbContactPhone">+8801816569237</strong><button type="button" data-contact-copy="phone">Copy number</button></div>
      <div class="hb-contact-row" data-support-email><strong id="hbContactEmail">support@hbgadgetbd.com</strong><button type="button" data-contact-copy="email">Copy email</button></div>
      <small class="hb-contact-note">WhatsApp is available on this number.</small><p class="hb-contact-status" id="hbContactStatus" role="status" aria-live="polite"></p>
    </div>`;
    document.body.appendChild(overlay);
    return overlay;
  }
  function close() {
    const o = document.getElementById("hbContactOverlay");
    if (!o) return;
    o.classList.remove("is-open");
    if (lastTrigger && lastTrigger.isConnected) lastTrigger.focus();
  }
  function open(mode, trigger) {
    const o = element();
    lastTrigger = trigger;
    const hotline = mode === "hotline";
    o.querySelector("#hbContactTitle").textContent = hotline ? "Hotline" : "Contact Support";
    o.querySelector("#hbContactIntro").textContent = hotline ? "+8801816569237 (WhatsApp available)" : "Copy the phone number or email below to contact our support team.";
    o.querySelector("[data-support-email]").hidden = hotline;
    o.querySelector("#hbContactStatus").textContent = "";
    o.classList.add("is-open");
    o.querySelector("[data-contact-close]").focus();
  }
  async function copy(value, button) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value);
      document.getElementById("hbContactStatus").textContent = "Copied successfully.";
    } catch {
      document.getElementById("hbContactStatus").textContent = "Copy this: " + value;
      const selection = document.createElement("input");
      selection.value=value; document.body.appendChild(selection);selection.select();
      try {document.execCommand("copy");} catch {}
      selection.remove();
    }
  }
  document.addEventListener("click", event => {
    const trigger = event.target.closest("[data-contact-panel]");
    if (trigger) {event.preventDefault(); open(trigger.dataset.contactPanel || "support",trigger); return;}
    const copyButton = event.target.closest("[data-contact-copy]");
    if (copyButton) {copy(copyButton.dataset.contactCopy === "email" ? EMAIL : PHONE,copyButton); return;}
    if (event.target.matches("#hbContactOverlay") || event.target.closest("[data-contact-close]")) close();
  });
  document.addEventListener("keydown", event => {if(event.key === "Escape" && document.getElementById("hbContactOverlay")?.classList.contains("is-open")) close();});
  const updateFooterYear=()=>document.querySelectorAll("[data-hb-footer-year]").forEach(node=>{node.textContent=String(new Date().getFullYear());});
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",updateFooterYear); else updateFooterYear();
})();
