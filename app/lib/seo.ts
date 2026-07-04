import {
  getSeoMeta as hydrogenGetSeoMeta,
  type SeoConfig,
} from '@shopify/hydrogen';

export const SITE_NAME = 'Ciao Bella Fashion';

/**
 * Als Hydrogen's `getSeoMeta`, maar met een gegarandeerde array-return
 * (React Router 7 meta-functies mogen geen `undefined` teruggeven).
 */
export function getSeoMeta(
  ...configs: Parameters<typeof hydrogenGetSeoMeta>
) {
  return hydrogenGetSeoMeta(...configs) ?? [];
}

export type RootSeoData = {
  origin: string;
  seo: SeoConfig;
};

type JsonLd = NonNullable<SeoConfig['jsonLd']>;

/**
 * Absolute canonical zonder search params. `pathname` moet de locale-prefix
 * bevatten (bijv. `/de-de/products/x`), zodat elke taalversie naar zichzelf
 * canonicaliseert.
 */
export function canonicalUrl(origin: string, pathname: string): string {
  return `${origin}${pathname}`;
}

/**
 * Haalt de root-SEO-defaults (Sanity settings.seo + origin) uit `matches`
 * binnen een route-meta-functie.
 */
export function rootSeo(
  matches: ReadonlyArray<{id: string; data?: unknown} | undefined>,
): RootSeoData {
  const root = matches.find((match) => match?.id === 'root')?.data as
    | Partial<RootSeoData>
    | undefined;
  return {
    origin: root?.origin ?? '',
    seo: root?.seo ?? {title: SITE_NAME, titleTemplate: `%s | ${SITE_NAME}`},
  };
}

// ─── JSON-LD builders ────────────────────────────────────────────────────────

export function productJsonLd({
  product,
  selectedVariant,
  url,
}: {
  product: {
    title: string;
    description?: string | null;
    vendor?: string | null;
    featuredImage?: {url: string} | null;
  };
  selectedVariant?: {
    price?: {amount: string; currencyCode: string} | null;
    availableForSale?: boolean;
    sku?: string | null;
    image?: {url: string} | null;
  } | null;
  url: string;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description ?? undefined,
    image:
      selectedVariant?.image?.url ?? product.featuredImage?.url ?? undefined,
    sku: selectedVariant?.sku ?? undefined,
    brand: product.vendor
      ? {'@type': 'Brand', name: product.vendor}
      : undefined,
    offers: selectedVariant?.price
      ? {
          '@type': 'Offer',
          url,
          price: selectedVariant.price.amount,
          priceCurrency: selectedVariant.price.currencyCode,
          availability: selectedVariant.availableForSale
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        }
      : undefined,
  } as JsonLd;
}

export function breadcrumbJsonLd(
  items: Array<{name: string; url?: string}>,
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  } as JsonLd;
}

export function organizationJsonLd({
  url,
  sameAs,
}: {
  url: string;
  sameAs?: string[];
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url,
    sameAs: sameAs?.length ? sameAs : undefined,
  } as JsonLd;
}

export function webSiteJsonLd({origin}: {origin: string}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: origin,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${origin}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  } as JsonLd;
}

export function blogPostingJsonLd({
  title,
  url,
  image,
  datePublished,
  author,
}: {
  title: string;
  url: string;
  image?: string | null;
  datePublished?: string | null;
  author?: string | null;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    url,
    image: image ?? undefined,
    datePublished: datePublished ?? undefined,
    author: author ? {'@type': 'Person', name: author} : undefined,
  } as JsonLd;
}
