# HB Gadget BD checkout promotion guide

## Active offer

Promotion code: **FIRE100** (case-insensitive)
Discount: **BDT 100 for EACH eligible product unit** (not once per order).
Eligible products, using the current website selling price:

- MG Mini DC UPS – 10000mAh Network Power Bank — BDT 1,699 -> BDT 1,599
- MG Mini DC UPS – 16000mAh Network Power Bank — BDT 2,199 -> BDT 2,099
- Miyako 2.0L Cordless Electric Kettle (1800W) — BDT 1,399 -> BDT 1,299

All other product prices are unchanged. Mixed carts discount only eligible units.
Delivery: inside Dhaka BDT 60; outside Dhaka BDT 130. COD and manual prepaid
payment-verification logic are unchanged.

## Turning FIRE100 off or on without removing the box

Edit \`functions/lib/promotions.js\`, find \`FIRE100\`, set
\`enabled: false\` to stop or \`enabled: true\` to resume, commit on \`main\`,
and confirm successful **Cloudflare Pages** deployment. Do not touch separate
Workers or Netlify projects. The promotion field stays visible even when there
is no active code; customers get an inactive-code message and pay normal prices.

For another code, add an offer to \`PROMOTIONS\` in the same file, with
\`enabled\`, \`discountPerUnit\`, and \`eligibleProducts\` as exact product
names mapped to their CURRENT selling prices. Ensure new prices are updated
in this config whenever the online product selling price changes.

## Data, invoices, accounting

Checkout shows product subtotal, negative promotion discount, discounted
subtotal, delivery and payable total. The Pages order API validates code,
eligible product names, unit prices, quantities, total discount and net
subtotal **before** forwarding to the existing Google Apps Script.

The Orders tab stores the discounted amount in its existing Subtotal (K)
and delivery in L; M retains the live =SUM(K:L) formula. Pending_order J
continues to look up M by Order ID. No historical orders or columns change.

To preserve promotion information across **all three existing PDF invoice
stages without replacing live Code.gs or HBInvoiceTemplate**, the Pages API
writes the verified promotion code and **BDT 100 off/unit** beside each
discounted product in the existing Items field, and stores discounted
line amounts. The PDF product lines therefore display the code and discount,
while its Subtotal and Total show the net payable amounts. No fake paid status.
Internal Note also contains code and total discount, but customer notes are
not overwritten.

## Safe verification (do not create production orders casually)

- At checkout, add one eligible UPS: FIRE100 reduces product subtotal by BDT 100.
- Mixed cart: noneligible products remain full price; two eligible items get BDT 200 off.
- Two of one eligible item get BDT 200 off.
- Invalid/inactive codes must not reduce total.
- No code means original product pricing.
- Payment due (COD/bKash/Nagad) reflects discounted total and correct shipping.
- PDF line items must show "FIRE100: BDT 100 off/unit"; confirm invoice PDF
  and real message receipt with a controlled safe test before claiming the
  live invoice path has been fully exercised.
- Avoid order creation with real customer identities; do not change any
  active Apps Script triggers, payment settings, inventory sync or order rows.

## Rollback

Change \`enabled: false\` and deploy; the input remains. If the promo API
cannot be reached, no discount is applied; checkout still works with normal
prices. Existing discounted orders retain their original discounted
amounts and historical invoice PDFs.
