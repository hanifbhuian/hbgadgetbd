# HB Gadget BD: Checkout and three-stage order email deployment

Status: DRAFT. Do not merge website PR before live Google Apps Script is updated and tested.

The linked GitHub repository does not contain the active Apps Script Code.gs. Its owner must edit the script bound to HB Gadget BD Orders. The helper file HBOrderLifecycleEmails.gs in this folder is NOT automatically installed or deployed by a GitHub commit.

## Checkout
- Customer chooses Cash on Delivery (live-ready) or bKash/Nagad (visible but disabled until compliant business receiving accounts are ready).
- Order is placed FIRST and backend creates the existing numeric Order ID.
- COD: no advance, no payment screenshot, full amount due on delivery.
- After approved business accounts are available, activate all flags: HB_PREPAYMENT_ENABLED=true in website order-placement.js, Cloudflare HB_ENABLE_PREPAYMENT=true, and Apps Script HB_ALLOW_APPROVED_PREPAYMENT=true. Configure the approved receiving number in BOTH the website and the Apps Script property HB_APPROVED_PAYMENT_NUMBER.
- For supported prepay methods: after placing an order, customers see Send Money instructions, the Order ID as payment reference where supported, and a WhatsApp link to report the transaction ID. Never claim Paid without checking funds. bKash terms prohibit commercial use of personal app accounts: https://www.bkash.com/en/page/terms-of-use-bkash-app .

## Email stages
1. Received: trigger for new orders; provisional PDF with 0 Paid, total Due; support will call/email to confirm. Prepayment instructions only after approved accounts are enabled. This module's initial-email queue is OFF by default: set HB_LIFECYCLE_SEND_RECEIVED=true ONLY after disabling the existing first-email sender in live Code.gs, otherwise duplicates could occur.
2. Confirmed: when Orders column D becomes Confirmed, send one attached confirmed PDF. COD is Pending with 0 paid and full due. bKash/Nagad can be Paid only when account receipts were verified and recorded in W=Verified, X=full received amount, Y=transaction ID. Until then, the system holds a paid confirmation and writes an error to AC.
3. Final: status Delivered, Cancelled or Returned produces a separate notification. Delivered thanks customer and asks for a Facebook review and word-of-mouth recommendation using the official Facebook URL supplied in Script Properties. Cancelled/Returned receive the appropriate status explanation.

A time-driven trigger polls Orders every 5 minutes, detecting both direct Orders edits and edits synchronized from Pending_order by other script routines. Notification flags prevent repeated mails.

## Schema
Retain existing Orders A:V and Pending_order layout. Running hbInstallLifecycleEmailAutomation() adds headers from W:AC:
W Payment Verification
X Verified Amount (BDT)
Y Payment Transaction ID
Z Order Received Email Sent
AA Order Confirmed Email Sent
AB Final Status Email Sent
AC Email Automation Error

Historical rows are marked Legacy to avoid accidental old-customer notifications.

## Actions required before production
1. Open the HB Gadget BD Orders Google Sheet, then Extensions > Apps Script. BACK UP live Code.gs. Share current Code.gs excluding secrets so its existing doPost, invoicing, proof uploads and email delivery can be adapted without breaking order creation.
2. Add the included HBOrderLifecycleEmails.gs as a new file. Do not overwrite active Code.gs. Verify W:AC are empty.
3. In Apps Script Settings > Script Properties configure HB_LIFECYCLE_INVOICE_FOLDER_ID to the invoice Drive folder ID, HB_FACEBOOK_REVIEW_URL to the actual official Facebook page review link, and (once old first email disabled) HB_LIFECYCLE_SEND_RECEIVED=true.
4. Ensure the Apps Script owner's Gmail account has support@hbgadgetbd.com verified as a Send Mail As alias; otherwise messages send using the script owner's identity with Reply-To set to support@.
5. Run hbInstallLifecycleEmailAutomation() and authorize permissions. It initializes the new columns and the recurring trigger.
6. Revise active Code.gs to allow COD without payment proof; preserve numeric Order ID, Google Sheets sync, order tracking, provisional invoice and previous-data compatibility. Make the first invoice mention that support will call/email soon; disable the old first-invoice sender before turning on the extension.
7. Test COD and each notification stage with a test order. Test bKash/Nagad after compliant accounts are enabled. Confirm receipt verification before Paid, 0 due for verified full prepayments, and no duplicate emails/invoices.
8. Merge the website draft PR only when live Code.gs has passed an end-to-end test. Publishing the website first could cause customer order submissions to fail.

The GitHub draft does NOT change live Apps Script, business accounts, customer order data or existing invoices.
