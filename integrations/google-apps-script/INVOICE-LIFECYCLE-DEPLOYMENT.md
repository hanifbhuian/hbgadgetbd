# HB Gadget BD — Reorganized Orders, invoice folder routing, and deployment

## Already completed (Google Sheets / Drive, 11 October 2026)

- The live `Orders` tab is reordered into logical groups. The customer's email now follows phone, cancellation reason follows Bangla Status, **Total** follows Delivery Charge, and **Customer Note** replaces the original `Note` position.
- Historic Total values are calculated from Subtotal + Delivery Charge; the revised Apps Script writes Total for new orders.
- Existing customer-supplied notes were recovered verbatim into Customer Note for the existing orders.
- Four legacy fields (`Invoice Link`, `Note`, `Email Status`, `Invoice Status`) have been moved to **AE:AH and hidden**, not deleted yet. **Do not delete before upgrading Apps Script**: the live backend still expects these field names.
- The original data is preserved in hidden sheet `_Backup_Orders_20261011`.
- Legacy invoice URLs were copied to stage-specific fields when their filename identified a confirmed stage. Existing Drive invoice PDFs were moved without changing IDs or share links.
- All three nested invoice folders were found under **PROJECT: HB Gadget BD → HB Gadget BD Invoices**.

### Orders sheet, visible columns A:AD

| Columns | Fields |
|---|---|
| A–D | Order ID · Customer Name · Phone · Email |
| E–G | Status · Bangla Status · Cancellation Reason |
| H–I | Order Date · Last Updated |
| J–M | Items · Subtotal · Delivery Charge · **Total** |
| N–Q | Payment Method · Delivery Area · Courier · Tracking Number |
| R–T | **Customer Note** · Address · Payment Proof Link |
| U–W | Payment Verification · Verified Amount (BDT) · Payment Transaction ID |
| X–AA | Order Received Email Sent · Order Confirmed Email Sent · Final Status Email Sent · Email Automation Error |
| AB–AD | Order Received Invoice Link · Order Confirmed Invoice Link · Order Delivered Invoice Link |

The three separate email stage markers prevent duplicate customer emails. `Email Automation Error` is diagnostic and should be retained.

### Pending_order sheet — pending Apps Script upgrade

Current production **still uses**:
`A Order ID · B Customer Name · C Status · D Bangla Status · E Payment Method · F Courier · G Tracking Number · H Cancellation Reason · I Payment Verification · J Verified Amount (BDT) · K Payment Transaction ID`.

**Do not manually rearrange this live tab yet.** The current Apps Script has hardcoded pending-column indices. Reordering before deploying the matching code could send payments/courier updates to the wrong Orders fields.

After updating Apps Script and running **`setupHBOrders()`**, Cancellation Reason moves safely from H → E and the final order is:
`A Order ID · B Customer Name · C Status · D Bangla Status · E Cancellation Reason · F Payment Method · G Courier · H Tracking Number · I Payment Verification · J Verified Amount (BDT) · K Payment Transaction ID`.

Only the Cancellation Reason column moves; staff-edited rows remain intact. Auto Bangla Status relies on Status C/Bangla D and remains compatible.

## Drive stage folders (verified IDs)

The updated `hbCreateInvoice_` saves **new** PDFs directly to these existing folders:

| Stage | Folder | Drive folder ID |
|---|---|---|
| 1 — Order Received | `Stage1: Order Received ` | `1vS1ZfTrGvZ4LP0XDXifqCubaSwIN_lwX` |
| 2 — Order Confirmed | `Stage2: Order Confirmed` | `1lNia585H5nTmgqXrq2qhUuHpKBVFG-JX` |
| 3 — Delivered / Other | `Stage3: Order Delivered/Other` | `1EUZs3ecaNoqNc3OhBlU8d79o_HGYoUpl` |

Previously generated PDFs were also reorganized: **9 provisional → Stage 1; 6 final → Stage 2; 5 older invoices without specific stage → Stage 3/Other**. The last five are not implied to be Delivered or Paid.

Three invoice stages remain:
- **Received:** no payment acknowledged.
- **Confirmed:** COD due / prepaid fully Paid only after payment verification.
- **Delivered:** COD marked Paid upon delivery / prepaid already verified; zero due.

Existing confirmed invoice PDFs are reused for packaging, not generated again.

## Installation steps — owner action required

**GitHub updates do not deploy Google Apps Script.** The active service is the spreadsheet-bound Apps Script project.

1. Open [HB Gadget BD Orders](https://docs.google.com/spreadsheets/d/1T_7qOVesNqfP3H0M774q_UxBvNXIS6KuoMquVHpPgC4/edit) → **Extensions → Apps Script**. Back up your current `Code.gs` and `HBInvoiceTemplate` first.
2. Replace `Code.gs` with [HB_Gadget_BD_Code_UPDATED.gs](HB_Gadget_BD_Code_UPDATED.gs) and `HBInvoiceTemplate` with [HB_Gadget_BD_Invoice_Template_UPDATED.html](HB_Gadget_BD_Invoice_Template_UPDATED.html). Do **not** edit the separate Auto Bangla Status script.
3. Save; avoid staff updates during the brief migration. Run **`setupHBOrders()`** once to move Pending_order H → E and refresh its correct dropdown positions. Run **`setupHBOrderNotifications()`** once to validate the new schema and reuse/install the lifecycle trigger.
4. **Deploy → Manage deployments → Edit existing Web App → New version → Deploy.** Preserve the existing deployment URL used by the checkout/tracking website.
5. Test one controlled COD order and one bKash/Nagad order: note captured exactly, new Total filled, pending synchronization, three stage-specific invoices sent/stored, payment verification respected, invoices and folder links valid.
6. When everything works, optionally run **`hbRemoveArchivedLegacyColumns()`** once. It verifies historical invoice links and customer notes, makes a fresh hidden backup, then **deletes the four old AE:AH columns permanently from Orders**.
7. If cleanup reports unarchived old links or notes, **stop and resolve them rather than manually deleting any fields**.

**Safety:** Never delete the four legacy columns before the backend upgrade, and never move Pending_order before step 3. Existing stock/inventory, tracking, orders and payment-verification flow should be left unchanged.
