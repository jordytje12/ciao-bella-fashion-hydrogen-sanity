import {useLoaderData, Link} from 'react-router';
import type {Route} from './+types/_index';
import {Image} from '@shopify/hydrogen';
import type {CurrencyCode} from '@shopify/hydrogen/storefront-api-types';
import type {
  FeaturedCollectionFragment,
  HomepageCollectionGridQuery,
} from 'storefrontapi.generated';

// Local type until `npm run codegen` generates HomepageFeaturedProductsQuery
type HomepageFeaturedProductsQuery = {
  products: Array<{
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
  } | null>;
};
import {MockShopNotice} from '~/components/MockShopNotice';
import {HeroBanner} from '~/components/HeroBanner';
import {
  CollectionGrid,
  type CollectionGridItem,
} from '~/components/CollectionGrid';
import {
  FeaturedProducts,
  type FeaturedProductItem,
} from '~/components/FeaturedProducts';
import {urlFor} from '~/lib/sanityImage';
import {sanityLanguage} from '~/lib/i18n';

export const meta: Route.MetaFunction = () => {
  return [{title: 'Hydrogen | Home'}];
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
async function loadCriticalData({context}: Route.LoaderArgs) {
  const [{collections}, sanityHome] = await Promise.all([
    context.storefront.query(FEATURED_COLLECTION_QUERY),
    // Add other queries here, so that they are loaded in parallel
    context.sanity.fetch(HOME_PAGE_QUERY, {
      language: sanityLanguage(context.storefront.i18n.language),
    }),
  ]);

  const collectionGrid = await loadCollectionGrid(
    context,
    sanityHome?.collectionGrid?.cards ?? [],
  );

  const featuredProducts = await loadFeaturedProducts(
    context,
    sanityHome?.featuredProducts?.products ?? [],
  );

  return {
    isShopLinked: Boolean(context.env.PUBLIC_STORE_DOMAIN),
    collectionGrid,
    featuredProducts,
    featuredHeading: (sanityHome?.featuredProducts?.heading as string) ?? '',
    featuredViewAllLabel: (sanityHome?.featuredProducts?.viewAllLabel as string) ?? '',
    featuredViewAllUrl: (sanityHome?.featuredProducts?.viewAllUrl as string) ?? '',
    featuredCollection: collections.nodes[0],
    sanityHome,
  };
}

async function loadCollectionGrid(
  context: Route.LoaderArgs['context'],
  selections: SanityCollectionGridSelection[],
): Promise<CollectionGridItem[]> {
  const collectionIds = uniqueStrings(
    selections.map((selection) => selection.collectionId),
  );

  if (collectionIds.length === 0) return [];

  const response = (await context.storefront.query(
    HOMEPAGE_COLLECTION_GRID_QUERY,
    {
      variables: {
        collectionIds,
      },
    },
  )) as HomepageCollectionGridQuery;

  const collectionsById = new Map(
    (response.collections ?? [])
      .filter(isShopifyCollectionNode)
      .map((collection) => [collection.id, collection]),
  );

  return selections
    .map((selection) =>
      resolveCollectionGridItem(selection, collectionsById),
    )
    .filter((collection): collection is CollectionGridItem =>
      Boolean(collection),
    );
}

async function loadFeaturedProducts(
  context: Route.LoaderArgs['context'],
  selections: SanityFeaturedProductSelection[],
): Promise<FeaturedProductItem[]> {
  const productIds = uniqueStrings(
    selections.map((selection) => selection.productId),
  );

  if (productIds.length === 0) return [];

  const response = (await context.storefront.query(
    HOMEPAGE_FEATURED_PRODUCTS_QUERY,
    {
      variables: {
        productIds,
      },
    },
  )) as HomepageFeaturedProductsQuery;

  const productsById = new Map(
    (response.products ?? [])
      .filter(isShopifyProductNode)
      .map((product) => [product.id, product]),
  );

  // Preserve Sanity ordering
  return selections
    .map((selection) => resolveFeaturedProductItem(selection, productsById))
    .filter((p): p is FeaturedProductItem => Boolean(p));
}

function resolveLinkUrl(link: {_type: string; url?: string; reference?: {_type: string; slug?: string}} | undefined): string {
  if (!link) return '/';
  if (link._type === 'linkExternal') return link.url ?? '/';
  const ref = link.reference;
  if (!ref?.slug) return '/';
  if (ref._type === 'collection') return `/collections/${ref.slug}`;
  if (ref._type === 'product') return `/products/${ref.slug}`;
  if (ref._type === 'page') return `/pages/${ref.slug}`;
  return '/';
}

export default function Homepage() {
  const data = useLoaderData<typeof loader>();

  const hero = data.sanityHome?.hero;
  const desktopData = hero?.imageDesktop;
  const mobileData = hero?.imageMobile;
  const desktopImage = desktopData ? urlFor(desktopData).auto('format').fit('crop').url() : null;
  const mobileImage = mobileData ? urlFor(mobileData).auto('format').fit('crop').url() : null;
  const heroLinkUrl = resolveLinkUrl(hero?.link?.[0]);

  const promo = data.sanityHome?.promoBanner;
  const promoDesktopData = promo?.imageDesktop;
  const promoMobileData = promo?.imageMobile;
  const promoDesktopImage = promoDesktopData ? urlFor(promoDesktopData).auto('format').fit('crop').url() : null;
  const promoMobileImage = promoMobileData ? urlFor(promoMobileData).auto('format').fit('crop').url() : null;
  const promoLinkUrl = resolveLinkUrl(promo?.link?.[0]);

  return (
    <div className="home">
      {data.isShopLinked ? null : <MockShopNotice />}
      {hero && desktopImage ? (
        <HeroBanner
          imageUrl={desktopImage}
          mobileImageUrl={mobileImage ?? desktopImage}
          title={hero.title}
          description={hero.description}
          link={{text: hero.button_text ?? 'Shop now', url: heroLinkUrl}}
        />
      ) : (
        <FeaturedCollection collection={data.featuredCollection} />
      )}
      <CollectionGrid collections={data.collectionGrid} />
      <FeaturedProducts
        heading={data.featuredHeading}
        products={data.featuredProducts}
        viewAllLabel={data.featuredViewAllLabel}
        viewAllUrl={data.featuredViewAllUrl}
      />
      {promo && promoDesktopImage ? (
        <HeroBanner
          imageUrl={promoDesktopImage}
          mobileImageUrl={promoMobileImage ?? promoDesktopImage}
          title={promo.title}
          description={promo.description}
          link={{text: promo.button_text ?? 'Shop now', url: promoLinkUrl}}
          buttonVariant="filled"
          minHeightClassName="min-h-[500px] lg:min-h-[640px]"
          headingLevel="h2"
          markAsHero={false}
        />
      ) : null}
    </div>
  );
}

function FeaturedCollection({
  collection,
}: {
  collection: FeaturedCollectionFragment;
}) {
  if (!collection) return null;
  const image = collection?.image;
  return (
    <Link
      className="featured-collection"
      to={`/collections/${collection.handle}`}
    >
      {image && (
        <div className="featured-collection-image">
          <Image
            data={image}
            sizes="100vw"
            alt={image.altText || collection.title}
          />
        </div>
      )}
      <h1>{collection.title}</h1>
    </Link>
  );
}

const FEATURED_COLLECTION_QUERY = `#graphql
  fragment FeaturedCollection on Collection {
    id
    title
    image {
      id
      url
      altText
      width
      height
    }
    handle
  }
  query FeaturedCollection($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 1, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...FeaturedCollection
      }
    }
  }
` as const;

type SanityCollectionGridSelection = {
  collectionId?: string | null;
  handle?: string | null;
  fallbackTitle?: string | null;
  title?: string | null;
  image?: SanityCollectionCardImage | null;
};

type ShopifyCollectionNode = NonNullable<
  HomepageCollectionGridQuery['collections'][number]
>;

type SanityCollectionCardImage = {
  asset?: {
    metadata?: {
      dimensions?: {
        width?: number | null;
        height?: number | null;
      } | null;
    } | null;
  } | null;
};

type SanityFeaturedProductSelection = {
  productId?: string | null;
  handle?: string | null;
  title?: string | null;
};

type ShopifyProductNode = NonNullable<
  HomepageFeaturedProductsQuery['products'][number]
>;

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
}

