import {useLoaderData, useRouteLoaderData} from 'react-router';
import type {Route} from './+types/($locale).search';
import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
import {getSeoMeta, rootSeo} from '~/lib/seo';
import {SearchForm} from '~/components/SearchForm';
import {SearchResults} from '~/components/SearchResults';
import {ProductCard} from '~/components/ProductCard';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
import {getUiTranslations} from '~/lib/translations';
import type {RootLoader} from '~/root';
import {
  type RegularSearchReturn,
  type PredictiveSearchReturn,
  getEmptyPredictiveSearchResult,
} from '~/lib/search';
import type {
  RegularSearchQuery,
  PredictiveSearchQuery,
  ProductItemFragment,
} from 'storefrontapi.generated';

export const meta: Route.MetaFunction = ({matches, data}) => {
  const {seo} = rootSeo(matches);
  const term = data?.term;
  return getSeoMeta(seo, {
    title: term ? `${term} – Zoeken` : 'Zoeken',
    robots: {noIndex: true},
  });
};

export async function loader({request, context}: Route.LoaderArgs) {
  const url = new URL(request.url);
  const isPredictive = url.searchParams.has('predictive');
  const searchPromise: Promise<PredictiveSearchReturn | RegularSearchReturn> =
    isPredictive
      ? predictiveSearch({request, context})
      : regularSearch({request, context});

  searchPromise.catch((error: Error) => {
    console.error(error);
    return {term: '', result: null, error: error.message};
  });

  return await searchPromise;
}

/**
 * Renders the /search route
 */
export default function SearchPage() {
  const {type, term, result, error} = useLoaderData<typeof loader>();
  const rootData = useRouteLoaderData<RootLoader>('root');
  const t = getUiTranslations(rootData?.consent.language);

  if (type === 'predictive') return null;

  const hasProducts = Boolean(result?.items.products?.nodes.length);

  return (
    <div className="search-page">
      <header className="search-page__header">
        <h1 className="search-page__title">
          {term ? `${t.searchResultsFor} “${term}”` : t.searchTitle}
        </h1>
        {term ? (
          <p className="search-page__count">
            {result?.total ?? 0} {t.searchProducts.toLowerCase()}
          </p>
        ) : null}
        <SearchForm className="search-page__form">
          {({inputRef}) => (
            <div className="search-page__field">
              <input
                defaultValue={term}
                name="q"
                placeholder={t.searchPlaceholder}
                ref={inputRef}
                type="search"
              />
              <button type="submit">{t.searchSubmit}</button>
            </div>
          )}
        </SearchForm>
      </header>

      {error && <p className="search-page__error">{error}</p>}

      {!term || !result?.total ? (
        <SearchResults.Empty term={term} />
      ) : (
        <SearchResults result={result} term={term}>
          {({articles, pages, products, collections, term}) => (
            <>
              {hasProducts && (
                <div className="search-page__products">
                  <PaginatedResourceSection<ProductItemFragment>
                    connection={products}
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
                </div>
              )}
              <SearchResults.Collections
                collections={collections}
                term={term}
              />
              <SearchResults.Pages pages={pages} term={term} />
              <SearchResults.Articles articles={articles} term={term} />
            </>
          )}
        </SearchResults>
      )}
      <Analytics.SearchView data={{searchTerm: term, searchResults: result}} />
    </div>
  );
}

/**
 * Regular search query and fragments
 * (adjust as needed)
 */
const SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment SearchProduct on Product {
    __typename
    handle
    id
    title
    trackingParameters
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
  }
` as const;

const SEARCH_PAGE_FRAGMENT = `#graphql
  fragment SearchPage on Page {
     __typename
     handle
    id
    title
    trackingParameters
  }
` as const;

const SEARCH_ARTICLE_FRAGMENT = `#graphql
  fragment SearchArticle on Article {
    __typename
    handle
    id
    title
    trackingParameters
    blog {
      handle
    }
  }
