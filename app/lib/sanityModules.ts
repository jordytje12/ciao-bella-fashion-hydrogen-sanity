import type {CurrencyCode} from '@shopify/hydrogen/storefront-api-types';
import type {FeaturedProductItem} from '~/components/FeaturedProducts';
import type {DualCardItem} from '~/components/DualCardBanner';
import {urlFor} from '~/lib/sanityImage';

export type SanityLinkRaw = {
  _type: string;
  url?: string;
  reference?: {_type: string; slug?: string};
};

export type SanityDualCardRaw = {
  image?: {
    asset?: {
      url?: string | null;
      metadata?: {dimensions?: {width?: number | null; height?: number | null} | null} | null;
    } | null;
  } | null;
  title?: string | null;
  subtitle?: string | null;
  buttonText?: string | null;
  link?: SanityLinkRaw[] | null;
};

export type SanityFeaturedProductSelection = {
  productId?: string | null;
  handle?: string | null;
  title?: string | null;
};

export type ShopifyProductNode = {
  id: string;
  title: string;
  handle: string;
  featuredImage: {
    id?: string | null;
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: CurrencyCode;
    };
  };
};

type SanityModuleProductsResult = {
  products: Array<ShopifyProductNode | null>;
};

type StorefrontQueryContext = {
  storefront: {
    query(query: string, options?: {variables?: Record<string, unknown>}): Promise<unknown>;
  };
};

export function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
}

export function resolveLinkUrl(link: SanityLinkRaw | undefined): string {
  if (!link) return '/';
  if (link._type === 'linkExternal') return link.url ?? '/';
  const ref = link.reference;
  if (!ref?.slug) return '/';
  if (ref._type === 'collection') return `/collections/${ref.slug}`;
  if (ref._type === 'product') return `/products/${ref.slug}`;
  if (ref._type === 'page') return `/pages/${ref.slug}`;
  return '/';
}

export function resolveFeaturedProductItem(
  selection: SanityFeaturedProductSelection,
  productsById: Map<string, ShopifyProductNode>,
): FeaturedProductItem | null {
  if (!selection.productId) return null;

  const product = productsById.get(selection.productId);
  if (!product) return null;

  const title = product.title || selection.title;
  const handle = product.handle || selection.handle;
  if (!title || !handle) return null;

  return {
    id: product.id,
    title,
    handle,
    image: product.featuredImage
      ? {
          url: product.featuredImage.url,
          altText: product.featuredImage.altText,
          width: product.featuredImage.width,
          height: product.featuredImage.height,
        }
      : null,
    price: product.priceRange.minVariantPrice,
  };
}

export function resolveDualCardBanner(rawCards: SanityDualCardRaw[]): DualCardItem[] {
  const result: DualCardItem[] = [];
  for (const card of rawCards) {
    if (!card.image?.asset?.url) continue;
    const imageUrl = urlFor(card.image as Parameters<typeof urlFor>[0])
      .width(1200)
      .height(1500)
      .auto('format')
      .fit('crop')
      .url();
    if (!imageUrl) continue;
    result.push({
      image: {url: imageUrl, altText: card.title ?? undefined},
      title: card.title ?? '',
      subtitle: card.subtitle ?? null,
      buttonText: card.buttonText ?? null,
      url: resolveLinkUrl(card.link?.[0]),
    });
  }
  return result;
}

/**
 * Haalt Shopify-productdata op voor een lijst GIDs (uit Sanity-referenties)
 * en geeft een Map terug zodat de Sanity-volgorde behouden kan blijven.
 */
export async function hydrateProductsByGid(
  context: StorefrontQueryContext,
  productIds: string[],
): Promise<Map<string, ShopifyProductNode>> {
  if (productIds.length === 0) return new Map();

  const response = (await context.storefront.query(
    SANITY_MODULE_PRODUCTS_QUERY,
    {variables: {productIds}},
  )) as SanityModuleProductsResult;

  return new Map(
    (response.products ?? [])
      .filter((product): product is ShopifyProductNode => Boolean(product))
      .map((product) => [product.id, product]),
  );
}

export const SANITY_MODULE_PRODUCTS_QUERY = `#graphql
  fragment SanityModuleProduct on Product {
    id
    title
    handle
    featuredImage {
      id
      url
      altText
      width
      height
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
  }

  query SanityModuleProducts(
    $productIds: [ID!]!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    products: nodes(ids: $productIds) {
      ... on Product {
        ...SanityModuleProduct
      }
    }
  }
` as const;
