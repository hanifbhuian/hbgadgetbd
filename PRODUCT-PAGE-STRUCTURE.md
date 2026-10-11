# HB Gadget BD Product Page Structure

Use this structure whenever adding a new product to `assets/data/products.json`.

Each product page should answer the most important customer questions in a simple, easy-to-scan format.

## Product page format

| Section | What to include |
| --- | --- |
| Product title | SEO-friendly product name |
| Short description | 1–3 lines explaining the product and the daily problem it solves |
| Product Details | One simple bullet list. Include the most useful benefits/features, important specifications, and box contents. Avoid many separate subsections. |
| Tutorials | Add real tutorial/video links only when available |
| Search tags / keywords | 6–12 accurate, product-specific search phrases shown in very small muted text at the end of Product Details and used for page metadata |
| Return, Exchange & Warranty Policy | Standard HB Gadget BD policy shown automatically |

### Product Details style

Keep **Product Details** simple, similar to a clean marketplace bullet list.

Use:
- 4–6 useful benefit/feature bullets when possible
- Important specifications such as brand, model, capacity, voltage, size, material, compatibility, or warranty when relevant
- One **What is included:** bullet for box contents/accessories
- Clear product-specific information only

Do **not** create separate customer-facing subsections for:
- Who should buy
- Important note
- Delivery info
- WhatsApp support

Under the Product Details list, the website automatically shows:

**Need help using this product? — Contact Support**

## Price rule

For customer attraction, show both regular and discount price when possible.

Use:

```json
"regularPrice": 1250,
"price": 990
```

The website uses `price` as the selling/discount price and `regularPrice` as the crossed-out old price.

Supported alternatives if needed:

```json
"oldPrice": 1250,
"originalPrice": 1250,
"mrp": 1250,
"compareAtPrice": 1250,
"discountPrice": 990,
"salePrice": 990,
"offerPrice": 990
```

## Recommended product JSON template

```json
{
  "id": 1,
  "name": "Product Name",
  "category": "Power & Safety",
  "subCategory": "Power & Safety",
  "regularPrice": 1250,
  "price": 990,
  "icon": "🔋",
  "tag": "Offer",
  "image": "assets/uploads/product-image.png",
  "images": [
    "assets/uploads/product-image.png"
  ],
  "description": "A short product-specific description explaining what it does and the practical problem it helps solve.",
  "shortDescription": "A concise 1–3 line summary.",
  "benefits": [
    "Main useful benefit or feature",
    "Second practical benefit or feature",
    "Third practical benefit or feature",
    "Compatibility or safety-related benefit when relevant"
  ],
  "specifications": {
    "Brand": "Brand name",
    "Model": "Model number",
    "Capacity": "If applicable",
    "Voltage": "If applicable",
    "Material": "If applicable",
    "Warranty": "Supplier/brand warranty only if available"
  },
  "included": [
    "1 x Main product",
    "Included accessory if supplied"
  ],
  "seoKeywords": [
    "main product search phrase",
    "product category Bangladesh",
    "brand model search phrase",
    "problem-solving search phrase"
  ],
  "seoTitle": "SEO-friendly product title | HB Gadget BD",
  "seoDescription": "Concise product-specific search description for Bangladesh customers.",
  "tutorials": [],
  "rating": "Not rated yet",
  "reviews": "0",
  "sold": "0",
  "stock": "Available",
  "location": "Bangladesh"
}
```

Only include specifications that actually apply to the product. Do not invent missing technical information.

## Standard policy shown on the website

| Issue | Policy |
| --- | --- |
| Product damaged on arrival | Exchange within 24–48 hours after receiving proof |
| Wrong product delivered | Free replacement |
| Customer changed mind | Return accepted only if unopened; delivery cost is not refundable |
| Electronics warranty | Supplier/brand warranty only |
| Burnt/damaged due to misuse | No warranty |
| Water purifier used/installed | Return not accepted unless defective |

## Search keyword rule

For every new product, add a short `seoKeywords` list using only relevant phrases customers are likely to search. Prefer natural phrases such as product type + use case + Bangladesh/BD where appropriate. Avoid unrelated keywords and keyword stuffing. The website displays these as small muted tags at the end of Product Details and also uses them for product-page metadata.