function isShopifyCollectionNode(
  node: HomepageCollectionGridQuery['collections'][number],
): node is ShopifyCollectionNode {
  return Boolean(node);
}

function isShopifyProductNode(
  node: HomepageFeaturedProductsQuery['products'][number],
): node is ShopifyProductNode {
  return Boolean(node);
}

function resolveCollectionGridItem(
  selection: SanityCollectionGridSelection,
  collectionsById: Map<string, ShopifyCollectionNode>,
): CollectionGridItem | null {
  if (!selection.collectionId || !selection.image) return null;

  const collection = collectionsById.get(selection.collectionId);
  if (!collection) return null;

  const imageUrl = urlFor(selection.image as Parameters<typeof urlFor>[0])
    .width(1000)
    .height(1250)
    .auto('format')
    .fit('crop')
    .url();
  if (!imageUrl) return null;

  const title = selection.title || collection.title || selection.fallbackTitle;
  const handle = collection.handle || selection.handle;
  if (!title || !handle) return null;

  return {
    id: collection.id,
    title,
    handle,
    image: {
      url: imageUrl,
      altText: title,
      width: 1000,
      height: 1250,
    },
  };
}

function resolveFeaturedProductItem(
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

const HOMEPAGE_COLLECTION_GRID_QUERY = `#graphql
  fragment HomepageCollectionGridCollection on Collection {
    __typename
    id
    title
    handle
  }

  query HomepageCollectionGrid(
    $collectionIds: [ID!]!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    collections: nodes(ids: $collectionIds) {
      ... on Collection {
        ...HomepageCollectionGridCollection
      }
    }
  }
` as const;

const HOMEPAGE_FEATURED_PRODUCTS_QUERY = `#graphql
  fragment HomepageFeaturedProduct on Product {
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

  query HomepageFeaturedProducts(
    $productIds: [ID!]!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    products: nodes(ids: $productIds) {
      ... on Product {
        ...HomepageFeaturedProduct
      }
    }
  }
` as const;

const HOME_PAGE_QUERY = `*[_type == "home"][0]{
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
    imageMobile{ asset->{_id, url, metadata{dimensions}}, hotspot, crop },
    content[]{
      _type,
      _type == "imageWithProductHotspots" => {
        image{
          asset->{_id, url, metadata{dimensions}},
          hotspot,
          crop
        }
      }
    }
  },
  collectionGrid{
    cards[]{
      "collectionId": collection->store.gid,
      "handle": collection->store.slug.current,
      "fallbackTitle": collection->store.title,
      "title": coalesce(title[language == $language][0].value, title[language == "nl"][0].value),
      image{
        asset->{_id, url, metadata{dimensions}},
        hotspot,
        crop
      }
    }
  },
  featuredProducts{
    "heading": coalesce(heading[language == $language][0].value, heading[language == "nl"][0].value),
    "products": products[]->{
      "productId": store.gid,
      "handle": store.slug.current,
      "title": store.title
    },
    "viewAllLabel": coalesce(viewAll.label[language == $language][0].value, viewAll.label[language == "nl"][0].value),
    "viewAllUrl": viewAll.url
  },
  promoBanner{
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
  seo{
    "title": coalesce(title[language == $language][0].value, title[language == "nl"][0].value),
    "description": coalesce(description[language == $language][0].value, description[language == "nl"][0].value)
  }
}`;
