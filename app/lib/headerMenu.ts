import type {Storefront} from '@shopify/hydrogen';
import type {CurrencyCode} from '@shopify/hydrogen/storefront-api-types';
import {resolveLinkUrl, isAbsoluteExternalUrl, isRelativePath} from '~/lib/links';
import {uniqueStrings} from '~/lib/sanityModules';

export type MenuProductCard = {
  id: string;
  title: string;
  handle: string;
  image: {
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
  price: {amount: string; currencyCode: CurrencyCode};
};

export type HeaderMenuGroupLink = {title: string; to: string};

export type HeaderMenuItem =
  | {
      kind: 'group';
      key: string;
      title: string;
      links: HeaderMenuGroupLink[];
      products: MenuProductCard[];
    }
  | {
      kind: 'link';
      key: string;
      label: string;
      to: string;
      external: boolean;
      newWindow: boolean;
    };

export type HeaderMenuData = {items: HeaderMenuItem[]};

/** Fallback zodat de header nooit leeg rendert als Sanity (nog) geen menu heeft. */
export const FALLBACK_HEADER_MENU: HeaderMenuData = {
  items: [
    {
      kind: 'link',
      key: 'fallback-collections',
      label: 'Collections',
      to: '/collections',
      external: false,
      newWindow: false,
    },
    {
      kind: 'link',
      key: 'fallback-about',
      label: 'About',
      to: '/pages/about',
      external: false,
      newWindow: false,
    },
  ],
};

type RawMenuLink = {
  _key: string;
  _type: 'collectionGroup' | 'linkInternal' | 'linkExternal';
  // collectionGroup
  title?: string | null;
  collectionLinks?: Array<{title: string | null; handle: string | null} | null> | null;
  productsHandle?: string | null;
  // linkInternal
  reference?: {_type: string; slug: string | null; label: string | null} | null;
  // linkExternal
  url?: string | null;
  newWindow?: boolean | null;
  label?: string | null;
};

export const SANITY_HEADER_MENU_QUERY = `*[_type == "settings"][0].menu.links[]{
  _key,
  _type,
  _type == "collectionGroup" => {
    "title": coalesce(title[language == $language][0].value, title[language == "nl"][0].value),
    "collectionLinks": collectionLinks[]->{
      "title": store.title,
      "handle": store.slug.current
    },
    "productsHandle": collectionProducts->store.slug.current
  },
  _type == "linkInternal" => {
    "reference": reference->{
      _type,
      "slug": select(
        _type in ["collection", "product"] => store.slug.current,
        _type == "page" => slug.current
      ),
      "label": select(
        _type == "page" => coalesce(title[language == $language][0].value, title[language == "nl"][0].value),
        _type == "home" => "Home",
        store.title
      )
    }
  },
  _type == "linkExternal" => {
    url,
    newWindow,
    "label": coalesce(label[language == $language][0].value, label[language == "nl"][0].value)
  }
}`;

type MenuProductsResult = {
  collections: {
    nodes: Array<{
      handle: string;
      products: {
        nodes: Array<{
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
            minVariantPrice: {amount: string; currencyCode: CurrencyCode};
          };
        }>;
      };
    }>;
  } | null;
};

export const MENU_PRODUCTS_QUERY = `#graphql
  fragment MenuProductCard on Product {
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
  query MenuProducts(
    $query: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    collections(first: 10, query: $query) {
      nodes {
        handle
        products(first: 4) {
          nodes {
            ...MenuProductCard
          }
        }
      }
    }
  }
` as const;

type HeaderMenuContext = {
  sanity: {
    fetch<T>(query: string, params?: Record<string, unknown>): Promise<T>;
  };
  storefront: Storefront;
};

/**
 * Laadt het hoofdmenu uit Sanity (Settings → Navigatie) en hydrateert de
 * mega-menu productkaarten via één Shopify Storefront-query per request
 * (alle uitgelichte collecties tegelijk, op handle).
 * Geeft `null` terug bij een leeg of onbereikbaar menu → caller valt terug
 * op FALLBACK_HEADER_MENU.
 */
export async function loadHeaderMenu(
  context: HeaderMenuContext,
  language: string,
): Promise<HeaderMenuData | null> {
  const rawLinks = await context.sanity
    .fetch<RawMenuLink[] | null>(SANITY_HEADER_MENU_QUERY, {language})
    .catch(() => null);

  if (!rawLinks || rawLinks.length === 0) return null;

  const featuredHandles = uniqueStrings(
    rawLinks.map((link) =>
      link._type === 'collectionGroup' ? link.productsHandle : null,
    ),
  );

  const productsByCollection = new Map<string, MenuProductCard[]>();
  if (featuredHandles.length > 0) {
    try {
      const result = (await context.storefront.query(MENU_PRODUCTS_QUERY, {
        variables: {
          query: featuredHandles.map((handle) => `handle:${handle}`).join(' OR '),
        },
        cache: context.storefront.CacheLong(),
      })) as MenuProductsResult;

      for (const collection of result.collections?.nodes ?? []) {
        productsByCollection.set(
          collection.handle,
          collection.products.nodes.map((product) => ({
            id: product.id,
            title: product.title,
            handle: product.handle,
            image: product.featuredImage
              ? {
                  url: product.featuredImage.url,
                  altText: product.featuredImage.altText,
                  width: product.featuredImage.width,
                  height: product.featuredImage.height,
                }
              : null,
            price: product.priceRange.minVariantPrice,
          })),
        );
      }
    } catch {
      // Zonder productkaarten blijft het menu gewoon bruikbaar
    }
  }

  const items: HeaderMenuItem[] = [];
  for (const link of rawLinks) {
    if (link._type === 'collectionGroup') {
      if (!link.title) continue;
      const groupLinks: HeaderMenuGroupLink[] = (link.collectionLinks ?? [])
        .filter(
          (col): col is {title: string; handle: string} =>
            Boolean(col?.title && col?.handle),
        )
        .map((col) => ({title: col.title, to: `/collections/${col.handle}`}));
      items.push({
        kind: 'group',
        key: link._key,
        title: link.title,
        links: groupLinks,
        products: link.productsHandle
          ? (productsByCollection.get(link.productsHandle) ?? [])
          : [],
      });
    } else if (link._type === 'linkInternal') {
      if (!link.reference?.label) continue;
      items.push({
        kind: 'link',
        key: link._key,
        label: link.reference.label,
        to: resolveLinkUrl({_type: 'linkInternal', reference: {
          _type: link.reference._type,
          slug: link.reference.slug ?? undefined,
        }}),
        external: false,
        newWindow: false,
      });
    } else if (link._type === 'linkExternal') {
      if (!link.url) continue;
      const to = resolveLinkUrl({_type: 'linkExternal', url: link.url});
      let label = link.label;
      if (!label) {
        if (isRelativePath(to)) {
          label = to;
        } else {
          try {
            label = new URL(to).hostname.replace(/^www\./, '');
          } catch {
            continue;
          }
        }
      }
      const absoluteExternal = isAbsoluteExternalUrl(to);
      items.push({
        kind: 'link',
        key: link._key,
        label,
        to,
        external: absoluteExternal,
        newWindow: absoluteExternal ? (link.newWindow ?? true) : false,
      });
    }
  }

  return items.length > 0 ? {items} : null;
}
