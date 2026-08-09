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
import {redirectDocumentRequestAwayFromPaginationCursor} from '~/lib/pagination';
import {getSeoMeta, breadcrumbJsonLd, canonicalUrl, rootSeo} from '~/lib/seo';
import {CollectionModules} from '~/components/CollectionModules';
import {HeroBanner} from '~/components/HeroBanner';
import {portableTextComponents} from '~/components/PortableTextComponents';
import type {ProductItemFragment} from 'storefrontapi.generated';
import {sanityImageConfig} from '~/lib/sanityImage';
import {sanityLanguage} from '~/lib/i18n';
import {
  resolveContentModules,
  resolveHeroBanner,
  SANITY_MODULES_GROQ,
  type SanityContentModuleRaw,
  type SanityHeroRaw,
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
  redirectDocumentRequestAwayFromPaginationCursor(request);

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

  const config = sanityImageConfig(context.env);
  const modules = await resolveContentModules(
    context,
    sanityCollection?.modules ?? [],
    config,
  );
  const hero = sanityCollection?.showHero
    ? resolveHeroBanner(sanityCollection.hero ?? null, config)
    : null;

  return {
    collection,
    hero,
    sanityIntro: sanityCollection?.intro ?? null,
    modules,
    sanitySeo: sanityCollection?.seo ?? null,
  };
}

type SanityCollectionPageRaw = {
  showHero?: boolean | null;
  hero?: SanityHeroRaw;
  intro?: PortableTextBlock[] | null;
  modules?: SanityContentModuleRaw[] | null;
  seo?: {title?: string | null; description?: string | null} | null;
};

export default function Collection() {
  const {collection, hero, sanityIntro, modules} =
    useLoaderData<typeof loader>();
  const {open} = useAside();

  const filters = (collection.products.filters ?? []) as CollectionFilter[];
  const hasProducts = collection.products.nodes.length > 0;

  const intro = sanityIntro?.length ? (
    <div className="collection-page__intro">
      <PortableText value={sanityIntro} components={portableTextComponents} />
    </div>
  ) : collection.description ? (
    <p className="collection-page__intro">{collection.description}</p>
  ) : null;

  return (
    <div className="collection-page">
      {hero ? (
        <>
          <div className="collection-page__hero">
            <HeroBanner
              imageUrl={hero.desktopImage.src}
              imageSrcSet={hero.desktopImage.srcSet}
              mobileImageUrl={hero.mobileImage?.src ?? hero.desktopImage.src}
              mobileImageSrcSet={hero.mobileImage?.srcSet}
              title={hero.title}
              description={hero.description ?? undefined}
              link={
                hero.buttonText && hero.linkUrl
                  ? {text: hero.buttonText, url: hero.linkUrl}
                  : null
              }
              headingLevel="h1"
              minHeightClassName="min-h-[280px] lg:min-h-[360px]"
              markAsHero
            />
          </div>
          {intro ? (
            <header className="collection-page__header">{intro}</header>
          ) : null}
        </>
      ) : (
        <header className="collection-page__header">
          <h1 className="collection-page__title">{collection.title}</h1>
          {intro}
        </header>
      )}

      {filters.length > 0 && (
        <div className="flex flex-col gap-3 px-5 pb-4 md:px-12.5">
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

      <div
        className={`px-5 md:px-12.5 ${
          filters.length > 0
            ? 'lg:grid lg:grid-cols-[240px_1fr] lg:items-start lg:gap-10'
            : ''
        }`}
      >
        {filters.length > 0 && (
          <aside className="hidden lg:block">
            <CollectionFilters filters={filters} />
          </aside>
        )}
        <div className="collection-page__products">
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
    compareAtPriceRange {
      minVariantPrice {
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
  showHero,
  hero{
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
  ${SANITY_MODULES_GROQ},
  seo{
    "title": coalesce(title[language == $language][0].value, title[language == "nl"][0].value),
    "description": coalesce(description[language == $language][0].value, description[language == "nl"][0].value)
  }
}`;
