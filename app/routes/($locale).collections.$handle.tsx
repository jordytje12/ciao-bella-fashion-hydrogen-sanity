import {redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/($locale).collections.$handle';
import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
import {PortableText, type PortableTextBlock} from '@portabletext/react';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {ProductCard} from '~/components/ProductCard';
import {Aside, useAside} from '~/components/Aside';
import {
  AppliedFilterChips,
  CollectionFilters,
  SortSelect,
  type CollectionFilter,
} from '~/components/CollectionFilters';
import {
  getCollectionSortVariables,
  isFilteredOrSorted,
  parseFiltersFromSearchParams,
} from '~/lib/collectionFilters';
import {getSeoMeta, breadcrumbJsonLd, canonicalUrl, rootSeo} from '~/lib/seo';
import {
  CollectionModules,
  type ResolvedCollectionModule,
} from '~/components/CollectionModules';
import {portableTextComponents} from '~/components/PortableTextComponents';
import type {ProductItemFragment} from 'storefrontapi.generated';
import {urlFor} from '~/lib/sanityImage';
import {sanityLanguage} from '~/lib/i18n';
import {
  hydrateProductsByGid,
  resolveDualCardBanner,
  resolveFeaturedProductItem,
  resolveLinkUrl,
  uniqueStrings,
  type SanityDualCardRaw,
  type SanityFeaturedProductSelection,
  type SanityLinkRaw,
} from '~/lib/sanityModules';

export const meta: Route.MetaFunction = ({data, matches, location}) => {
  const {origin, seo} = rootSeo(matches);
  const url = canonicalUrl(origin, location.pathname);

  const title =
    data?.sanitySeo?.title ??
    data?.collection.seo?.title ??
    data?.collection.title ??
    '';
  const description =
    data?.sanitySeo?.description ??
    data?.collection.seo?.description ??
    data?.collection.description ??
    '';

  return getSeoMeta(seo, {
    title,
    description,
    url,
    robots: isFilteredOrSorted(location.search) ? {noIndex: true} : undefined,
    jsonLd: data?.collection
      ? breadcrumbJsonLd([
          {name: 'Home', url: origin || undefined},
          {name: data.collection.title, url},
        ])
      : undefined,
  });
};

export async function loader(args: Route.LoaderArgs) {
  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...criticalData};
}

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  const {storefront} = context;
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 8,
  });

  if (!handle) {
    throw redirect('/collections');
  }

  const {searchParams} = new URL(request.url);
  const filters = parseFiltersFromSearchParams(searchParams);
  const {sortKey, reverse} = getCollectionSortVariables(searchParams);

  const [{collection}, sanityCollection] = await Promise.all([
    storefront.query(COLLECTION_QUERY, {
      variables: {handle, filters, sortKey, reverse, ...paginationVariables},
    }),
    context.sanity
      .fetch(SANITY_COLLECTION_QUERY, {
        handle,
        language: sanityLanguage(context.storefront.i18n.language),
      })
      .catch(() => null) as Promise<SanityCollectionPageRaw | null>,
  ]);

  if (!collection) {
    throw new Response(`Collection ${handle} not found`, {
      status: 404,
    });
  }

  // The API handle might be localized, so redirect to the localized handle
  redirectIfHandleIsLocalized(request, {handle, data: collection});

  const modules = await resolveModules(
    context,
    sanityCollection?.modules ?? [],
  );

  return {
    collection,
    sanityIntro: sanityCollection?.intro ?? null,
    modules,
    sanitySeo: sanityCollection?.seo ?? null,
  };
}

type SanityHeroImageRaw = {
  asset?: {url?: string | null} | null;
} | null;

