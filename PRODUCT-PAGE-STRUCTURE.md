# HB Gadget BD Product Page Structure

Use this structure whenever adding a new product to `assets/data/products.json`.

Each product page should answer customer questions and reduce unnecessary inbox messages.

## Required product sections

| Section | What to include |
| --- | --- |
| Product title | SEO-friendly name, for example: `Mini Router UPS for Wi-Fi Backup During Load-Shedding` |
| Short description | 2–3 lines explaining the daily problem it solves |
| Key benefits | 4–6 bullet points |
| Specifications | Brand, model, battery, voltage, size, material, warranty |
| Who should buy | Target customer segment |
| What is included | Box contents and accessories |
| Important note | Limitations, compatibility, warranty conditions |
| Delivery info | COD/advance payment, courier, delivery time |
| WhatsApp support | Contact option before order confirmation |
| Return, Exchange & Warranty Policy | Standard HB Gadget BD product policy shown automatically |

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

## Product JSON template

```json
{
  "id": 1,
  "name": "Mini Router UPS for Wi-Fi Backup During Load-Shedding",
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
  "description": "Keeps your Wi-Fi router running for a limited time during load-shedding so you can stay connected at home or office.",
  "shortDescription": "A practical backup solution for Wi-Fi users during load-shedding in Bangladesh.",
  "benefits": [
    "Helps keep router power running during short outages",
    "Useful for online classes, office work, and home internet",
    "Compact size for desk or router area",
    "Easy to connect with compatible router models"
  ],
  "specifications": {
    "Brand": "To be confirmed",
    "Model": "To be confirmed",
    "Battery": "To be confirmed",
    "Voltage": "Check router compatibility before order",
    "Warranty": "Supplier/brand warranty only if available"
  },
  "whoShouldBuy": [
    "Home Wi-Fi users",
    "Online students",
    "Remote workers",
    "Small office users"
  ],
  "included": [
    "1 x Router UPS",
    "Compatible connector/accessories if supplied by seller"
  ],
  "importantNote": [
    "Backup time depends on router power consumption and battery capacity",
    "Check voltage and connector compatibility before order confirmation"
  ],
  "deliveryInfo": [
    "Inside Dhaka and nationwide courier available",
    "Delivery charge added at checkout",
    "COD/advance payment rules will be confirmed before final order"
  ],
  "whatsappSupport": "Message HB Gadget BD on WhatsApp before final order confirmation if you need compatibility support.",
  "rating": "Not rated yet",
  "reviews": "0",
  "sold": "0",
  "stock": "Available",
  "location": "Bangladesh"
}
```

## Standard policy shown on the website

| Issue | Policy |
| --- | --- |
| Product damaged on arrival | Exchange within 24–48 hours after receiving proof |
| Wrong product delivered | Free replacement |
| Customer changed mind | Return accepted only if unopened; delivery cost is not refundable |
| Electronics warranty | Supplier/brand warranty only |
| Burnt/damaged due to misuse | No warranty |
| Water purifier used/installed | Return not accepted unless defective |
