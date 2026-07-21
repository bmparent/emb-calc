# Cloudflare Pages and Pro workspace setup

## Fix the current Pages build

The July 21 deployment log shows that Cloudflare cloned the repository but did
not run a build command. Astro therefore never created `dist/`.

In **Workers & Pages → embroiderycalc-pro → Settings → Builds**, set:

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: leave blank
- Node version: `22.16.0` (the repository also pins this in `.node-version`)

Save and retry the latest deployment. A Wrangler file is not required to fix
this particular failure. Cloudflare's Astro preset uses the same build command
and directory.

## Create and bind D1

Create a D1 database named `embroiderycalc-pro`. In the Pages project, add a D1
binding named exactly `DB` for both production and preview. Apply the checked-in
migrations before enabling accounts:

```bash
npx wrangler d1 migrations apply embroiderycalc-pro --remote
```

For local development, omit `--remote` and run Pages Functions with Wrangler.

## Configure account email

1. Verify a sender domain in Resend.
2. Create a sending-only Resend API key.
3. Add these Pages variables/secrets in both production and preview as
   appropriate:

| Name | Type | Purpose |
| --- | --- | --- |
| `SITE_URL` | variable | Canonical production origin, such as `https://embroiderycalc-pro.pages.dev` |
| `AUTH_FROM_EMAIL` | variable | Verified sender, such as `EmbroideryCalc <signin@example.com>` |
| `RESEND_API_KEY` | encrypted secret | Sends 15-minute, one-time sign-in links |

The app stores only hashes of magic-link and session tokens. Sessions use a
Secure, HttpOnly, SameSite=Lax cookie.

## Configure encryption for Printavo

Generate a dedicated 32-byte key and store the base64 result as an encrypted
Pages secret named `PRINTAVO_ENCRYPTION_KEY`:

```bash
openssl rand -base64 32
```

Back up this key in the site's password manager. Losing it makes existing
Printavo connections unreadable; changing it requires users to reconnect. The
key must never be committed or exposed as a `PUBLIC_` build variable.

## Configure Stripe subscriptions

1. Create a recurring Stripe Price for the Pro add-on.
2. Add encrypted secrets `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
3. Add `STRIPE_PRICE_ID` as a secret or variable.
4. Create the webhook endpoint
   `https://embroiderycalc-pro.pages.dev/api/billing/webhook`.
5. Subscribe it to `checkout.session.completed` and
   `customer.subscription.created`, `customer.subscription.updated`, and
   `customer.subscription.deleted`.
6. Enable the Stripe customer portal and its cancellation controls.

The application uses Stripe-hosted Checkout and the customer portal. Card
details do not pass through EmbroideryCalc.

## Printavo behavior

- API v2 GraphQL endpoint only.
- User-provided Printavo account email plus token are encrypted with AES-256-GCM.
- Order lookup is read-only and user initiated.
- No customer contacts, pricing, messages, mutations, webhooks, or production
  file downloads are requested.
- Search is limited to 20 records per request to remain below Printavo's
  published rate limit.
- Users can disconnect and delete the encrypted token at any time.
- A renewal reminder is shown before the six-month lifetime published for
  Printavo API keys. Because an existing key can be older when connected, this
  date is a reminder, not a guaranteed expiration date.

## Wrangler configuration

Do not rename `wrangler.example.jsonc` to `wrangler.jsonc` with placeholder
values. For an existing Pages project, Cloudflare recommends downloading the
current dashboard configuration first because a deployed Wrangler file becomes
the configuration source of truth:

```bash
npx wrangler pages download config embroiderycalc-pro
```

Then merge the D1 binding and non-secret variables from the example, review the
generated file, and leave secrets in the Cloudflare dashboard.

## Launch checks

- Confirm `npm test`, `npm run typecheck`, and `npm run build` pass.
- Confirm signed-out use of the free calculator still works.
- Confirm sign-in links are one-time and expire after 15 minutes.
- Complete a Stripe test-mode checkout and cancellation; verify webhook-driven
  access changes.
- Connect a test Printavo token, search and load an invoice and a quote, then
  disconnect and verify the token record is deleted.
- Enable personal learning, log five completed runs, and verify the suggestion
  shows sample size, confidence, and does not alter the base estimate.
- Review privacy/terms with qualified counsel before accepting live payments.
