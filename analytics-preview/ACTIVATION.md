# HB Gadget BD — Activating live website analytics

This feature lives on a **separate pull request** until the Cloudflare production setup is verified. The existing checkout, payment settings, orders, Messenger AI binding, and Google Apps Script code must be preserved.

## Design
- Free Cloudflare Workers Analytics Engine, dataset `hbgadgetbd_events`; auto-created at first real write when the Pages binding is configured.
- Storefront tracker `/assets/js/analytics-tracker.js` sends only event type, session-scoped random UUID, optional product ID/name, page category, device class and a coarse acquisition channel.
- Server-side geolocation uses Cloudflare's request country and Bangladesh region. No IP address is written into analytics.
- Anonymous browser sessions are not unique people. Counters show events, not checkout revenue or delivery completion.
- Checkout completion is detected when the website renders its successful order confirmation; order data, order IDs and customer details are not transmitted.
- The report API responds only to authenticated POST; no data if the admin secret or Analytics SQL binding is unavailable.
- Analytics Engine keeps approximately 3 months of data. An authenticated report fetches the latest 5,000 events in the selected 7/30/90 day range; that can truncate high-volume periods.
- DNT and Global Privacy Control opt-outs respected. No replay recording or heatmaps in this first version.

## One-time Cloudflare administrator steps

1. Go to **Cloudflare > Workers & Pages > hbgadgetbd > Settings > Variables and Secrets** for the **production** environment. Create a strong secret named `HB_ANALYTICS_ADMIN_KEY` (at least 32 characters, randomly generated). Never paste the value into GitHub, web site code, public documents, or ChatGPT.
2. Ensure the project uses a Wrangler release at least **4.145.0** so the new Analytics SQL binding is supported. The repository declares an **Analytics Engine writer** `HB_STORE_ANALYTICS` with dataset `hbgadgetbd_events` and an **Analytics SQL reader** `HB_ANALYTICS_SQL` in `wrangler.toml`. If the Pages build does not apply the declared writer binding, add it in **Settings > Bindings > Analytics Engine**, with the exact binding and dataset names, then redeploy. Analytics SQL is a newer binding and may not be available on every Pages build: confirm support before releasing. Do not create any paid resource.
3. For extra protection, configure a **Cloudflare Access** policy restricting `https://hbgadgetbd.com/analytics-preview/*` to authorized team email addresses. The admin API still requires the key. Do not turn the endpoint into a public dashboard.
4. Make sure the storefront privacy notice discloses anonymous shopping analytics and retention before enabling.
5. After live deploy, open `https://hbgadgetbd.com/analytics-preview/`, enter the admin key and select Connect live data. Browse and open a test product and add it to cart (without placing a real order). Refresh the dashboard to confirm the visitor and product events.
6. Verify desktop/mobile; ensure that order creation, shipping calculations and Messenger AI behave exactly as before. Production publishing happens only after the project binding/secret are configured and these checks can be run.

## Technical acceptance tests
- Without secret: `POST /api/analytics/report` returns 401; actual event data is never returned.
- Missing Analytics SQL binding: authenticated reporting returns 503 with a setup message, not fabricated numbers.
- Storefront tracking is always best effort; collection errors never block cart, checkout or order submission.
- `POST /api/analytics/event` writes only whitelisted event types for the real production domain; no origin cross-posts; no name, phone, email, full address, payment data, invoice link or order ID.
- Page demos remain distinctly labelled and do not get mixed into live metrics.

## Troubleshooting
Netlify/GitHub Pages **do not execute Cloudflare Pages Functions**, so the PR's Netlify preview still shows synthetic demo data. Use Cloudflare deployment for live analytics. If a reporting error appears after valid authentication, inspect Cloudflare Pages function logs for an SQL binding compatibility problem; do not weaken access control to debug it.
