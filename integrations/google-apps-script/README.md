## Orders schema and invoice workflow update (2026-10-11)

The Orders Google Sheet is reorganized, hidden legacy data is backed up, existing invoice PDFs are in verified stage folders, and the [deployment guide](INVOICE-LIFECYCLE-DEPLOYMENT.md) explains the remaining Pending_order migration and Apps Script rollout. **The Google Apps Script backend is not deployed by the GitHub commit.**

# HB Gadget BD — Current deployment status (October 2026)

The owner's Apps Script screenshot confirms **Version 12 deployed successfully** on October 9, 2026. The Google Sheets `setupHBOrders` routine was run earlier and the owner confirmed that `Pending_order` edits update `Orders`.

The storefront has been changed to use these same-origin Cloudflare Pages Functions:
- `GET /api/orders/track?orderId=...` reads public status-only fields from Apps Script.
- `POST /api/orders/create` submits a checkout once and requires a server-confirmed mobile+serial Order ID.

Both API Functions now target the **Version 12 deployment ID visible in the owner's deployment screenshot**. Checkout uses `assets/js/order-placement.js`; tracking uses `assets/js/order-tracking.js`.

**Live end-to-end confirmation is still pending.** Check that Google Apps Script deployment access is **Anyone**, and test existing Order ID lookup, a new checkout, the invoice email, and pending-order synchronization.

**Do not paste the older add-on over the current integrated Code.gs.** The `HBOrdersAddon.gs` and template files in this directory were pre-integration helpers and are retained for reference only. The live Google Apps Script uses the full replacement `Code.gs` installed by the owner.

The current website code preserves older timestamp-based Order IDs for tracking. Only new orders receive mobile+serial IDs; old invoice documents are not regenerated automatically.

---

## Historical pre-integration notes (reference only)

# HB Gadget BD — Order workflow update

This directory contains **source files, not a live deployment**. The existing Google Apps Script web app handles checkout, payment-proof uploads, PDF receipt generation, and order tracking. Its source is not exposed to the connected Drive/GitHub tools.

## Status
- Google Sheet **Orders**: dropdowns installed for Status (D), Bangla Status (E), Payment Method (K), and Courier (M).
- Google Sheet **Pending_order**: reduced to exactly six columns (A Order ID, B Customer Name, C Status, D Bangla Status, E Payment Method, F Courier). The four dropdowns match the corresponding columns in Orders. It is currently a read-only live FILTER view of undelivered orders. Do **not edit** its formula results until script initialization.
- Website order tracker: updated for Packed, Out for Delivery, Returned, On Hold and to show less personal information.
- **NOT YET LIVE**: two-way editing, mobile+serial Order IDs, redesigned PDF invoices.

## One-time setup (owner action needed)
1. Open the actual [HB Gadget BD Orders workbook](https://docs.google.com/spreadsheets/d/1T_7qOVesNqfP3H0M774q_UxBvNXIS6KuoMquVHpPgC4/edit) → **Extensions → Apps Script**.
2. **Back up the existing Code.gs first.** Do not delete or replace its doGet/doPost/payment/email functions.
3. Add **HBOrdersAddon.gs** and **HBInvoiceTemplate.html** as new project files; paste the content from this directory.
4. Execute `hbInstallPendingOrderSync()` once, grant the required spreadsheet + trigger permissions. It will convert the six-column Pending_order from a formula view into an **editable** snapshot, synchronize edits back into Orders using exact Order ID matching, automatically translate changes between English and Bangla statuses, and install a five-minute fallback refresh for orders created by the existing checkout.
5. Edit the **existing doPost create-order code**. Use `hbNextCustomerOrderId_(phone, sheet)` and save the returned Order ID **as text**. Hold `LockService.getScriptLock()` throughout reading/generating the ID and appending the order row. Ignore the provisional long numeric ID coming from the checkout browser. The first order for a phone ends in 1, the second ends in 2, etc. Do not retrospectively change old IDs.
6. After appendRow and payment-proof handling, call `hbRefreshPendingOrders()` for immediate appearance in Pending_order.
7. Replace **receipt** PDF creation with `hbCreateInvoicePdf_(order, invoiceFolderId)`. Store the returned URL in the existing link column (S) and email its blob with the existing email routine. Update the generated file title, message subject and visible PDF heading to **Invoice**. Keep existing integrations, proof uploads and notifications intact.
8. **Deploy → Manage deployments → Edit → New version → Deploy**. Test a new order with a test account. Do not publish a checkout success until Apps Script confirms a saved row and returns the server-generated order ID.

## Staff workflow
After installation, staff should edit only C (Status), D (Bangla Status), E (Payment Method) or F (Courier) in Pending_order. Columns A (Order ID) and B (Customer Name) are identifiers sourced from Orders and should not be edited. Updates automatically apply to Orders!D, Orders!E, Orders!K and Orders!M by matching Order ID, and the pending list refreshes. Delivered/Cancelled/Returned disappear from Pending_order but remain in Orders. Direct changes in Orders also refresh Pending_order. Changing either English or Bangla status automatically translates the other status. The website's existing track endpoint reads the master Orders sheet. Additional details such as tracking number and notes remain in Orders and are not editable from Pending_order.

## Important privacy/engineering notes
- **A full mobile number within an Order ID is personally identifying and predictable.** This exact user-requested format should only be used if the public tracking endpoint returns limited order-status data, not phone/email/address/payment-proof links. A randomly generated order ID would be safer.
- Preserve Order ID and phone as text to retain leading zeroes; serial IDs can exceed safe JS integer precision after many orders, so JSON must use strings.
- No Apps Script deployment, old-PDF replacement, or historical Order ID migration is performed by merely committing these files to GitHub.

## Six-column mapping

| Pending_order | Purpose | Orders master column | Staff edits |
|---|---|---|---|
| A | Order ID | A | No |
| B | Customer Name | C | No |
| C | Status | D | Yes, dropdown |
| D | Bangla Status | E | Yes, dropdown |
| E | Payment Method | K | Yes, dropdown |
| F | Courier | M | Yes, dropdown |

The live formula view is intentionally **not editable** until the installable trigger is created. Do not delete the FILTER formula or manually overwrite it ahead of activation.
