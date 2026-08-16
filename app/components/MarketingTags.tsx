import {useEffect, useRef} from 'react';
import {AnalyticsEvent, useAnalytics} from '@shopify/hydrogen';
import type {
  CartLineUpdatePayload,
  CartViewPayload,
  CollectionViewPayload,
  ProductViewPayload,
  SearchViewPayload,
} from '@shopify/hydrogen';
import {isAnalyticsConsentAllowed, isMarketingConsentAllowed} from '~/lib/consent';

declare global {
  interface Window {
    dataLayer?: unknown[];
    fbq?: FbqFunction;
    _fbq?: FbqFunction;
  }
}

type FbqFunction = {
  (...args: unknown[]): void;
  push: FbqFunction;
  loaded: boolean;
  version: string;
  queue: unknown[][];
};

type MarketingTagsProps = {
  /** Google Tag Manager container id, bv. `GTM-XXXXXXX`. */
  gtmContainerId?: string | null;
  /** Meta (Facebook/Instagram) Pixel id. */
  metaPixelId?: string | null;
  /** Microsoft Clarity project id (Clarity > Settings > Overview). */
  clarityProjectId?: string | null;
};

// Lichte, eigen typering van de velden die we uit een cart line/cart nodig
// hebben — de generieke Hydrogen-payloadtypes dekken de volledige Storefront
// API-vorm, maar onze eigen CART_QUERY_FRAGMENT (zie app/lib/fragments.ts)
// garandeert dat deze velden er altijd zijn.
type AnalyticsMoney = {amount: string; currencyCode: string};
type AnalyticsCartLine = {
  quantity: number;
  cost?: {totalAmount?: AnalyticsMoney};
  merchandise?: {
    id?: string;
    title?: string;
    price?: AnalyticsMoney;
    product?: {title?: string; vendor?: string};
  };
};
type AnalyticsCart = {
  cost?: {totalAmount?: AnalyticsMoney; subtotalAmount?: AnalyticsMoney};
};

function pushDataLayerEvent(event: Record<string, unknown>) {
  if (!isAnalyticsConsentAllowed()) return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(event);
}

