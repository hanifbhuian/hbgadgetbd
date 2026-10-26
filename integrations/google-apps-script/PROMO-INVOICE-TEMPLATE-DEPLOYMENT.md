# Make promotion discount a separate invoice totals row

## What changed

Template: \`integrations/google-apps-script/HB_Gadget_BD_Invoice_Template_UPDATED.html\`.

The Cloudflare Pages checkout already writes a validated tag into each eligible product's Items description, e.g.
\`MG Mini DC UPS – 10000mAh Network Power Bank (FIRE100: BDT 100 off/unit)\`.

In the existing Apps Script, \`hbCreateInvoice_\` loads \`HBInvoiceTemplate\` and provides parsed \`data.items\` plus NET \`data.subtotal\`. The revised HTML template derives the promo code and amount from that existing item data. No update to \`Code.gs\`, Orders columns, pending orders, inventory, emails or payment verification is required.

**Example for 1 UPS, outside Dhaka:**
- Product Subtotal: BDT 1,699
- Promotion (FIRE100): - BDT 100
- Discounted Subtotal: BDT 1,599
- Delivery charge: BDT 130
- Total: BDT 1,729

Orders with no promo continue showing one Subtotal row; the Amounts, payment statuses, Paid (verified) and Balance due remain unchanged. The same HTML template is used for Received, Confirmed and Delivered PDFs.

## Apply to EXISTING live Apps Script

1. Open HB Gadget BD Orders spreadsheet -> Extensions -> Apps Script.
2. Open the existing HTML file **HBInvoiceTemplate** (not Code.gs).
3. Back up its exact current contents privately. Do not copy script properties or tokens to GitHub.
4. Compare with the template screenshot/current layout, then apply changes:
   - add \`.promo-discount td\` and \`.discounted-subtotal td\` CSS;
   - replace the totals-table block with the promo-aware table from the GitHub file linked above.
   - If the live template exactly matches the repo's updated template from before this change, copying the complete updated HTML into \`HBInvoiceTemplate\` is also acceptable.
5. Save. Deploy -> Manage deployments -> Edit existing web-app deployment -> **New version** -> Deploy. Preserve the existing execute-as/access settings and exact /exec URL. Do NOT create another web-app deployment.
6. Use a controlled test case or inspect a subsequently generated invoice to confirm it shows separate promo lines. Do not alter an existing customer's order, trigger, invoice PDF, payment status or historical reporting to test.

**Important:** Already generated Google Drive PDFs are fixed historical documents; deploying HTML does not rewrite them. A subsequent new invoice (including later invoice stages for the same order) uses the updated template. Old invoices need controlled regeneration if correction is required; do not automatically overwrite them.

## Validation

Isolated template logic was evaluated for:
- a single FIRE100 UPS (1699 gross, 100 discount, 1599 net),
- two eligible units (200 discount),
- a mixed 3-eligible-unit cart (300 discount),
- an order with no promo (original subtotal only),
- inconsistent codes within one invoice (safely no promo row).

These are **mocked template calculations**, not live Apps Script PDF-generation or email tests.
