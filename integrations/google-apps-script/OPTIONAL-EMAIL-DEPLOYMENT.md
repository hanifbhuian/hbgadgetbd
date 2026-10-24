# Optional customer email — deployment and test plan

This branch is intentionally **not merged to production**. Your active Google Apps Script web app currently validates that an email exists; merging only the website/Cloudflare changes before the Apps Script is deployed would result in failed checkouts for customers choosing no email.

## Code changes
1. `assets/js/order-placement.js` — display **Email (Optional)** without HTML `required`; no email required in JavaScript; show phone-only confirmation text when omitted.
2. `functions/api/orders/create.js` — accept blank customer email but validate an address if supplied; sends empty email to Apps Script rather than inventing one. Preserves existing order ID, shipping amounts and payment checks.
3. `integrations/google-apps-script/HB_Gadget_BD_Code_UPDATED.gs` — no longer requires an email; writes empty Email cell; stage-1 invoice is generated even with no email; skips email sending without falsely marking it as failed. Periodic order notification job generates Confirmed/Delivered invoices without an email only for new opt-out orders explicitly marked on creation; historical rows with missing/invalid email are skipped, avoiding accidental backfills. Valid-email notifications are unchanged.
4. `index.html` and `product.html` — bump checkout script cache version.

## Safe rollout — important order of operations
1. **Back up the active Apps Script project.** Open the actual Google Sheet's Extensions > Apps Script; compare its currently deployed `Code.gs` with the GitHub source and apply only the corresponding email-optional changes, preserving other live changes, active installable triggers, template files, and script properties. GitHub edits do **not** deploy a Google Apps Script web app.
2. Save a new Apps Script **web app version** using Deploy > Manage deployments > Edit > New version > Deploy; preserve the existing web app URL, Execute as settings and Who has access settings. Do not replace/delete the existing deployment.
3. Test the Apps Script `hbCreateOrder_` using a controlled test environment or mocked Sheets; then run exactly one real controlled order without email (if safe), verify it appears in Orders and Pending_order, retains the correct shipping fees, receives an Order ID and an Order Received invoice link, and is not marked "Email Automation Error". Avoid duplicate order submissions. A blank-address test must *not* be conducted against production until you can identify and clean up the test order without affecting inventory/reporting.
4. Only **after** the Apps Script web app with the optional-email change is verified, merge this PR and confirm the automatic Cloudflare Pages production deployment succeeded.
5. Place a controlled **COD** test order with blank email, check order creation, tracking, three-stage invoice behaviour on controlled transitions, and phone support path. Test a second checkout with a valid email and verify normal invoicing; keep actual payment methods and verified-amount rules unchanged. Check delivery charge for Inside Dhaka (৳60) and Outside Dhaka (৳130). Do not send test money.
6. Recheck the site on mobile and desktop. If any problem occurs, stop new UI rollout; production remains unchanged while this PR is open.

## Behaviour
- Blank email **does not** block checkout after both backend and frontend are deployed.
- If email exists, invoice emails and status-change emails are sent normally.
- Without email, PDFs are still generated in the same stage-specific Drive folders and their links saved in existing Sheet fields, while email-sent fields remain unset.
- No automatic WhatsApp/SMS message is claimed or added. Staff contact via phone is unchanged.
- Do not add invented placeholder emails to Orders.

## 24 October 2026 safety review
- A protective `HB_NO_EMAIL_ORDER_<Order ID>` script-property flag is set only for newly created no-email orders. The existing notification scanner ignores older missing/invalid-email rows, preserving their state and avoiding historical PDF backfills.
- Cloudflare Pages preview succeeded, but the independent Workers build check failed. Neither verifies production Apps Script compatibility.
- The live Apps Script source cannot be retrieved with the available connected tools. Back up, compare and patch the bound script before redeploying. Do not execute setup functions or create live test orders before confirming a safe testing approach.