` as const;

const PAGE_INFO_FRAGMENT = `#graphql
  fragment PageInfoFragment on PageInfo {
    hasNextPage
    hasPreviousPage
    startCursor
    endCursor
  }
` as const;

// NOTE: https://shopify.dev/docs/api/storefront/latest/queries/search
export const SEARCH_QUERY = `#graphql
  query RegularSearch(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $term: String!
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    articles: search(
      query: $term,
      types: [ARTICLE],
      first: $first,
    ) {
      nodes {
        ...on Article {
          ...SearchArticle
        }
      }
    }
    pages: search(
      query: $term,
      types: [PAGE],
      first: $first,
    ) {
      nodes {
        ...on Page {
          ...SearchPage
        }
      }
    }
    products: search(
      after: $endCursor,
      before: $startCursor,
      first: $first,
      last: $last,
      query: $term,
      sortKey: RELEVANCE,
      types: [PRODUCT],
      unavailableProducts: HIDE,
    ) {
      nodes {
        ...on Product {
          ...SearchProduct
        }
      }
      pageInfo {
        ...PageInfoFragment
      }
    }
  }
  ${SEARCH_PRODUCT_FRAGMENT}
  ${SEARCH_PAGE_FRAGMENT}
  ${SEARCH_ARTICLE_FRAGMENT}
  ${PAGE_INFO_FRAGMENT}
` as const;

/**
 * Regular search fetcher
 */
async function regularSearch({
  request,
  context,
}: Pick<
  Route.LoaderArgs,
  'request' | 'context'
>): Promise<RegularSearchReturn> {
  const {storefront} = context;
  const url = new URL(request.url);
  const variables = getPaginationVariables(request, {pageBy: 8});
  const term = String(url.searchParams.get('q') || '');

  // Search articles, pages, and products for the `q` term. Collections are
  // fetched separately: the `search` query has no COLLECTION type, only
  // `predictiveSearch` does.
  const [searchData, collectionsData] = await Promise.all([
    storefront.query(SEARCH_QUERY, {
      variables: {...variables, term},
    }) as Promise<{errors?: Array<{message: string}>} & RegularSearchQuery>,
    term
      ? (storefront.query(SEARCH_COLLECTIONS_QUERY, {
          variables: {term, limit: 6},
        }) as Promise<PredictiveSearchQuery>)
      : Promise.resolve(null),
  ]);

  const {errors, ...items} = searchData;

  if (!items) {
    throw new Error('No search data returned from Shopify API');
  }

  const collections = collectionsData?.predictiveSearch?.collections ?? [];
  const allItems = {...items, collections};

  const total =
    Object.entries(allItems).reduce((acc: number, [key, value]) => {
      if (key === 'collections') return acc + (value as Array<unknown>).length;
      return acc + (value as {nodes: Array<unknown>}).nodes.length;
    }, 0);

  const error = errors
    ? errors.map(({message}: {message: string}) => message).join(', ')
    : undefined;

  return {type: 'regular', term, error, result: {total, items: allItems}};
}

/**
 * Predictive search query and fragments
 * (adjust as needed)
 */
const PREDICTIVE_SEARCH_ARTICLE_FRAGMENT = `#graphql
  fragment PredictiveArticle on Article {
    __typename
    id
    title
    handle
    blog {
      handle
    }
    image {
      url
      altText
      width
      height
    }
    trackingParameters
  }
` as const;

const PREDICTIVE_SEARCH_COLLECTION_FRAGMENT = `#graphql
  fragment PredictiveCollection on Collection {
    __typename
    id
    title
    handle
    image {
      url
      altText
      width
      height
    }
    trackingParameters
  }
