# Ciao Bella Fashion — Hydrogen storefront

Headless storefront for [Ciao Bella Fashion](https://ciaobellafashion.nl), built on
[Shopify Hydrogen](https://shopify.dev/custom-storefronts/hydrogen) (React Router 7,
framework mode) and deployed on Oxygen. [Sanity](https://www.sanity.io/) is used as the
CMS for editorial content — homepage modules, collection intros/modules, PDP copy,
footer, reviews — layered on top of product/cart/checkout data from the Shopify
Storefront API.

## Stack

- Hydrogen + React Router 7 on Oxygen
- Sanity (via `hydrogen-sanity`) for content, previews and Visual Editing
- Tailwind CSS v4
- Klaviyo for email/onsite; optional GA4 (via GTM) and Meta Pixel for marketing tracking
  (both gated behind Shopify's cookie consent, see `app/components/MarketingTags.tsx`)

## Getting started

**Requirements:** Node 22 or 24 (see `engines` in `package.json`).

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

- Shopify — `PUBLIC_STORE_DOMAIN`, `PUBLIC_STOREFRONT_API_TOKEN`,
  `PRIVATE_STOREFRONT_API_TOKEN`, `PUBLIC_STOREFRONT_ID`, `PUBLIC_CHECKOUT_DOMAIN`,
  `PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID`, `PUBLIC_CUSTOMER_ACCOUNT_API_URL`, `SHOP_ID`,
  `SESSION_SECRET` — pull these with `shopify hydrogen env pull` or copy them from the
  Shopify admin.
- Sanity — `SANITY_PROJECT_ID`, `SANITY_DATASET`, `SANITY_API_TOKEN` from the companion
  Sanity Studio project. `SANITY_STUDIO_URL` is the deployed Studio URL and is required
  for Visual Editing to work in production; leave it empty locally, it falls back to
  `http://localhost:3333`.
- Marketing (optional) — `PUBLIC_GTM_CONTAINER_ID` / `PUBLIC_META_PIXEL_ID`. Leave both
  empty to run with only Shopify's built-in analytics.

Run the Sanity Studio (separate project) alongside this one with its own `npm run dev`
so Visual Editing / preview mode has something to talk to on `http://localhost:3333`.

## Development

```bash
npm run dev         # Hydrogen dev server with codegen
npm run typecheck   # react-router typegen + tsc --noEmit
npm run lint
```

## Building for production

```bash
npm run build
npm run preview     # serve the production build locally via MiniOxygen
```

Pushing to the tracked branch deploys to Oxygen automatically via the workflow in
`.github/workflows/` (Shopify's GitHub integration).

## Customer Account API

Local development against `/account` requires a public tunnel — see
[Shopify's setup guide](https://shopify.dev/docs/custom-storefronts/building-with-the-customer-account-api/hydrogen#step-1-set-up-a-public-domain-for-local-development).
