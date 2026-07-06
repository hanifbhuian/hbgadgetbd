function openProductDetails(productId) {
  if (!productId) return;
  const url = `product.html?id=${encodeURIComponent(productId)}`;
  window.open(url, "_blank", "noopener");
}

window.openProductDetails = openProductDetails;
