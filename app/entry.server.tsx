import {ServerRouter} from 'react-router';
import {isbot} from 'isbot';
import {renderToReadableStream} from 'react-dom/server';
import {
  createContentSecurityPolicy,
  type HydrogenRouterContextProvider,
} from '@shopify/hydrogen';
import type {EntryContext} from 'react-router';
import {captureError} from '~/lib/errorReporting';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  context: HydrogenRouterContextProvider
) {
  const {env, sanity} = context;
  const {SanityProvider} = sanity;
  const projectId = env.SANITY_PROJECT_ID;
  const studioHostname = env.SANITY_STUDIO_URL || 'http://localhost:3333';
  const isPreviewEnabled = sanity.preview?.enabled;
  // Marketing tags (see app/components/MarketingTags.tsx) are opt-in via env —
  // only widen the CSP with their origins when they're actually configured.
  const hasGtm = Boolean(env.PUBLIC_GTM_CONTAINER_ID);
  const hasMetaPixel = Boolean(env.PUBLIC_META_PIXEL_ID);
  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
    shop: {
      checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
      storeDomain: context.env.PUBLIC_STORE_DOMAIN,
    },
    // Dashboard-hosted studios embed the storefront through www.sanity.io
    // before reaching the *.sanity.studio origin, so both must be allowed.
    frameAncestors: isPreviewEnabled
      ? [studioHostname, 'https://www.sanity.io']
      : [],
    defaultSrc: [
      'https://cdn.sanity.io',
      'https://lh3.googleusercontent.com',
      'https://*.klaviyo.com',
    ],
    // script-src has NO Hydrogen default, so scripts do NOT fall back to
    // default-src — every allowed origin must be listed explicitly here.
    // 'self' covers the app's own route-module bundles (dev: localhost,
    // prod: Oxygen); cdn.shopify.com covers the auto-injected privacy banner
    // (withPrivacyBanner in root.tsx). The nonce is appended by Hydrogen.
    scriptSrc: [
      "'self'",
      'https://cdn.shopify.com',
      'https://*.klaviyo.com',
      'https://static.klaviyo.com',
      ...(hasGtm ? ['https://www.googletagmanager.com'] : []),
      ...(hasMetaPixel ? ['https://connect.facebook.net'] : []),
    ],
    connectSrc: [
      `https://${projectId}.api.sanity.io`,
      `wss://${projectId}.api.sanity.io`,
      'https://*.klaviyo.com',
      ...(hasGtm
        ? [
            'https://www.googletagmanager.com',
            'https://*.google-analytics.com',
            'https://*.analytics.google.com',
          ]
        : []),
      ...(hasMetaPixel
        ? ['https://www.facebook.com', 'https://connect.facebook.net']
        : []),
    ],
    styleSrc: ['https://*.klaviyo.com'],
    // fontSrc/imgSrc hebben geen Hydrogen-defaults en vallen na het zetten
    // niet meer terug op default-src — alle bronnen expliciet opnemen.
    // Cormorant Garamond + DM Sans zijn self-hosted (zie tailwind.css), dus
    // 'self' volstaat — geen fonts.gstatic.com meer nodig.
    fontSrc: ["'self'", 'data:', 'https://*.klaviyo.com'],
    imgSrc: [
      "'self'",
      'data:',
      'blob:',
      'https://cdn.shopify.com',
      'https://cdn.sanity.io',
      'https://lh3.googleusercontent.com',
      'https://*.klaviyo.com',
      'https://d3k81ch9hvuctc.cloudfront.net',
      ...(hasGtm
        ? ['https://www.googletagmanager.com', 'https://*.google-analytics.com']
        : []),
      ...(hasMetaPixel ? ['https://www.facebook.com'] : []),
    ],
  });

  const body = await renderToReadableStream(
    <NonceProvider>
      <SanityProvider>
        <ServerRouter
          context={reactRouterContext}
          url={request.url}
          nonce={nonce}
        />
      </SanityProvider>
    </NonceProvider>,
    {
      nonce,
      signal: request.signal,
      onError(error) {
        captureError(error, {stage: 'ssr-render', url: request.url});
        responseStatusCode = 500;
      },
    },
  );

  if (isbot(request.headers.get('user-agent'))) {
    await body.allReady;
  }

  responseHeaders.set('Content-Type', 'text/html');
  responseHeaders.set('Content-Security-Policy', header);

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}