# HB Gadget BD — Three-stage invoices (11 Oct 2026)

## Important: website vs invoice backend
Invoices and lifecycle emails are generated in the **Google Apps Script** project bound to the HB Gadget BD Orders workbook. Merely committing these files to GitHub does **not** update the deployed Apps Script. Deploy the two matching files below to activate all invoice stages.

## Files
- `HB_Gadget_BD_Code_UPDATED.gs` — integrated current order service with stage-specific invoices.
- `HB_Gadget_BD_Invoice_Template_UPDATED.html` — use as the contents of the existing Apps Script HTML file named `HBInvoiceTemplate`.
- Website `assets/js/order-placement.js` passes the exact text typed into Order Note as `customerNote`, distinct from the existing internal order-note metadata.

## Ordered invoice behavior
| Order stage | Cash on Delivery | bKash / Nagad |
|---|---|---|
| Received (email 1) | Paid 0; full due | Paid 0; awaiting verification |
| Confirmed (email 2) | Paid 0; full due; same confirmed PDF can be printed and packed | Paid full; due 0 **only after** Verified in W, verified amount X >= total, and transaction ID in Y |
| Delivered (email 3) | Mark paid full when status becomes Delivered; due 0 | Paid full; due 0; requires payment still verified |

Invoices are **three separate PDFs**, not edits of one PDF. The Google Sheet preserves all three URLs; the existing primary Invoice Link column S points to the latest one. On email retries, existing files are re-used, not regenerated.

Cancelled/Returned orders continue to receive status emails but do not receive a Delivered/Paid PDF.

## Google Sheets
The existing **Orders** sheet has four additional columns appended (without changing the original A:AC data):
- AD Customer Note (exact checkout input, including punctuation and line breaks)
- AE Order Received Invoice Link
- AF Order Confirmed Invoice Link
- AG Order Delivered Invoice Link

The existing **Pending_order** A:K and payment verification process remain unchanged. Old orders are not emailed again.

## Deployment (owner action required)
1. In the HB Gadget BD Orders Google Sheet open **Extensions → Apps Script** and back up the current `Code.gs` and `HBInvoiceTemplate.html`. Do not touch your separate Auto Bangla Status script.
2. Replace the contents of **Code.gs** with `HB_Gadget_BD_Code_UPDATED.gs`, and the existing HTML file **HBInvoiceTemplate** with the matching revised `HB_Gadget_BD_Invoice_Template_UPDATED.html`.
3. Save, run **setupHBOrderNotifications()** once (grants permissions; installs/reuses the 1-minute lifecycle trigger). Do not repeat historical emails.
4. **Deploy → Manage deployments → Edit existing Web App → New version → Deploy.** Keep the existing deployment URL (website proxy relies on it).
5. Test new orders with your own controlled test addresses. **Do not place real paid orders solely for testing.**
   - COD: Received invoice due full; Confirmed due full; Delivered shows paid full and due 0.
   - bKash/Nagad: Received paid 0; no Confirmed/Delivered PAID invoice until W=Verified, X covers full amount and Y has transaction ID; then Confirmed and Delivered PAID invoices.
   - Order Note: whitespace, punctuation, multiple lines exactly as entered appears under BILL/SHIP TO.
   - Confirmed Invoice Link (AF) remains accessible for printing even after Delivered.
   - Order tracking, manual payment procedures, Pending_order, customer emails and existing products unaffected.

## Operational constraint
A status change to **Delivered** is treated as confirmation that a COD payment was collected. Staff must not set Delivered before collecting payment. bKash/Nagad requires independent staff verification.
