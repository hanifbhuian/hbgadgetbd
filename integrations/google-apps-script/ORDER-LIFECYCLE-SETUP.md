# HB Gadget BD — Manual bKash/Nagad + 3-stage order email setup

**STATUS: DRAFT. Website changes are in PR #3. The live Google Apps Script has NOT been updated by a GitHub commit.**

## Download the two replacement Apps Script files from the ChatGPT conversation
1. **HB_Gadget_BD_Code_UPDATED.gs** — revised version of the owner's actual October 2026 Code.gs upload (NOT the historical GitHub sample). It preserves the active `doPost`, server-generated phone+serial Order IDs, Pending_order A:H synchronization, proof handling when present, and order tracking.
2. **HB_Gadget_BD_Invoice_Template_UPDATED.html** — matching Google Apps Script HTML invoice template. Add this content to the existing Apps Script HTML file named **HBInvoiceTemplate**.

Do not install the historical `HBOrdersAddon.gs` alongside the replacement — several handlers already exist in the owner's integrated Code.gs.

## Customer checkout
- Select Cash on Delivery, bKash, or Nagad in the redesigned checkout radio card.
- COD: BDT 0 paid online. Customer pays full amount on delivery.
- bKash/Nagad: ORDER FIRST, then customer receives the numeric Order ID, payment amount, number **01816569237** and Send Money instructions. Use the Order ID in Reference/Note when the app supports that field. Contact WhatsApp support (+8801816569237) to share the Transaction ID or ask for assistance.
- The first screen/email MUST NOT claim funds received. Staff confirm real funds in their accounts, not screenshots alone. For approved prepayments: populate **Orders!W** Payment Verification = Verified, **X** Verified Amount (BDT) >= full order total, **Y** Payment Transaction ID before setting order Status = Confirmed.
- The site and proxy now support all three choices in the draft PR. No payment API integration or automatic transaction verification is claimed.

## Email 1 — Order Received
- Created immediately when doPost saves a new order.
- Includes order ID, provisional PDF invoice, support will call/email soon, payment steps for bKash/Nagad and WhatsApp help.
- All invoices initially show Paid BDT 0 and full amount due.

## Email 2 — Order Confirmed
- When staff set Orders!D = Confirmed, or Pending_order!C = Confirmed (which syncs to Orders), the one-minute Apps Script background trigger detects the change.
- Cash on Delivery: FINAL INVOICE: Pending, Paid 0 and full balance due.
- bKash/Nagad: FINAL INVOICE: Paid only AFTER staff record real payment verified, full amount and Transaction ID in W/X/Y. If not verified the email is held and an explanation is recorded in AC.
- Sent only once for the Confirmed stage. The new final invoice URL replaces the provisional URL in Orders!S while both PDFs remain preserved in the private invoice folder.

## Email 3 — Final status
- When Orders status becomes Delivered, Cancelled or Returned the trigger emails the customer.
- Delivered: thanks customer, requests a genuine Facebook review and recommends sharing the business with friends/family.
- Cancelled/Returned: appropriate status notification and support contact. Reasons taken from Orders!V when present.
- Provide the official Facebook review URL using Apps Script Script Properties: key **HB_FACEBOOK_REVIEW_URL**. Until set, the delivered email will politely request a review without a link.

## Deployment instructions
1. Back up live Code.gs and live HBInvoiceTemplate HTML.
2. Copy the two matching replacement files from ChatGPT into Apps Script:
   - `Code.gs` gets full `HB_Gadget_BD_Code_UPDATED.gs` content.
   - `HBInvoiceTemplate` (HTML) gets `HB_Gadget_BD_Invoice_Template_UPDATED.html` content.
3. Run `setupHBOrderNotifications()` once from the Apps Script editor and grant required permissions. It preserves existing order data, fills existing flags conservatively and installs one minute polling. The seven additional headers W:AC have already been added to the Orders sheet through the connected Google Drive integration, so setup should be idempotent.
4. Set `HB_FACEBOOK_REVIEW_URL` in Apps Script Script Properties to the verified review URL.
5. Deploy > Manage deployments > select existing deployed Web App > Edit > New version > Deploy. **Update the existing deployment to keep your current website endpoint working.**
6. TEST using separate test orders: COD with 0 paid and no proof; bKash order receipt and instructions; status Confirmed without verification (must not send Paid); staff mark verified, record amount and transaction ID then Confirmed; check final PDF and email; Delivered/Cancelled/Returned emails; tracking and Pending_order synchronization.
7. After backend tests succeed, merge GitHub PR #3 to publish frontend. Do NOT merge the website first, because current production Apps Script could still use the old invoice/email workflow.
8. Old customer order records are not retroactively emailed. Duplicate sending is guarded by separate event flags. Note that Apps Script/Gmail email delivery is generally best-effort rather than transactional, so duplicate notifications can still occur after uncommon timeout/failure windows.

## Status of connected assets
- **Orders Google Sheet**: W:AC seven headers added; old order rows preserved. This is already live.
- **Website GitHub PR**: staged, not merged, not yet live.
- **Google Apps Script live deployment**: owner action needed; source has been prepared as downloadable files, but ChatGPT's connectors cannot directly edit Apps Script projects here.