function loadGtm(containerId: string) {
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtm.js?id=${containerId}`;
  document.head.appendChild(script);
}

function loadMetaPixel(pixelId: string) {
  if (window.fbq) return;

  const queue: unknown[][] = [];
  const fbq: FbqFunction = Object.assign(
    (...args: unknown[]) => {
      queue.push(args);
    },
    {loaded: true, version: '2.0', queue},
  ) as FbqFunction;
  fbq.push = fbq;
  window.fbq = fbq;
  window._fbq = window._fbq ?? fbq;

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(script);

  window.fbq('init', pixelId);
  window.fbq('track', 'PageView');
}

// Clarity laadt lazy (pas na consent), dus deze module-scope referentie kan
// nog `null` zijn wanneer een subscribe-callback vuurt — beide helpers zijn
// daarom no-ops totdat loadClarity() de echte API heeft gezet.
type ClarityApi = typeof import('@microsoft/clarity').default;

let clarityApi: ClarityApi | null = null;

function clarityEvent(name: string) {
  clarityApi?.event(name);
}

function clarityTag(key: string, value: string | undefined) {
  if (value) clarityApi?.setTag(key, value);
}

async function loadClarity(projectId: string) {
  const {default: Clarity} = await import('@microsoft/clarity');
  clarityApi = Clarity;
  Clarity.init(projectId);
  // Expliciet doorgeven — voor het geval "cookie consent required" aanstaat
  // in het Clarity-dashboard. Zonder deze call meet Clarity cookieloos en
  // kloppen unieke bezoekers/heatmaps niet.
  Clarity.consentV2({
    ad_Storage: isMarketingConsentAllowed() ? 'granted' : 'denied',
    analytics_Storage: 'granted',
  });
}

function mapCartLine(line: unknown) {
  const cartLine = line as AnalyticsCartLine | null | undefined;
  const merchandise = cartLine?.merchandise;
  if (!merchandise) return null;

  return {
    item_id: merchandise.id,
    item_name: merchandise.product?.title,
    item_variant: merchandise.title,
    item_brand: merchandise.product?.vendor,
    price: Number(
      cartLine?.cost?.totalAmount?.amount ?? merchandise.price?.amount ?? 0,
    ),
    quantity: cartLine?.quantity ?? 1,
  };
}

/**
 * Stuurt GA4 (via GTM), Meta Pixel en Microsoft Clarity — deze ontbraken
 * voorheen volledig, er was alleen Shopify Analytics. Alle drie laden pas ná
 * cookietoestemming (GA4 en Clarity na analytics-consent, Meta na
 * marketing-consent) en luisteren naar Hydrogen's eigen analytics-events,
 * zodat we niet los hoeven bij te houden wat er op elke pagina gebeurt.
 */
export function MarketingTags({
  gtmContainerId,
  metaPixelId,
  clarityProjectId,
}: MarketingTagsProps) {
  const {subscribe} = useAnalytics();
  const gtmLoadedRef = useRef(false);
  const metaLoadedRef = useRef(false);
  const clarityLoadedRef = useRef(false);

  useEffect(() => {
    if (!gtmContainerId && !metaPixelId && !clarityProjectId) return;

    function tryLoad() {
      if (gtmContainerId && !gtmLoadedRef.current && isAnalyticsConsentAllowed()) {
        gtmLoadedRef.current = true;
        loadGtm(gtmContainerId);
      }
      if (metaPixelId && !metaLoadedRef.current && isMarketingConsentAllowed()) {
        metaLoadedRef.current = true;
        loadMetaPixel(metaPixelId);
      }
      if (
        clarityProjectId &&
        !clarityLoadedRef.current &&
        isAnalyticsConsentAllowed()
      ) {
        clarityLoadedRef.current = true;
        void loadClarity(clarityProjectId);
      }
    }

    // Consent kan al eerder (in een vorige sessie) gegeven zijn.
    tryLoad();

    document.addEventListener('visitorConsentCollected', tryLoad);
    return () => document.removeEventListener('visitorConsentCollected', tryLoad);
  }, [gtmContainerId, metaPixelId, clarityProjectId]);

  useEffect(() => {
    if (!gtmContainerId && !metaPixelId && !clarityProjectId) return;

    subscribe(AnalyticsEvent.PRODUCT_VIEWED, (payload: ProductViewPayload) => {
      pushDataLayerEvent({
        event: 'view_item',
        ecommerce: {
          items: payload.products.map((product) => ({
            item_id: product.id,
            item_name: product.title,
            item_variant: product.variantTitle,
            item_brand: product.vendor,
            price: Number(product.price),
            quantity: product.quantity || 1,
          })),
        },
      });
      clarityTag('product', payload.products[0]?.title);
    });

    subscribe(AnalyticsEvent.COLLECTION_VIEWED, (payload: CollectionViewPayload) => {
      pushDataLayerEvent({
        event: 'view_item_list',
        item_list_id: payload.collection.handle,
        item_list_name: payload.collection.handle,
      });
      clarityTag('collection', payload.collection.handle);
    });

    subscribe(AnalyticsEvent.SEARCH_VIEWED, (payload: SearchViewPayload) => {
      pushDataLayerEvent({event: 'search', search_term: payload.searchTerm});
      clarityEvent('search');
      clarityTag('search_term', payload.searchTerm);
    });

    subscribe(AnalyticsEvent.CART_VIEWED, (payload: CartViewPayload) => {
      const cart = payload.cart as AnalyticsCart | null;
      pushDataLayerEvent({
        event: 'view_cart',
        ecommerce: {
          currency: cart?.cost?.totalAmount?.currencyCode,
          value: cart?.cost?.totalAmount?.amount,
        },
      });
      clarityEvent('cart_viewed');
    });

    subscribe(
      AnalyticsEvent.PRODUCT_ADD_TO_CART,
      (payload: CartLineUpdatePayload) => {
        const item = mapCartLine(payload.currentLine);
        if (!item) return;
        pushDataLayerEvent({
          event: 'add_to_cart',
          ecommerce: {items: [item]},
        });
        clarityEvent('add_to_cart');
      },
    );
  }, [subscribe, gtmContainerId, metaPixelId, clarityProjectId]);

  return null;
}
