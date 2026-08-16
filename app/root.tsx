import {
  Analytics,
  getShopAnalytics,
  useNonce,
  type SeoConfig,
} from '@shopify/hydrogen';
import {useEffect} from 'react';
import {SITE_NAME} from '~/lib/seo';
import {captureError} from '~/lib/errorReporting';
import {
  Link,
  Outlet,
  useRouteError,
  isRouteErrorResponse,
  type ShouldRevalidateFunction,
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from 'react-router';
import type {Route} from './+types/root';
import favicon from '~/assets/favicon.svg';
import cormorantGaramondFont from '~/assets/fonts/cormorant-garamond-latin.woff2?url';
import dmSansFont from '~/assets/fonts/dm-sans-latin.woff2?url';
import {syncCartBuyerIdentity} from '~/lib/cartBuyer';
import {FALLBACK_HEADER_MENU, loadHeaderMenu} from '~/lib/headerMenu';
import {sanityLanguage, useLocalePrefix} from '~/lib/i18n';
import type {FooterData} from '~/components/Footer';
import resetStyles from '~/styles/reset.css?url';
import appStyles from '~/styles/app.css?url';
import tailwindCss from './styles/tailwind.css?url';
import {PageLayout} from './components/PageLayout';
import {NotFound} from './components/NotFound';
import {KlaviyoOnsite} from './components/KlaviyoOnsite';
import {MarketingTags} from './components/MarketingTags';
import {getUiTranslations} from './lib/translations';
import {Sanity} from 'hydrogen-sanity';
import {usePreviewMode} from 'hydrogen-sanity/preview';
import {VisualEditing} from 'hydrogen-sanity/visual-editing';

export type RootLoader = typeof loader;

/**
 * This is important to avoid re-fetching root queries on sub-navigations
 */
export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  currentUrl,
  nextUrl,
}) => {
  // revalidate when a mutation is performed e.g add to cart, login...
  if (formMethod && formMethod !== 'GET') return true;

  // revalidate when manually revalidating via useRevalidator
  if (currentUrl.toString() === nextUrl.toString()) return true;

  // Defaulting to no revalidation for root loader data to improve performance.
  // When using this feature, you risk your UI getting out of sync with your server.
  // Use with caution. If you are uncomfortable with this optimization, update the
  // line below to `return defaultShouldRevalidate` instead.
  // For more details see: https://remix.run/docs/en/main/route/should-revalidate
  return false;
};

/**
 * The main and reset stylesheets are added in the Layout component
 * to prevent a bug in development HMR updates.
 *
 * This avoids the "failed to execute 'insertBefore' on 'Node'" error
 * that occurs after editing and navigating to another page.
 *
 * It's a temporary fix until the issue is resolved.
 * https://github.com/remix-run/remix/issues/9242
 */
export function links() {
  return [
    {
      rel: 'preconnect',
      href: 'https://cdn.shopify.com',
    },
    {
      rel: 'preconnect',
      href: 'https://shop.app',
    },
    // Self-hosted fonts (zie app/styles/tailwind.css) — preloaden voorkomt
    // een flits van fallback-tekst, want beide worden boven de vouw gebruikt.
    {
      rel: 'preload',
      href: cormorantGaramondFont,
      as: 'font',
      type: 'font/woff2',
      crossOrigin: 'anonymous',
    },
    {
      rel: 'preload',
      href: dmSansFont,
      as: 'font',
      type: 'font/woff2',
      crossOrigin: 'anonymous',
    },
    {rel: 'icon', type: 'image/svg+xml', href: favicon},
    {rel: 'apple-touch-icon', href: '/apple-touch-icon.png'},
  ];
}

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  const {storefront, env} = args.context;

  return {
    ...deferredData,
    ...criticalData,
    publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
    shop: getShopAnalytics({
      storefront,
      publicStorefrontId: env.PUBLIC_STOREFRONT_ID,
    }),
    consent: {
      checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN ?? env.PUBLIC_STORE_DOMAIN,
      storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
      withPrivacyBanner: true,
      // localize the privacy banner
      country: args.context.storefront.i18n.country,
      language: args.context.storefront.i18n.language,
    },
    marketing: {
      gtmContainerId: env.PUBLIC_GTM_CONTAINER_ID ?? null,
      metaPixelId: env.PUBLIC_META_PIXEL_ID ?? null,
      clarityProjectId: env.PUBLIC_CLARITY_PROJECT_ID ?? null,
    },
  };
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, request}: Route.LoaderArgs) {
  const {storefront, sanity} = context;
  const language = sanityLanguage(storefront.i18n.language);

  const [headerMenu, sanitySettings, footerData] = await Promise.all([
    loadHeaderMenu(context, language),
    sanity.fetch<SanitySettingsRaw | null>(TOPBAR_QUERY, {language}),
    sanity.fetch<FooterData | null>(SANITY_FOOTER_QUERY, {language}).catch(
      () => null,
    ),
  ]);

  const topbarUsps =
    sanitySettings?.usps?.filter((item: {text: string; iconUrl: string | null}) => Boolean(item.text)) ?? [];

  const siteTitle = sanitySettings?.seo?.title ?? SITE_NAME;
  const seo: SeoConfig = {
    title: siteTitle,
    titleTemplate: `%s | ${siteTitle}`,
    description: sanitySettings?.seo?.description ?? undefined,
    media: sanitySettings?.seo?.imageUrl ?? undefined,
  };

  return {
    headerMenu: headerMenu ?? FALLBACK_HEADER_MENU,
    topbarUsps,
    footer: footerData,
    seo,
    origin: new URL(request.url).origin,
  };
}