type SanityCollectionModuleRaw = {
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

type SanityCollectionPageRaw = {
  intro?: PortableTextBlock[] | null;
  modules?: SanityCollectionModuleRaw[] | null;
  seo?: {title?: string | null; description?: string | null} | null;
};

async function resolveModules(
  context: Route.LoaderArgs['context'],
  modules: SanityCollectionModuleRaw[],
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
      const imageUrl = urlFor(module.imageDesktop as Parameters<typeof urlFor>[0])
        .auto('format')
        .fit('crop')
        .url();
      if (!imageUrl) continue;
      const mobileImageUrl = module.imageMobile?.asset?.url
        ? urlFor(module.imageMobile as Parameters<typeof urlFor>[0])
            .auto('format')
            .fit('crop')
            .url()
        : null;
      resolved.push({
        key: module._key,
        type: 'promoBanner',
        imageUrl,
        mobileImageUrl,
        title: module.title,
        description: module.description ?? null,
        buttonText: module.button_text ?? 'Shop now',
        url: resolveLinkUrl(module.link?.[0]),
      });
    } else if (module._type === 'dualCardBanner') {
      const cards = resolveDualCardBanner(module.cards ?? []);
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

export default function Collection() {
  const {collection, sanityIntro, modules} = useLoaderData<typeof loader>();
  const {open} = useAside();

  const filters = (collection.products.filters ?? []) as CollectionFilter[];
  const hasProducts = collection.products.nodes.length > 0;

  return (
    <div className="collection-page">
      <header className="collection-page__header">
        <h1 className="collection-page__title">{collection.title}</h1>
        {sanityIntro?.length ? (
          <div className="collection-page__intro">
            <PortableText
              value={sanityIntro}
              components={portableTextComponents}
            />
          </div>
        ) : collection.description ? (
          <p className="collection-page__intro">{collection.description}</p>
        ) : null}
      </header>

      {filters.length > 0 && (
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 pb-4">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => open('filters')}
              className="rounded border border-black/20 px-4 py-1.5 font-body text-sm text-black transition-colors hover:border-black lg:hidden"
            >
              Filters
            </button>
            <div className="hidden lg:block" />
            <SortSelect />
          </div>
          <AppliedFilterChips filters={filters} />
        </div>
      )}

      <div className="mx-auto max-w-7xl px-6 lg:grid lg:grid-cols-[240px_1fr] lg:items-start lg:gap-10">
        {filters.length > 0 && (
          <aside className="hidden lg:block">
            <CollectionFilters filters={filters} />
          </aside>
        )}
        <div>
          {hasProducts ? (
            <PaginatedResourceSection<ProductItemFragment>
              connection={collection.products}
              resourcesClassName="collection-products-grid"
              loadOnScroll
            >
              {({node: product, index}) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  loading={index < 8 ? 'eager' : undefined}
                />
              )}
            </PaginatedResourceSection>
          ) : (
            <p className="py-12 text-center font-body text-sm text-black/70">
              Geen producten gevonden met deze filters.
            </p>
          )}
        </div>
      </div>

      {filters.length > 0 && (
        <Aside type="filters" heading="Filters">
          <CollectionFilters filters={filters} />
        </Aside>
      )}

      <CollectionModules modules={modules} />
      <Analytics.CollectionView
        data={{
          collection: {
            id: collection.id,
            handle: collection.handle,
          },
        }}
      />
    </div>
  );
}

const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment MoneyProductItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment ProductItem on Product {
    id
    handle
    title
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        ...MoneyProductItem
      }
      maxVariantPrice {
        ...MoneyProductItem
      }
    }
  }
` as const;

// NOTE: https://shopify.dev/docs/api/storefront/2022-04/objects/collection
const COLLECTION_QUERY = `#graphql
  ${PRODUCT_ITEM_FRAGMENT}
  query Collection(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
    $filters: [ProductFilter!]
    $sortKey: ProductCollectionSortKeys!
    $reverse: Boolean!
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      seo {
        title
        description
      }
      products(
        first: $first,
        last: $last,
        before: $startCursor,
        after: $endCursor,
        filters: $filters,
        sortKey: $sortKey,
        reverse: $reverse
      ) {
        filters {
          id
          label
          type
          values {
            id
            label
            count
            input
          }
        }
        nodes {
          ...ProductItem
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          endCursor
          startCursor
        }
      }
    }
  }
` as const;

const SANITY_COLLECTION_QUERY = `*[_type == "collection" && store.slug.current == $handle && !(_id in path("drafts.**"))][0]{
  "intro": coalesce(intro[language == $language][0].value, intro[language == "nl"][0].value)[]{
    ...,
    markDefs[]{
      ...,
      _type == "linkInternal" => {
        "docType": reference->_type,
        "slug": coalesce(reference->store.slug.current, reference->slug.current)
      },
      _type == "linkProduct" => {
        "slug": productWithVariant.product->store.slug.current
      }
    }
  },
  modules[]{
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
  },
  seo{
    "title": coalesce(title[language == $language][0].value, title[language == "nl"][0].value),
    "description": coalesce(description[language == $language][0].value, description[language == "nl"][0].value)
  }
}`;