` as const;

// Used by regularSearch() to fetch collections for the /search page, since
// the regular `search` query has no COLLECTION type.
const SEARCH_COLLECTIONS_QUERY = `#graphql
  query SearchCollections(
    $country: CountryCode
    $language: LanguageCode
    $limit: Int!
    $term: String!
  ) @inContext(country: $country, language: $language) {
    predictiveSearch(
      limit: $limit,
      limitScope: EACH,
      query: $term,
      types: [COLLECTION],
    ) {
      collections {
        ...PredictiveCollection
      }
    }
  }
  ${PREDICTIVE_SEARCH_COLLECTION_FRAGMENT}
` as const;

const PREDICTIVE_SEARCH_PAGE_FRAGMENT = `#graphql
  fragment PredictivePage on Page {
    __typename
    id
    title
    handle
    trackingParameters
  }
` as const;

const PREDICTIVE_SEARCH_PRODUCT_FRAGMENT = `#graphql
  fragment PredictiveProduct on Product {
    __typename
    id
    title
    handle
    trackingParameters
    featuredImage {
      url
      altText
      width
      height
    }
    selectedOrFirstAvailableVariant(
      selectedOptions: []
      ignoreUnknownOptions: true
      caseInsensitiveMatch: true
    ) {
      id
      image {
        url
        altText
        width
        height
      }
      price {
        amount
        currencyCode
      }
      compareAtPrice {
        amount
        currencyCode
      }
    }
  }
` as const;

const PREDICTIVE_SEARCH_QUERY_FRAGMENT = `#graphql
  fragment PredictiveQuery on SearchQuerySuggestion {
    __typename
    text
    styledText
    trackingParameters
  }
` as const;

// NOTE: https://shopify.dev/docs/api/storefront/latest/queries/predictiveSearch
const PREDICTIVE_SEARCH_QUERY = `#graphql
  query PredictiveSearch(
    $country: CountryCode
    $language: LanguageCode
    $limit: Int!
    $limitScope: PredictiveSearchLimitScope!
    $term: String!
    $types: [PredictiveSearchType!]
  ) @inContext(country: $country, language: $language) {
    predictiveSearch(
      limit: $limit,
      limitScope: $limitScope,
      query: $term,
      types: $types,
    ) {
      articles {
        ...PredictiveArticle
      }
      collections {
        ...PredictiveCollection
      }
      pages {
        ...PredictivePage
      }
      products {
        ...PredictiveProduct
      }
      queries {
        ...PredictiveQuery
      }
    }
  }
  ${PREDICTIVE_SEARCH_ARTICLE_FRAGMENT}
  ${PREDICTIVE_SEARCH_COLLECTION_FRAGMENT}
  ${PREDICTIVE_SEARCH_PAGE_FRAGMENT}
  ${PREDICTIVE_SEARCH_PRODUCT_FRAGMENT}
  ${PREDICTIVE_SEARCH_QUERY_FRAGMENT}
` as const;

/**
 * Predictive search fetcher
 */
async function predictiveSearch({
  request,
  context,
}: Pick<
  Route.ActionArgs,
  'request' | 'context'
>): Promise<PredictiveSearchReturn> {
  const {storefront} = context;
  const url = new URL(request.url);
  const term = String(url.searchParams.get('q') || '').trim();
  const limit = Number(url.searchParams.get('limit') || 10);
  const type = 'predictive';

  if (!term) return {type, term, result: getEmptyPredictiveSearchResult()};

  // Predictively search articles, collections, pages, products, and queries (suggestions)
  const {
    predictiveSearch: items,
    errors,
  }: PredictiveSearchQuery & {errors?: Array<{message: string}>} =
    await storefront.query(PREDICTIVE_SEARCH_QUERY, {
      variables: {
        // customize search options as needed
        limit,
        limitScope: 'EACH',
        term,
      },
    });

  if (errors) {
    throw new Error(
      `Shopify API errors: ${errors.map(({message}: {message: string}) => message).join(', ')}`,
    );
  }

  if (!items) {
    throw new Error('No predictive search data returned from Shopify API');
  }

  const total = Object.values(items).reduce(
    (acc: number, item: Array<unknown>) => acc + item.length,
    0,
  );

  return {type, term, result: {items, total}};
}
