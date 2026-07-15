import {ServerRouter} from 'react-router';
import {isbot} from 'isbot';
import {renderToReadableStream} from 'react-dom/server';
import {
  createContentSecurityPolicy,
  type HydrogenRouterContextProvider,
} from '@shopify/hydrogen';
import type {EntryContext} from 'react-router';

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  context: HydrogenRouterContextProvider,
) {
  const {env, sanity} = context;
  const {SanityProvider} = sanity;
  const projectId = env.SANITY_PROJECT_ID;
  const studioHostname = 'http://localhost:3333';
  const isPreviewEnabled = sanity.preview?.enabled;
  const {nonce, header, NonceProvider} = createContentSecurityPolicy({
    shop: {
      checkoutDomain: context.env.PUBLIC_CHECKOUT_DOMAIN,
      storeDomain: context.env.PUBLIC_STORE_DOMAIN,
    },
    frameAncestors: isPreviewEnabled ? [studioHostname] : [],
    defaultSrc: [
      'https://cdn.sanity.io',
      'https://lh3.googleusercontent.com',
      'https://*.klaviyo.com',
    ],
    connectSrc: [
      `https://${projectId}.api.sanity.io`,
      `wss://${projectId}.api.sanity.io`,
      'https://*.klaviyo.com',
    ],
    styleSrc: [
      'https://*.klaviyo.com',
      'https://fonts.googleapis.com',
    ],
    // fontSrc/imgSrc hebben geen Hydrogen-defaults en vallen na het zetten
    // niet meer terug op default-src — alle bronnen expliciet opnemen.
    fontSrc: [
      "'self'",
      'data:',
      'https://fonts.gstatic.com',
      'https://*.klaviyo.com',
    ],
    imgSrc: [
      "'self'",
      'data:',
      'blob:',
      'https://cdn.shopify.com',
      'https://cdn.sanity.io',
      'https://lh3.googleusercontent.com',
      'https://*.klaviyo.com',
      'https://d3k81ch9hvuctc.cloudfront.net',
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
        console.error(error);
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
