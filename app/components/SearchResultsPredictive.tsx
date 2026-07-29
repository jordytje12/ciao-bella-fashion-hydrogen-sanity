import {
  Link,
  useFetcher,
  useRouteLoaderData,
  type Fetcher,
  type FetcherWithComponents,
} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import React, {useRef, useEffect} from 'react';
import {
  getEmptyPredictiveSearchResult,
  urlWithTrackingParams,
  type PredictiveSearchReturn,
} from '~/lib/search';
import {useAside} from './Aside';
import {useLocalePrefix} from '~/lib/i18n';
import {getUiTranslations} from '~/lib/translations';
import type {RootLoader} from '~/root';
import {
  SEARCH_ENDPOINT,
  PREDICTIVE_SEARCH_LIMIT,
} from './SearchFormPredictive';

type PredictiveSearchItems = PredictiveSearchReturn['result']['items'];

type UsePredictiveSearchReturn = {
  term: React.MutableRefObject<string>;
  total: number;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
  items: PredictiveSearchItems;
  fetcher: FetcherWithComponents<PredictiveSearchReturn>;
};

type SearchResultsPredictiveArgs = Pick<
  UsePredictiveSearchReturn,
  'term' | 'total' | 'inputRef' | 'items' | 'fetcher'
> & {
  state: Fetcher['state'];
  closeSearch: () => void;
};

type PartialPredictiveSearchResult<
  ItemType extends keyof PredictiveSearchItems,
  ExtraProps extends keyof SearchResultsPredictiveArgs = 'term' | 'closeSearch',
> = Pick<PredictiveSearchItems, ItemType> &
  Pick<SearchResultsPredictiveArgs, ExtraProps>;

type SearchResultsPredictiveProps = {
  children: (args: SearchResultsPredictiveArgs) => React.ReactNode;
};

/**
 * Component that renders predictive search results
 */
export function SearchResultsPredictive({
  children,
}: SearchResultsPredictiveProps) {
  const aside = useAside();
  const {term, inputRef, fetcher, total, items} = usePredictiveSearch();

  /*
   * Utility that resets the search input
   */
  function resetInput() {
    if (inputRef.current) {
      inputRef.current.blur();
      inputRef.current.value = '';
    }
  }

  /**
   * Utility that resets the search input and closes the search aside
   */
  function closeSearch() {
    resetInput();
    aside.close();
  }

  return children({
    items,
    closeSearch,
    fetcher,
    inputRef,
    state: fetcher.state,
    term,
    total,
  });
}

SearchResultsPredictive.Articles = SearchResultsPredictiveArticles;
SearchResultsPredictive.Collections = SearchResultsPredictiveCollections;
SearchResultsPredictive.Pages = SearchResultsPredictivePages;
SearchResultsPredictive.Products = SearchResultsPredictiveProducts;
SearchResultsPredictive.Queries = SearchResultsPredictiveQueries;
SearchResultsPredictive.Empty = SearchResultsPredictiveEmpty;

