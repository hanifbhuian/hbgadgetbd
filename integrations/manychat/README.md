# HB Gadget BD Messenger — $0 setup using Cloudflare Workers AI

**No OpenAI API credits, paid Manychat or paid subscription required.**
Cloudflare's Workers Free plan includes 10,000 Workers AI Neurons/day.
When free inference is exhausted, requests stop working; do NOT upgrade to Paid.
The AI may occasionally return a polite fallback while over quota.

## Architecture

Customer's Messenger DM -> Meta Messenger Platform webhook ->
Cloudflare Pages Function -> latest hbgadgetbd.com/assets/data/products.json ->
Cloudflare Workers AI (free-eligible multilingual model) ->
Facebook Messenger Send API -> customer.

Both APIs are already committed:
- functions/api/messenger/webhook.js (direct Meta webhook)
- functions/api/messenger/answer.js (shared catalogue-to-AI logic; optional secured test POST)

No storefront, checkout, inventory, or Google Sheets code was changed.

## 1. Cloudflare settings (free)

Confirm your account remains on **Workers Free**.

Cloudflare Pages project **hbgadgetbd** -> Settings -> **Bindings** ->
**Add** -> **Workers AI** -> Variable name: **AI** -> Save.
Deploy again after adding a binding.

**Do not set HB_OPENAI_API_KEY**. Revoke/delete any exposed OpenAI key.
The code no longer uses the OpenAI API.

## 2. Meta for Developers setup

Create an app at https://developers.facebook.com/apps/ with Messenger
platform use case/permissions for your **HB Gadget BD** Facebook Page.
Meta may require Page/business verification and App Review or advanced
access to process messages from customers beyond app testers.

Add the **following Cloudflare Pages Production secrets** (Settings ->
Variables and Secrets -> Add -> Type Secret). Do not commit/share values.

- HB_META_VERIFY_TOKEN — random secret string you create for webhook verification.
- HB_META_APP_SECRET — the Meta app's App Secret.
- HB_META_PAGE_ACCESS_TOKEN — token generated for the HB Gadget BD Page.
- HB_META_PAGE_ID — numeric Facebook Page ID (secret optional, but set as encrypted variable to avoid mistakes).

The webhook callback URL for Meta:
https://hbgadgetbd.com/api/messenger/webhook

Webhook verify token must exactly match HB_META_VERIFY_TOKEN.
Subscribe the Meta app to the Page's **messages** webhook field and enable
pages_messaging permission with the appropriate access level.
Configure the Messenger primary receiver/routing to avoid double replies
from Manychat or Meta Business Suite automations.

Do **not** Set Live in Manychat's current draft: it is not needed for the
free direct webhook approach. Manychat's External Request and AI Step are
paid-plan features; the free tier supports simpler rule-based automations only.
Check Manychat Billing for an active Pro trial and cancel paid renewal if any.

Meta send permissions and the messaging window still apply; responses are
only sent to customers who just contacted the Page.

## 3. Test checklist

- [ ] Cloudflare project remains on Workers Free.
- [ ] AI binding named **AI** exists and the Pages project is redeployed.
- [ ] All four Meta variables exist as secrets in Production.
- [ ] Meta verification challenge succeeds with the callback and matching token.
- [ ] Page subscription to message events is active.
- [ ] Messenger app permissions/routing are configured, and no other chatbot duplicates replies.
- [ ] Send a test DM from a permitted tester Facebook account:
      "ভাই ১০০০০mAh UPS এর দাম আর ওয়ারেন্টি কত?"
- [ ] Check the reply's product, price, warranty, link against the site.
- [ ] Test Banglish and ambiguous products.
- [ ] Verify missing data causes a human handover rather than a made-up reply.

## Safety/limitations

- Workers AI's 10,000 daily free Neurons are a **limited quota**, not unlimited messaging.
- Cloudflare AI model selected: @cf/zai-org/glm-4.7-flash (Workers Free eligible as of Oct 2026).
- Your public product JSON is the only product information source. Warehouse stock and order status are NOT live.
- Message bodies are processed by Cloudflare's AI inference service.
- This webhook is not live until a Meta app, permissions and production secrets are configured.
- It currently does not provide persistent chat memory or deduplicate retried webhook messages.
- Thoroughly test, confirm Meta's current platform permissions, and implement deduplication
  if needed before opening to the public.

## Deployment note

After adding the Workers AI binding named `AI` in Cloudflare Pages Production, the next push to `main` automatically triggers a fresh Pages deployment. This documentation-only update is that deployment trigger and does not change the storefront or API behavior.

## Deployment after Meta verify-token secret

After saving `HB_META_VERIFY_TOKEN` in Cloudflare Pages Production secrets, this documentation-only commit triggers the next GitHub-connected Pages deployment. The secret stays in Cloudflare and is not stored here. Before Meta webhook verification, confirm this deployment succeeds.

## Production deployment after final Page ID setup

On 2026-10-17, the owner confirmed saving `HB_META_PAGE_ID` in Cloudflare Pages Production after separately saving the verification token, refreshed Page Access Token, and Meta App Secret. The exact Page ID is `1280860211779282` (public Page identifier). This documentation-only commit triggers Cloudflare Pages automatic deployment from `main`; check its success before sending a test message. Keep all sensitive values in Cloudflare, never GitHub.
