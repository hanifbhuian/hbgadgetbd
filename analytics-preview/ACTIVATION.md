# HB Gadget BD — activating live website analytics

**Status:** feature branch only. Do not merge/deploy to the production storefront until the exact Cloudflare account, read-only token, privacy notice, and live tests are ready. Do not change orders, payments, Google Apps Script, Messenger AI, or existing bindings.

## Architecture
- Free Cloudflare Pages Functions with a Workers Analytics Engine **writer** binding `HB_STORE_ANALYTICS`, dataset `hbgadgetbd_events` configured under `[[env.production.analytics_engine_datasets]]` in `wrangler.toml`.
- **No Analytics SQL binding required.** Cloudflare's Analytics SQL runtime binding is documented for Workers and is not relied on here. The Pages reporting function calls the official Workers Analytics Engine SQL API using an account-scoped read-only API token stored as a secret.
- Storefront tracking is anonymous, best-effort, skips DNT/GPC visitors, records session-scoped random identifier, product ID/name, rough acquisition source, device class, and coarse Bangladesh geolocation. Form values, order IDs, emails, payment details, and addresses are never transmitted.
- Client-to-server POST report access requires a separate high-entropy team key; Cloudflare read token remains server-side.
- Displayed visitor totals count anonymous browser sessions, not unique people; replay/heatmaps are not included.
- 7/30/90-day filters fetch up to 5,000 most recent event rows; when the limit is hit results are incomplete and indicated in the UI. Analytics Engine data retention is approximately three months.

## One-time admin preparation (no paid subscription)
1. **Already discussed:** In Cloudflare Workers & Pages > hbgadgetbd > Settings > Variables and Secrets, save the production secret `HB_ANALYTICS_ADMIN_KEY` as a randomly generated string of at least 32 characters. Store the value safely; it is entered in the dashboard when viewing live data.
2. In [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens), create a **custom** token named `HB_GADGET_ANALYTICS` with exactly **Account > Account Analytics > Read** permission, scoped to the account that owns hbgadgetbd. Save it as a Cloudflare Pages production **Secret** named `HB_ANALYTICS_READ_TOKEN`. Never enter the token in repository files or ChatGPT.
3. Obtain the 32-character Cloudflare Account ID from the Cloudflare dashboard (Workers & Pages overview > Account Details or search `Copy account ID`). In the same **Variables and Secrets** screen, add it as **Secret** `HB_ANALYTICS_ACCOUNT_ID`; no extra permissions required.
4. Review store analytics disclosure and retention in the customer-facing privacy notice. Consider a Cloudflare Access policy for the dashboard URL `https://hbgadgetbd.com/analytics-preview/*`, in addition to the dashboard's API key.
5. Have the maintainer verify Wrangler config and the preview build for the existing Pages project, then merge the PR only after confirming the three required secrets exist in the correct production environment. Because Wrangler is source of truth, **the disabled Add binding button in the Cloudflare UI is expected**.
6. Production test: view one page and one product, add a product to cart without placing an order, then visit `https://hbgadgetbd.com/analytics-preview/` and enter only the **admin dashboard key**. Confirm live event counts. Test that unauthorized API requests return HTTP 401.
7. Regression test mobile/desktop checkout, Inside Dhaka ৳60/Outside Dhaka ৳130, order confirmation and duplicate avoidance, Messenger AI, order tracking and published contact details. Confirm no billing/payment change.

## Reporting implementation
- `POST /api/analytics/report`: requires `Authorization: Bearer <HB_ANALYTICS_ADMIN_KEY>`; accesses the official Cloudflare account endpoint `/accounts/{account_id}/analytics_engine/sql` with the read-only `HB_ANALYTICS_READ_TOKEN`.
- The dataset is created after the first production write when the writer binding is deployed. If there is no dataset yet, the dashboard shows an unavailable/connection message; it does not fabricate visits.
- Cloudflare Docs: https://developers.cloudflare.com/pages/functions/wrangler-configuration/#analytics-engine-datasets and https://developers.cloudflare.com/analytics/analytics-engine/sql-api/
- The Netlify PR preview runs static HTML, not Cloudflare Functions; therefore the preview displays only demo data. A successful Netlify deployment does **not** validate Cloudflare SQL access or production bindings.

## Acceptance checks
- `HB_MESSENGER_CONTEXT` and `AI` bindings retained exactly; no existing business logic changes.
- `wrangler.toml` uses only the supported Analytics Engine dataset writer; no speculative Analytics SQL binding.
- All admin and API tokens are encrypted in Cloudflare secrets.
- Report fails closed: invalid admin key -> 401, missing account/token -> 503, SQL failure -> 503.
- Event collector never blocks the storefront and never emits personal data.