function SearchResultsPredictiveArticles({
  term,
  articles,
  closeSearch,
}: PartialPredictiveSearchResult<'articles'>) {
  const localePrefix = useLocalePrefix();
  const t = useUiTranslations();

  if (!articles.length) return null;

  return (
    <div className="predictive-search-result" key="articles">
      <h5 className="predictive-search__heading">{t.searchArticles}</h5>
      <ul className="predictive-search__list">
        {articles.slice(0, 4).map((article) => {
          const articleUrl = urlWithTrackingParams({
            baseUrl: `${localePrefix}/blogs/${article.blog.handle}/${article.handle}`,
            trackingParams: article.trackingParameters,
            term: term.current ?? '',
          });

          return (
            <li key={article.id}>
              <Link onClick={closeSearch} to={articleUrl}>
                {article.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SearchResultsPredictiveCollections({
  term,
  collections,
  closeSearch,
}: PartialPredictiveSearchResult<'collections'>) {
  const localePrefix = useLocalePrefix();
  const t = useUiTranslations();

  if (!collections.length) return null;

  return (
    <div className="predictive-search-result" key="collections">
      <h5 className="predictive-search__heading">{t.searchCollections}</h5>
      <ul className="predictive-search__list">
        {collections.slice(0, 4).map((collection) => {
          const collectionUrl = urlWithTrackingParams({
            baseUrl: `${localePrefix}/collections/${collection.handle}`,
            trackingParams: collection.trackingParameters,
            term: term.current,
          });

          return (
            <li key={collection.id}>
              <Link onClick={closeSearch} to={collectionUrl}>
                {collection.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SearchResultsPredictivePages({
  term,
  pages,
  closeSearch,
}: PartialPredictiveSearchResult<'pages'>) {
  const localePrefix = useLocalePrefix();
  const t = useUiTranslations();

  if (!pages.length) return null;

  return (
    <div className="predictive-search-result" key="pages">
      <h5 className="predictive-search__heading">{t.searchPages}</h5>
      <ul className="predictive-search__list">
        {pages.slice(0, 4).map((page) => {
          const pageUrl = urlWithTrackingParams({
            baseUrl: `${localePrefix}/pages/${page.handle}`,
            trackingParams: page.trackingParameters,
            term: term.current,
          });

          return (
            <li key={page.id}>
              <Link onClick={closeSearch} to={pageUrl}>
                {page.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SearchResultsPredictiveProducts({
  term,
  products,
  closeSearch,
}: PartialPredictiveSearchResult<'products'>) {
  const localePrefix = useLocalePrefix();
  const t = useUiTranslations();

  if (!products.length) return null;

  return (
    <div className="predictive-search-result" key="products">
      <h5 className="predictive-search__heading">{t.searchProducts}</h5>
      <div className="predictive-search__grid">
        {products.map((product) => {
          const productUrl = urlWithTrackingParams({
            baseUrl: `${localePrefix}/products/${product.handle}`,
            trackingParams: product.trackingParameters,
            term: term.current ?? '',
          });

          const variant = product?.selectedOrFirstAvailableVariant;
          const image = product?.featuredImage ?? variant?.image;
          const price = variant?.price;
          const compareAtPrice = variant?.compareAtPrice;

          return (
            <Link
              className="predictive-search__product"
              key={product.id}
              onClick={closeSearch}
              to={productUrl}
            >
              <div className="predictive-search__product-image">
                {image && (
                  <Image
                    alt={image.altText ?? ''}
                    src={image.url}
                    width={180}
                    height={225}
                    sizes="180px"
                  />
                )}
              </div>
              <p className="predictive-search__product-title">
                {product.title}
              </p>
              <small className="predictive-search__product-price">
                {price && <Money data={price} />}
                {compareAtPrice && (
                  <s className="predictive-search__product-compare-price">
                    <Money data={compareAtPrice} />
                  </s>
                )}
              </small>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function SearchResultsPredictiveQueries({
  queries,
  inputRef,
  fetcher,
}: PartialPredictiveSearchResult<'queries', 'inputRef' | 'fetcher'>) {
  if (!queries.length) return null;

  function selectSuggestion(suggestion: string) {
    if (inputRef.current) {
      inputRef.current.value = suggestion;
      inputRef.current.focus();
    }
    void fetcher.submit(
      {q: suggestion, limit: PREDICTIVE_SEARCH_LIMIT, predictive: true},
      {method: 'GET', action: SEARCH_ENDPOINT},
    );
  }

  return (
    <div className="predictive-search__suggestions">
      {queries.map((suggestion) => {
        if (!suggestion) return null;

        return (
          <button
            className="predictive-search__suggestion"
            key={suggestion.text}
            onClick={() => selectSuggestion(suggestion.text)}
            type="button"
          >
            {suggestion.text}
          </button>
        );
      })}
    </div>
  );
}

function SearchResultsPredictiveEmpty({
  term,
}: {
  term: React.MutableRefObject<string>;
}) {
  const t = useUiTranslations();

  return (
    <p className="predictive-search__empty">
      {term.current ? (
        <>
          {t.searchNoResults} <q>{term.current}</q>
        </>
      ) : (
        t.searchEmptyPrompt
      )}
    </p>
  );
}

/**
 * Hook that returns the UI translations for the current storefront language.
 */
function useUiTranslations() {
  const rootData = useRouteLoaderData<RootLoader>('root');
  return getUiTranslations(rootData?.consent.language);
}

/**
 * Hook that returns the predictive search results and fetcher and input ref.
 * @example
 * '''ts
 * const { items, total, inputRef, term, fetcher } = usePredictiveSearch();
 * '''
 **/
function usePredictiveSearch(): UsePredictiveSearchReturn {
  const fetcher = useFetcher<PredictiveSearchReturn>({key: 'search'});
  const term = useRef<string>('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  if (fetcher?.state === 'loading') {
    term.current = String(fetcher.formData?.get('q') || '');
  }

  // capture the search input element as a ref
  useEffect(() => {
    if (!inputRef.current) {
      inputRef.current = document.querySelector('input[type="search"]');
    }
  }, []);

  const {items, total} =
    fetcher?.data?.result ?? getEmptyPredictiveSearchResult();

  return {items, total, inputRef, term, fetcher};
}
