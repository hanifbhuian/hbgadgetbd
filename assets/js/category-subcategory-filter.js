function getProductSubCategory(product) {
  return product.subCategory || product.subcategory || product.sub_category || "";
}

function productMatchesCategoryFilter(product, filter) {
  const category = String(product.category || "").trim();
  const subCategory = String(getProductSubCategory(product) || "").trim();

  if (!filter || filter === "All") return true;
  if (filter === "Daily Life") {
    return category === "Daily Life" || ["Backup", "Protection", "Health & Safety"].includes(subCategory);
  }

  return category === filter || subCategory === filter;
}

function getFilteredProducts() {
  return products.filter(product => {
    const matchesCategory = productMatchesCategoryFilter(product, state.filter);
    const query = state.search.trim().toLowerCase();
    const searchableText = [
      product.name,
      product.category,
      getProductSubCategory(product),
      product.description,
      ...(Array.isArray(product.details) ? product.details : [])
    ].join(" ").toLowerCase();
    const matchesSearch = !query || searchableText.includes(query);
    return matchesCategory && matchesSearch;
  });
}
