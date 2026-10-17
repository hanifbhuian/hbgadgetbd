# HB Gadget BD — Messenger AI product assistant

This integration uses a **Cloudflare Pages Function** at:
- Source: functions/api/messenger/answer.js
- Production route (only when this domain is deployed by Cloudflare Pages): POST https://hbgadgetbd.com/api/messenger/answer

## What it does

For each question, the function downloads the published
https://hbgadgetbd.com/assets/data/products.json, includes official product data
in a short AI request, and returns:
{"success":true,"reply":"...","catalogueCount":5}

The reply is in the customer's Bangla, Banglish or English. No inventory,
payment-verification or order-record access is provided. The public catalogue
is updated when the website's new products.json deploys.

This is a backend service only: adding it does not change website UI or
automatically switch on Messenger automations.

## Required Cloudflare configuration

In **Cloudflare dashboard -> Workers & Pages -> the Pages project serving
hbgadgetbd.com -> Settings -> Variables and Secrets**, add these **encrypted
secrets** for the production environment:

- HB_OPENAI_API_KEY : a separate OpenAI Platform API key (usage is billed separately from ChatGPT subscriptions).
- HB_MANYCHAT_SECRET : a unique randomly generated secret, 32+ characters, shared only between Cloudflare and Manychat.

Optional nonsecret:
- HB_AI_MODEL : default gpt-4o-mini.

Deploy/redeploy after adding secrets. Never put these values in GitHub,
product JSON, website HTML, screenshots, or chat. Set usage limits and alerts
in the OpenAI Platform account.

If hbgadgetbd.com is instead deployed by **Netlify or GitHub Pages**, this
Cloudflare Function will NOT be available on the custom domain. First deploy
the repository as a Cloudflare Pages project (or separately host the backend)
and confirm the right API URL. Existing repo includes Cloudflare Pages
Functions for /api/orders/*; do not assume those are live without testing.

## Manychat External Request

Keep the existing test flow in Draft while configuring:

1. Select **POST** (replace the old GET to products.json).
2. Request URL: https://hbgadgetbd.com/api/messenger/answer
3. Headers:
   - Content-Type: application/json
   - X-HB-Agent-Secret: the exact HB_MANYCHAT_SECRET from Cloudflare.
4. Body: {"message":"<insert Manychat's Last Text Input variable using its variable selector>"}
   Do not send names, phone numbers or email addresses. Check that the
   resulting JSON remains valid if a question contains quotes.
5. Select a test contact, then Test Request. A valid configured request
   returns 200 and a response body with a reply string.
6. Create a Manychat Custom User Field named **HB_AI_Reply** of type Text.
7. Response mapping: JSONPath **$.reply** -> **HB_AI_Reply**.
8. Flow: message trigger -> External Request Actions -> Messenger Send Message
   containing the inserted **HB_AI_Reply** field.
9. Remove/disconnect the old AI Step if it would duplicate the response.
   An AI Step is not necessary: this endpoint returns a finished reply.
10. Test with a single message such as:
    "hbtest ভাই, ১০০০০mAh UPS-এর দাম আর ওয়ারেন্টি কত?"
    (The current test trigger requires the word hbtest.)
11. After passing tests, decide whether to use a broader Messenger trigger
    or default reply; review existing Meta/Manychat automations to avoid
    duplicate messages. Then and only then set the flow live.

Important: a generic "hbtest" question does not specify a product, and should
receive a clarifying reply instead of an invented product price.

## Troubleshooting

- 401 unauthorized: Manychat X-HB-Agent-Secret differs from Cloudflare.
- 503 not_configured: Cloudflare encrypted secrets are missing or deployment
  has not loaded them.
- 415 json_required / 400 invalid_json: POST/Content-Type/body is incorrect.
- 200 success:false: catalogue retrieval or OpenAI temporarily failed;
  reply is a polite fallback, not a confirmed product answer.
- 404/not found: the custom domain is not serving the Cloudflare Pages Function,
  or deployment/routing is incomplete.
- Manychat request timeout: retries may be necessary; the handler uses short
  upstream timeouts and a safe fallback. Avoid sending customer PII.

## Security and limitations

- Server-side header authentication limits outsiders' ability to spend AI API credit.
- API keys stay in Cloudflare encrypted secrets.
- Product data is retrieved per request and is not a live warehouse inventory feed.
- LLM output must be evaluated by a human before enabling production replies.
- If the product catalogue grows above 80 products, implement server-side
  product search/retrieval instead of sending an unbounded dataset to AI.
- Messenger platform rules, Manychat plan requirements and AI usage charges apply.
