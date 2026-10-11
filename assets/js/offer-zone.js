// Offer Zone displays only real price reductions, using current product data.
const HB_CATALOG_PATH="assets/data/products.json";
const HB_RAW_CATALOG="https://raw.githubusercontent.com/hanifbhuian/hbgadgetbd/main/"+HB_CATALOG_PATH;
function safe(value){return String(value??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
function valueNum(value){if(value===undefined||value===null||value==="")return 0;const n=Number(String(value).replace(/[^0-9.]/g,""));return Number.isFinite(n)?n:0;}
function currentPrice(p){return valueNum(p.discountPrice??p.salePrice??p.offerPrice??p.price);}
function previousPrice(p){return valueNum(p.regularPrice??p.oldPrice??p.originalPrice??p.mrp??p.compareAtPrice);}
function formatted(n){return "৳"+Number(n).toLocaleString("en-BD");}
function imgUrl(p){
  const first=Array.isArray(p.images)&&p.images.length?p.images[0]:p.image;
  if(!first)return "";
  if(String(first).startsWith("assets/"))return first;
  if(/^https:\/\//i.test(first))return first;
  return "";
}
function discounted(products) {
  return products.map(p=>{const sale=currentPrice(p),regular=previousPrice(p);
    return {...p,sale,regular,discount:regular>sale&&sale>0?(regular-sale)/regular*100:0};
  }).filter(p=>p.discount>0).sort((a,b)=>b.discount-a.discount || a.sale-b.sale);
}
async function loadOffers() {
  const grid=document.getElementById("offerGrid"),count=document.getElementById("offerCount");
  try {
    let catalog;
    for(const url of [HB_RAW_CATALOG,HB_CATALOG_PATH]){
      try{
        const r=await fetch(url+"?v="+Date.now(),{cache:"no-store"});
        if(!r.ok)throw Error("Catalogue unavailable");
        catalog=await r.json();break;
      }catch(error){console.warn("Offer catalogue source:",error);}
    }
    if(!catalog||!Array.isArray(catalog.products))throw Error("Product catalogue could not be loaded.");
    const offers=discounted(catalog.products);
    count.textContent=offers.length===1?"1 discounted product":offers.length+" discounted products";
    if(!offers.length){
      grid.innerHTML='<div class="hb-offers-empty"><h2>No active discounts right now</h2><p>New offers will appear automatically when a product has a genuine reduced selling price.</p><a href="/#products">Browse all products</a></div>';return;
    }
    grid.innerHTML=offers.map(p=>{
      const image=imgUrl(p),pct=Math.round(p.discount);
      return `<a class="hb-offer-card" href="product.html?id=${encodeURIComponent(p.id)}" aria-label="View ${safe(p.name)}">
        <span class="hb-offer-off">${pct}% OFF</span>
        <div class="hb-offer-image">${image?`<img src="${safe(image)}" alt="${safe(p.name)}" loading="lazy">`:'<span aria-hidden="true">🛍️</span>'}</div>
        <div class="hb-offer-body"><small>${safe(p.category||"Gadgets")}</small><h2>${safe(p.name)}</h2>
          <p><strong>${formatted(p.sale)}</strong> <del>${formatted(p.regular)}</del></p>
          <span>You save ${formatted(p.regular-p.sale)} · View product →</span>
        </div></a>`;
    }).join("");
  }catch(e){count.textContent="Unable to load offers.";grid.innerHTML='<div class="hb-offers-empty"><p>Offers are temporarily unavailable. Please try again shortly.</p><a href="/#products">Browse products</a></div>';}
}
loadOffers();