type SanitySettingsRaw = {
  usps: Array<{text: string; iconUrl: string | null}> | null;
  seo?: {
    title?: string | null;
    description?: string | null;
    imageUrl?: string | null;
  } | null;
};

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  const {customerAccount, cart} = context;

  return {
    // Sync buyer identity for existing sessions so VIP automatic discounts apply
    // to the cart drawer without requiring a fresh login.
    cart: syncCartBuyerIdentity({cart, customerAccount}).then(
      ({cart: syncedCart}) => syncedCart,
    ),
    isLoggedIn: customerAccount.isLoggedIn(),
  };
}

export function Layout({children}: {children?: React.ReactNode}) {
  const nonce = useNonce();
  const previewMode = usePreviewMode();
  const data = useRouteLoaderData<RootLoader>('root');
  const lang = data?.consent?.language?.toLowerCase() ?? 'nl';

  return (
    <html lang={lang}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        {/* Cormorant Garamond (heading) + DM Sans (body) zijn self-hosted via
            app/styles/tailwind.css — geen render-blocking Google Fonts-request meer. */}
        <link rel="stylesheet" href={tailwindCss}></link>
        <link rel="stylesheet" href={resetStyles}></link>
        <link rel="stylesheet" href={appStyles}></link>
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <Sanity nonce={nonce} />
        <ScrollRestoration nonce={nonce} />
        <Scripts nonce={nonce} />
      </body>
      {previewMode ? <VisualEditing action="/api/preview" /> : null}
    </html>
  );
}

export default function App() {
  const data = useRouteLoaderData<RootLoader>('root');

  if (!data) {
    return <Outlet />;
  }

  return (
    <Analytics.Provider
      cart={data.cart}
      shop={data.shop}
      consent={data.consent}
    >
      <PageLayout {...data}>
        <Outlet />
      </PageLayout>
      <KlaviyoOnsite companyId={data.footer?.klaviyoCompanyId} />
      <MarketingTags
        gtmContainerId={data.marketing.gtmContainerId}
        metaPixelId={data.marketing.metaPixelId}
        clarityProjectId={data.marketing.clarityProjectId}
      />
    </Analytics.Provider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const rootData = useRouteLoaderData<RootLoader>('root');
  const localePrefix = useLocalePrefix();
  const t = getUiTranslations(rootData?.consent.language);
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorStatus = error.status;
  }

  useEffect(() => {
    // 404s are routine, not exceptional — only report real errors.
    if (errorStatus !== 404) {
      captureError(error, {stage: 'route-error-boundary', status: errorStatus});
    }
  }, [error, errorStatus]);

  if (errorStatus === 404) {
    const notFound = <NotFound standalone={!rootData} />;
    if (!rootData) return notFound;

    return (
      <PageLayout
        cart={rootData.cart}
        footer={rootData.footer}
        headerMenu={rootData.headerMenu}
        isLoggedIn={rootData.isLoggedIn}
        topbarUsps={rootData.topbarUsps}
      >
        {notFound}
      </PageLayout>
    );
  }

  const homeTo = localePrefix ? `${localePrefix}/` : '/';

  return (
    <section className="route-error" aria-labelledby="route-error-title">
      <h1 id="route-error-title" className="route-error__title">
        {t.errorTitle}
      </h1>
      <p className="route-error__body">{t.errorBody}</p>
      <Link className="route-error__cta" to={homeTo}>
        {t.notFoundHome}
      </Link>
    </section>
  );
}

const TOPBAR_QUERY = `*[_type == "settings"][0]{
  "usps": topbarUsps[]{
    "text": coalesce(text[language == $language][0].value, text[language == "nl"][0].value),
    "iconUrl": icon.asset->url
  },
  "seo": seo{
    "title": coalesce(title[language == $language][0].value, title[language == "nl"][0].value),
    "description": coalesce(description[language == $language][0].value, description[language == "nl"][0].value),
    "imageUrl": image.asset->url
  }
}`;

const SANITY_FOOTER_QUERY = `*[_type == "footer"][0]{
  "uspCards": uspCards[]{
    _key,
    "iconUrl": icon.asset->url,
    "title": coalesce(title[language == $language][0].value, title[language == "nl"][0].value),
    "subtext": coalesce(subtext[language == $language][0].value, subtext[language == "nl"][0].value)
  },
  "brandTitle": coalesce(brandTitle[language == $language][0].value, brandTitle[language == "nl"][0].value),
  "brandText": coalesce(brandText[language == $language][0].value, brandText[language == "nl"][0].value),
  "socialLinks": socialLinks[]{
    _key,
    platform,
    url
  },
  "menuColumns": menuColumns[]{
    _key,
    "title": coalesce(title[language == $language][0].value, title[language == "nl"][0].value),
    "links": links[]{
      _key,
      "label": coalesce(label[language == $language][0].value, label[language == "nl"][0].value),
      "link": link[0]{
        _type,
        url,
        "reference": reference->{
          _type,
          "slug": select(
            _type in ["collection", "product"] => store.slug.current,
            _type == "page" => slug.current
          )
        }
      }
    }
  },
  "newsletterTitle": coalesce(newsletterTitle[language == $language][0].value, newsletterTitle[language == "nl"][0].value),
  "newsletterText": coalesce(newsletterText[language == $language][0].value, newsletterText[language == "nl"][0].value),
  klaviyoCompanyId,
  klaviyoFormId
}`;
