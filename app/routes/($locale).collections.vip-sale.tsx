import {data, redirect, useLoaderData} from 'react-router';
import type {Route} from './+types/($locale).collections.vip-sale';
import {getPaginationVariables, Analytics} from '@shopify/hydrogen';
import {PortableText, type PortableTextBlock} from '@portabletext/react';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';
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
  parseFiltersFromSearchParams,
} from '~/lib/collectionFilters';
import {redirectDocumentRequestAwayFromPaginationCursor} from '~/lib/pagination';
import {getSeoMeta, canonicalUrl, rootSeo} from '~/lib/seo';
import {CollectionModules} from '~/components/CollectionModules';
import {HeroBanner} from '~/components/HeroBanner';
import {VipSaleGate} from '~/components/VipSaleGate';
import {portableTextComponents} from '~/components/PortableTextComponents';
import type {ProductItemFragment} from 'storefrontapi.generated';
import {sanityImageConfig} from '~/lib/sanityImage';
import {getLocaleFromRequest, sanityLanguage} from '~/lib/i18n';
import {
  resolveContentModules,
  resolveHeroBanner,
  SANITY_MODULES_GROQ,
  type SanityContentModuleRaw,
  type SanityHeroRaw,
} from '~/lib/sanityModules';
import {
  isVipCustomer,
  SALE_COLLECTION_PATH,
  VIP_SALE_HANDLE,
  VIP_SALE_PATH,
} from '~/lib/vip';

export const meta: Route.MetaFunction = ({data: loaderData, matches, location}) => {
  const {origin, seo} = rootSeo(matches);
  const url = canonicalUrl(origin, location.pathname);

  const vipData = loaderData?.state === 'vip' ? loaderData : null;
  const title =
    vipData?.sanitySeo?.title ??
    vipData?.collection.seo?.title ??
    vipData?.collection.title ??
    'VIP Sale';
  const description =
    vipData?.sanitySeo?.description ??
    vipData?.collection.seo?.description ??
    vipData?.collection.description ??
    '';

  return getSeoMeta(seo, {
    title,
    description,
    url,
    robots: {noIndex: true},
  });
};

export async function loader({context, request}: Route.LoaderArgs) {
  const {customerAccount, storefront} = context;
  const {pathPrefix} = getLocaleFromRequest(request);

  // Not logged in → render an explainer with a login CTA (no redirect).
  const loggedIn = await customerAccount.isLoggedIn();
  if (!loggedIn) {
    const returnTo = `${pathPrefix}${VIP_SALE_PATH}`;
    const loginUrl = `${pathPrefix}/account/login?return_to=${encodeURIComponent(returnTo)}`;
    return data(
      {state: 'anonymous' as const, loginUrl},
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      },
    );
  }

  const vip = await isVipCustomer(customerAccount);
  if (!vip) {
    throw redirect(`${pathPrefix}${SALE_COLLECTION_PATH}`);
  }

  redirectDocumentRequestAwayFromPaginationCursor(request);

  const paginationVariables = getPaginationVariables(request, {
    pageBy: 8,
  });
  const {searchParams} = new URL(request.url);
  const filters = parseFiltersFromSearchParams(searchParams);
  const {sortKey, reverse} = getCollectionSortVariables(searchParams);

  const [{collection}, sanityCollection] = await Promise.all([
    storefront.query(VIP_SALE_COLLECTION_QUERY, {
      variables: {
        handle: VIP_SALE_HANDLE,
        filters,
        sortKey,
        reverse,
        ...paginationVariables,
      },
    }),
    context.sanity
      .fetch(SANITY_VIP_SALE_COLLECTION_QUERY, {
        handle: VIP_SALE_HANDLE,
        language: sanityLanguage(context.storefront.i18n.language),
      })
      .catch(() => null) as Promise<SanityCollectionPageRaw | null>,
  ]);

  if (!collection) {
    throw new Response(`Collection ${VIP_SALE_HANDLE} not found`, {
      status: 404,
    });
  }

  const config = sanityImageConfig(context.env);
  const modules = await resolveContentModules(
    context,
    sanityCollection?.modules ?? [],
    config,
  );
  const hero = sanityCollection?.showHero
    ? resolveHeroBanner(sanityCollection.hero ?? null, config)
    : null;

  return data(
    {
      state: 'vip' as const,
      collection,
      hero,
      sanityIntro: sanityCollection?.intro ?? null,
      modules,
      sanitySeo: sanityCollection?.seo ?? null,
    },
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    },
  );
}

type SanityCollectionPageRaw = {
  showHero?: boolean | null;
  hero?: SanityHeroRaw;
  intro?: PortableTextBlock[] | null;
  modules?: SanityContentModuleRaw[] | null;
  seo?: {title?: string | null; description?: string | null} | null;
};

export default function VipSaleCollection() {
  const loaderData = useLoaderData<typeof loader>();
  const {open} = useAside();

  if (loaderData.state === 'anonymous') {
    return <VipSaleGate loginUrl={loaderData.loginUrl} />;
  }

  const {collection, hero, sanityIntro, modules} = loaderData;

  const filters = (collection.products.filters ?? []) as CollectionFilter[];
  const hasProducts = collection.products.nodes.length > 0;

  const intro = sanityIntro?.length ? (
    <div className="collection-page__intro">
      <PortableText value={sanityIntro} components={portableTextComponents} />
    </div>
  ) : collection.description ? (
    <p className="collection-page__intro">{collection.description}</p>
  ) : null;

  const vipNote = (
    <div
      className={`collection-page__vip-note${
        intro ? '' : ' collection-page__vip-note--standalone'
      }`}
    >
      <span className="collection-page__vip-note-label">VIP-voordeel</span>
      <p className="collection-page__vip-note-text">
        Bovenop deze sale-prijzen krijg je extra korting op je hele bestelling,
        automatisch verrekend bij het afrekenen.
      </p>
    </div>
  );

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
          <header
            className={`collection-page__header${
              intro ? '' : ' collection-page__header--compact'
            }`}
          >
            {intro}
            {vipNote}
          </header>
        </>
      ) : (
        <header className="collection-page__header">
          <h1 className="collection-page__title">{collection.title}</h1>
          {intro}
          {vipNote}
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
  fragment MoneyVipSaleProductItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment VipSaleProductItem on Product {
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
        ...MoneyVipSaleProductItem
      }
      maxVariantPrice {
        ...MoneyVipSaleProductItem
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        ...MoneyVipSaleProductItem
      }
    }
  }
` as const;

const VIP_SALE_COLLECTION_QUERY = `#graphql
  ${PRODUCT_ITEM_FRAGMENT}
  query VipSaleCollection(
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
          ...VipSaleProductItem
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

const SANITY_VIP_SALE_COLLECTION_QUERY = `*[_type == "collection" && store.slug.current == $handle && !(_id in path("drafts.**"))][0]{
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
