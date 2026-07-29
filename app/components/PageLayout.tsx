import {Await, Link, useRouteLoaderData} from 'react-router';
import {Suspense} from 'react';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {Aside} from '~/components/Aside';
import {Footer, type FooterData} from '~/components/Footer';
import {Header} from '~/components/Header';
import {MobileMenu} from '~/components/MobileMenu';
import {MarketSelector} from '~/components/LocaleSelector';
import {useLocalePrefix} from '~/lib/i18n';
import {getUiTranslations} from '~/lib/translations';
import type {HeaderMenuData} from '~/lib/headerMenu';
import type {RootLoader} from '~/root';
import {CartMain} from '~/components/CartMain';
import {
  SEARCH_ENDPOINT,
  SearchFormPredictive,
} from '~/components/SearchFormPredictive';
import {SocialLinks, type SocialLink} from '~/components/SocialLinks';
import {SearchResultsPredictive} from '~/components/SearchResultsPredictive';
import {Topbar, type TopbarUsp} from '~/components/Topbar';

const SKELETON_KEYS = ['a', 'b', 'c', 'd'];

interface PageLayoutProps {
  cart: Promise<CartApiQueryFragment | null>;
  footer?: FooterData | null;
  headerMenu: HeaderMenuData;
  isLoggedIn: Promise<boolean>;
  topbarUsps?: TopbarUsp[];
  children?: React.ReactNode;
}

export function PageLayout({
  cart,
  children = null,
  footer,
  headerMenu,
  isLoggedIn,
  topbarUsps,
}: PageLayoutProps) {
  return (
    <Aside.Provider>
      <CartAside cart={cart} />
      <SearchAside />
      <MobileMenuAside menu={headerMenu} socialLinks={footer?.socialLinks} />
      <Topbar items={topbarUsps} />
      <Header menu={headerMenu} cart={cart} isLoggedIn={isLoggedIn} />
      <main>{children}</main>
      <Footer footer={footer ?? null} />
    </Aside.Provider>
  );
}

function CartAside({cart}: {cart: PageLayoutProps['cart']}) {
  return (
    <Aside type="cart" heading="Winkelwagen">
      <Suspense fallback={<p className="cart-loading">Winkelwagen laden…</p>}>
        <Await resolve={cart}>
          {(cart) => {
            return <CartMain cart={cart} layout="aside" />;
          }}
        </Await>
      </Suspense>
    </Aside>
  );
}

function SearchAside() {
  const rootData = useRouteLoaderData<RootLoader>('root');
  const t = getUiTranslations(rootData?.consent.language);
  const localePrefix = useLocalePrefix();

  return (
    <Aside type="search" heading={t.searchTitle}>
      <div className="predictive-search">
        <SearchFormPredictive>
          {({fetchResults, goToSearch, inputRef}) => (
            <div className="predictive-search__field">
              <SearchFieldIcon />
              <input
                name="q"
                onChange={fetchResults}
                onFocus={fetchResults}
                placeholder={t.searchPlaceholder}
                ref={inputRef}
                type="search"
              />
              <button
                className="predictive-search__submit reset"
                onClick={goToSearch}
                type="button"
              >
                {t.searchSubmit}
              </button>
            </div>
          )}
        </SearchFormPredictive>

        <div className="predictive-search__body">
          <SearchResultsPredictive>
            {({items, total, term, state, closeSearch, inputRef, fetcher}) => {
              const {articles, collections, pages, products, queries} = items;

              if (state === 'loading' && term.current) {
                return (
                  <div className="predictive-search__grid" aria-hidden="true">
                    {SKELETON_KEYS.map((key) => (
                      <div className="predictive-search__skeleton" key={key} />
                    ))}
                  </div>
                );
              }

              if (!total) {
                return <SearchResultsPredictive.Empty term={term} />;
              }

              return (
                <>
                  <SearchResultsPredictive.Queries
                    queries={queries}
                    inputRef={inputRef}
                    fetcher={fetcher}
                  />
                  <SearchResultsPredictive.Products
                    products={products}
                    closeSearch={closeSearch}
                    term={term}
                  />
                  <SearchResultsPredictive.Collections
                    collections={collections}
                    closeSearch={closeSearch}
                    term={term}
                  />
                  <SearchResultsPredictive.Pages
                    pages={pages}
                    closeSearch={closeSearch}
                    term={term}
                  />
                  <SearchResultsPredictive.Articles
                    articles={articles}
                    closeSearch={closeSearch}
                    term={term}
                  />
                  {term.current && total ? (
                    <Link
                      className="predictive-search__view-all"
                      onClick={closeSearch}
                      to={`${localePrefix}${SEARCH_ENDPOINT}?q=${encodeURIComponent(term.current)}`}
                    >
                      {t.searchViewAll}
                    </Link>
                  ) : null}
                </>
              );
            }}
          </SearchResultsPredictive>
        </div>
      </div>
    </Aside>
  );
}

function SearchFieldIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="predictive-search__field-icon"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="22" y2="22" />
    </svg>
  );
}

function MobileMenuAside({
  menu,
  socialLinks,
}: {
  menu: HeaderMenuData;
  socialLinks?: SocialLink[] | null;
}) {
  return (
    <Aside type="mobile" heading="Menu">
      <MobileMenu menu={menu} />
      <div className="mobile-market">
        <MarketSelector />
        <SocialLinks links={socialLinks} />
      </div>
    </Aside>
  );
}
