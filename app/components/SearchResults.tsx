import {Link, useRouteLoaderData} from 'react-router';
import {useLocalePrefix} from '~/lib/i18n';
import {getUiTranslations} from '~/lib/translations';
import type {RootLoader} from '~/root';
import {urlWithTrackingParams, type RegularSearchReturn} from '~/lib/search';

type SearchItems = RegularSearchReturn['result']['items'];
type PartialSearchResult<ItemType extends keyof SearchItems> = Pick<
  SearchItems,
  ItemType
> &
  Pick<RegularSearchReturn, 'term'>;

type SearchResultsProps = RegularSearchReturn & {
  children: (args: SearchItems & {term: string}) => React.ReactNode;
};

export function SearchResults({
  term,
  result,
  children,
}: Omit<SearchResultsProps, 'error' | 'type'>) {
  if (!result?.total) {
    return null;
  }

  return children({...result.items, term});
}

SearchResults.Articles = SearchResultsArticles;
SearchResults.Collections = SearchResultsCollections;
SearchResults.Pages = SearchResultsPages;
SearchResults.Empty = SearchResultsEmpty;

function SearchResultsCollections({
  term,
  collections,
}: PartialSearchResult<'collections'>) {
  const localePrefix = useLocalePrefix();
  const rootData = useRouteLoaderData<RootLoader>('root');
  const t = getUiTranslations(rootData?.consent.language);

  if (!collections?.length) {
    return null;
  }

  return (
    <div className="search-page__section">
      <h2 className="search-page__section-heading">{t.searchCollections}</h2>
      <ul className="search-page__section-list">
        {collections.slice(0, 6).map((collection) => {
          const collectionUrl = urlWithTrackingParams({
            baseUrl: `${localePrefix}/collections/${collection.handle}`,
            trackingParams: collection.trackingParameters,
            term,
          });

          return (
            <li key={collection.id}>
              <Link prefetch="intent" to={collectionUrl}>
                {collection.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SearchResultsArticles({
  term,
  articles,
}: PartialSearchResult<'articles'>) {
  const localePrefix = useLocalePrefix();
  const rootData = useRouteLoaderData<RootLoader>('root');
  const t = getUiTranslations(rootData?.consent.language);

  if (!articles?.nodes.length) {
    return null;
  }

  return (
    <div className="search-page__section">
      <h2 className="search-page__section-heading">{t.searchArticles}</h2>
      <ul className="search-page__section-list">
        {articles.nodes.map((article) => {
          const articleUrl = urlWithTrackingParams({
            baseUrl: `${localePrefix}/blogs/${article.blog.handle}/${article.handle}`,
            trackingParams: article.trackingParameters,
            term,
          });

          return (
            <li key={article.id}>
              <Link prefetch="intent" to={articleUrl}>
                {article.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SearchResultsPages({term, pages}: PartialSearchResult<'pages'>) {
  const localePrefix = useLocalePrefix();
  const rootData = useRouteLoaderData<RootLoader>('root');
  const t = getUiTranslations(rootData?.consent.language);

  if (!pages?.nodes.length) {
    return null;
  }

  return (
    <div className="search-page__section">
      <h2 className="search-page__section-heading">{t.searchPages}</h2>
      <ul className="search-page__section-list">
        {pages.nodes.map((page) => {
          const pageUrl = urlWithTrackingParams({
            baseUrl: `${localePrefix}/pages/${page.handle}`,
            trackingParams: page.trackingParameters,
            term,
          });

          return (
            <li key={page.id}>
              <Link prefetch="intent" to={pageUrl}>
                {page.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SearchResultsEmpty({term}: {term: string}) {
  const localePrefix = useLocalePrefix();
  const rootData = useRouteLoaderData<RootLoader>('root');
  const t = getUiTranslations(rootData?.consent.language);

  return (
    <div className="search-page__empty">
      <p className="search-page__empty-text">
        {term ? (
          <>
            {t.searchNoResults} <q>{term}</q>
          </>
        ) : (
          t.searchEmptyPrompt
        )}
      </p>
      {term ? (
        <p className="search-page__empty-hint">{t.searchNoResultsHint}</p>
      ) : null}
      <Link className="search-page__empty-link" to={`${localePrefix}/collections`}>
        {t.notFoundShop}
      </Link>
    </div>
  );
}
