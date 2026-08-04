import type {CurrencyCode} from '@shopify/hydrogen/storefront-api-types';
import type {FeaturedProductItem} from '~/components/FeaturedProducts';
import type {DualCardItem} from '~/components/DualCardBanner';
import type {ResolvedCollectionModule} from '~/components/CollectionModules';
import {
  sanityImageProps,
  urlFor,
  type SanityImageConfig,
} from '~/lib/sanityImage';
import {resolveLinkUrl} from '~/lib/links';

export type SanityLinkRaw = {
  _type: string;
  url?: string;
  reference?: {_type: string; slug?: string};
};

export type SanityDualCardRaw = {
  _key?: string;
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

export {resolveLinkUrl};

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

export function resolveDualCardBanner(
  rawCards: SanityDualCardRaw[],
  config: SanityImageConfig,
): DualCardItem[] {
  const result: DualCardItem[] = [];
  for (const card of rawCards) {
    if (!card.image?.asset?.url) continue;
    const {src: imageUrl, srcSet} = sanityImageProps(
      card.image as Parameters<typeof urlFor>[0],
      config,
      {width: 1200, height: 1500},
    );
    if (!imageUrl) continue;
    result.push({
      key: card._key,
      image: {url: imageUrl, srcSet, altText: card.title ?? undefined},
      title: card.title ?? '',
      subtitle: card.subtitle ?? null,
      buttonText: card.buttonText ?? null,
      url: resolveLinkUrl(card.link?.[0]),
    });
  }
  return result;
}

export type SanityHeroRaw = {
  title?: string | null;
  description?: string | null;
  button_text?: string | null;
  link?: SanityLinkRaw[] | null;
  imageDesktop?: {
    asset?: {url?: string | null} | null;
  } | null;
  imageMobile?: {
    asset?: {url?: string | null} | null;
  } | null;
} | null;

export type ResolvedHeroBanner = {
  title: string;
  description: string | null;
  buttonText: string | null;
  linkUrl: string | null;
  desktopImage: {src: string; srcSet: string};
  mobileImage: {src: string; srcSet: string} | null;
} | null;

/**
 * Bouwt een page/collection hero server-side (begrensde breedte + srcSet).
 * Vereist desktop image + title; anders null.
 * CTA alleen als button_text én een link zijn ingevuld — geen "Shop now"-fallback.
 */
export function resolveHeroBanner(
  raw: SanityHeroRaw,
  config: SanityImageConfig,
): ResolvedHeroBanner {
  if (!raw?.imageDesktop?.asset?.url || !raw.title) return null;

  const desktopImage = sanityImageProps(
    raw.imageDesktop as Parameters<typeof urlFor>[0],
    config,
    {width: 2000},
  );
  if (!desktopImage.src) return null;

  const mobileImage = raw.imageMobile?.asset?.url
    ? sanityImageProps(raw.imageMobile as Parameters<typeof urlFor>[0], config, {
        width: 900,
      })
    : null;

  const buttonText = raw.button_text?.trim() || null;
  const linkRaw = raw.link?.[0];
  const linkUrl = buttonText && linkRaw ? resolveLinkUrl(linkRaw) : null;

  return {
    title: raw.title,
    description: raw.description ?? null,
    buttonText: linkUrl ? buttonText : null,
    linkUrl,
    desktopImage,
    mobileImage,
  };
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

type SanityHeroImageRaw = {
  asset?: {url?: string | null} | null;
} | null;

/**
 * Ruwe vorm van de gedeelde `modules`-array — gebruikt door zowel
 * collectiepagina's als (content-)pagina's. Beide velden heten in Sanity
 * `modules` en delen dezelfde vier module-types.
 */
export type SanityContentModuleRaw = {
  _key: string;
  _type: string;
  // hero (promo banner)
  title?: string | null;
  description?: string | null;
  button_text?: string | null;
  link?: SanityLinkRaw[] | null;
  imageDesktop?: SanityHeroImageRaw;
  imageMobile?: SanityHeroImageRaw;
  // dualCardBanner
  cards?: SanityDualCardRaw[] | null;
  // featuredProducts
  heading?: string | null;
  products?: SanityFeaturedProductSelection[] | null;
  viewAllLabel?: string | null;
  viewAllUrl?: string | null;
  // callout
  text?: string | null;
};

/**
 * Resolvet de gedeelde `modules`-array (hero/promo banner, dual-card banner,
 * featuredProducts product slider, callout) naar de vorm die
 * `<CollectionModules>` verwacht. Gebruikt door zowel de collectie- als de
 * pagina-route.
 */
export async function resolveContentModules(
  context: StorefrontQueryContext,
  modules: SanityContentModuleRaw[],
  config: SanityImageConfig,
): Promise<ResolvedCollectionModule[]> {
  if (!modules.length) return [];

  // Eén Shopify-query voor alle productreferenties in featuredProducts-modules
  const productIds = uniqueStrings(
    modules
      .filter((module) => module._type === 'featuredProducts')
      .flatMap((module) => module.products ?? [])
      .map((selection) => selection.productId),
  );
  const productsById = await hydrateProductsByGid(context, productIds);

  const resolved: ResolvedCollectionModule[] = [];

  for (const module of modules) {
    if (module._type === 'hero') {
      if (!module.imageDesktop?.asset?.url || !module.title) continue;
      const desktopImage = sanityImageProps(
        module.imageDesktop as Parameters<typeof urlFor>[0],
        config,
        {width: 2000},
      );
      if (!desktopImage.src) continue;
      const mobileImage = module.imageMobile?.asset?.url
        ? sanityImageProps(
            module.imageMobile as Parameters<typeof urlFor>[0],
            config,
            {width: 900},
          )
        : null;
      resolved.push({
        key: module._key,
        type: 'promoBanner',
        imageUrl: desktopImage.src,
        imageSrcSet: desktopImage.srcSet,
        mobileImageUrl: mobileImage?.src ?? null,
        mobileImageSrcSet: mobileImage?.srcSet,
        title: module.title,
        description: module.description ?? null,
        buttonText: module.button_text ?? 'Shop now',
        url: resolveLinkUrl(module.link?.[0]),
      });
    } else if (module._type === 'dualCardBanner') {
      const cards = resolveDualCardBanner(module.cards ?? [], config);
      if (cards.length !== 2) continue;
      resolved.push({key: module._key, type: 'dualCardBanner', cards});
    } else if (module._type === 'featuredProducts') {
      const products = (module.products ?? [])
        .map((selection) => resolveFeaturedProductItem(selection, productsById))
        .filter((product): product is NonNullable<typeof product> =>
          Boolean(product),
        );
      if (!products.length) continue;
      resolved.push({
        key: module._key,
        type: 'featuredProducts',
        heading: module.heading ?? '',
        products,
        viewAllLabel: module.viewAllLabel ?? undefined,
        viewAllUrl: module.viewAllUrl ?? undefined,
      });
    } else if (module._type === 'callout') {
      if (!module.text) continue;
      const link = module.link?.[0];
      resolved.push({
        key: module._key,
        type: 'callout',
        text: module.text,
        url: link ? resolveLinkUrl(link) : null,
      });
    }
  }

  return resolved;
}

/**
 * GROQ-projectie voor de gedeelde `modules`-array. Bevat het veld al onder
 * zijn eigen naam (`modules`), dus embedden met `${SANITY_MODULES_GROQ},`
 * in een document-projectie volstaat.
 */
export const SANITY_MODULES_GROQ = `modules[]{
    _key,
    _type,
    _type == "hero" => {
      "title": coalesce(title[language == $language][0].value, title[language == "nl"][0].value),
      "description": coalesce(description[language == $language][0].value, description[language == "nl"][0].value),
      "button_text": coalesce(button_text[language == $language][0].value, button_text[language == "nl"][0].value),
      link[]{
        _type,
        _type == "linkInternal" => {
          reference->{
            _type,
            _type in ["collection", "product"] => { "slug": store.slug.current },
            _type == "page" => { "slug": slug.current }
          }
        },
        _type == "linkExternal" => {
          url,
          newWindow
        }
      },
      imageDesktop{ asset->{_id, url, metadata{dimensions}}, hotspot, crop },
      imageMobile{ asset->{_id, url, metadata{dimensions}}, hotspot, crop }
    },
    _type == "dualCardBanner" => {
      cards[]{
        _key,
        image{ asset->{_id, url, metadata{dimensions}}, hotspot, crop },
        "title": coalesce(title[language == $language][0].value, title[language == "nl"][0].value),
        "subtitle": coalesce(subtitle[language == $language][0].value, subtitle[language == "nl"][0].value),
        "buttonText": coalesce(buttonText[language == $language][0].value, buttonText[language == "nl"][0].value),
        link[]{
          _type,
          _type == "linkInternal" => {
            reference->{
              _type,
              _type in ["collection", "product"] => { "slug": store.slug.current },
              _type == "page" => { "slug": slug.current }
            }
          },
          _type == "linkExternal" => {
            url,
            newWindow
          }
        }
      }
    },
    _type == "featuredProducts" => {
      "heading": coalesce(heading[language == $language][0].value, heading[language == "nl"][0].value),
      "products": products[]->{
        "productId": store.gid,
        "handle": store.slug.current,
        "title": store.title
      },
      "viewAllLabel": coalesce(viewAll.label[language == $language][0].value, viewAll.label[language == "nl"][0].value),
      "viewAllUrl": viewAll.url
    },
    _type == "callout" => {
      "text": coalesce(text[language == $language][0].value, text[language == "nl"][0].value),
      link[]{
        _type,
        _type == "linkInternal" => {
          reference->{
            _type,
            _type in ["collection", "product"] => { "slug": store.slug.current },
            _type == "page" => { "slug": slug.current }
          }
        },
        _type == "linkExternal" => {
          url,
          newWindow
        }
      }
    }
  }`;
