# HB Gadget BD — Order workflow update

This directory contains **source files, not a live deployment**. The existing Google Apps Script web app handles checkout, payment-proof uploads, PDF receipt generation, and order tracking. Its source is not exposed to the connected Drive/GitHub tools.

## Status
- Google Sheet **Orders**: dropdowns installed for Status (D), Bangla Status (E), Payment Method (K), and Courier (M).
- Google Sheet **Pending_order**: currently a read-only live FILTER view of undelivered orders. Do **not edit** its formula results until script initialization.
- Website order tracker: updated for Packed, Out for Delivery, Returned, On Hold and to show less personal information.
- **NOT YET LIVE**: two-way editing, mobile+serial Order IDs, redesigned PDF invoices.

## One-time setup (owner action needed)
1. Open the actual [HB Gadget BD Orders workbook](https://docs.google.com/spreadsheets/d/1T_7qOVesNqfP3H0M774q_UxBvNXIS6KuoMquVHpPgC4/edit) → **Extensions → Apps Script**.
2. **Back up the existing Code.gs first.** Do not delete or replace its doGet/doPost/payment/email functions.
3. Add **HBOrdersAddon.gs** and **HBInvoiceTemplate.html** as new project files; paste the content from this directory.
4. Execute `hbInstallPendingOrderSync()` once, grant the required spreadsheet + trigger permissions. It will convert Pending_order from a formula view into an **editable** snapshot, synchronize edits back into Orders, and install a five-minute fallback refresh for orders created by the existing checkout.
5. Edit the **existing doPost create-order code**. Use `hbNextCustomerOrderId_(phone, sheet)` and save the returned Order ID **as text**. Hold `LockService.getScriptLock()` throughout reading/generating the ID and appending the order row. Ignore the provisional long numeric ID coming from the checkout browser. The first order for a phone ends in 1, the second ends in 2, etc. Do not retrospectively change old IDs.
6. After appendRow and payment-proof handling, call `hbRefreshPendingOrders()` for immediate appearance in Pending_order.
7. Replace **receipt** PDF creation with `hbCreateInvoicePdf_(order, invoiceFolderId)`. Store the returned URL in the existing link column (S) and email its blob with the existing email routine. Update the generated file title, message subject and visible PDF heading to **Invoice**. Keep existing integrations, proof uploads and notifications intact.
8. **Deploy → Manage deployments → Edit → New version → Deploy**. Test a new order with a test account. Do not publish a checkout success until Apps Script confirms a saved row and returns the server-generated order ID.

## Staff workflow
Only edit columns D (Status), E (Bangla Status), K (Payment Method), M (Courier), N (Tracking Number), or O (Note) in Pending_order after the add-on is installed. Updates automatically apply to the master Orders row by matching Order ID, and refresh the pending list. Delivered/Cancelled/Returned disappear from Pending_order but remain in Orders. Direct changes in Orders also refresh Pending_order. The website's existing track endpoint reads the master Orders sheet.

## Important privacy/engineering notes
- **A full mobile number within an Order ID is personally identifying and predictable.** This exact user-requested format should only be used if the public tracking endpoint returns limited order-status data, not phone/email/address/payment-proof links. A randomly generated order ID would be safer.
- Preserve Order ID and phone as text to retain leading zeroes; serial IDs can exceed safe JS integer precision after many orders, so JSON must use strings.
- No Apps Script deployment, old-PDF replacement, or historical Order ID migration is performed by merely committing these files to GitHub.
