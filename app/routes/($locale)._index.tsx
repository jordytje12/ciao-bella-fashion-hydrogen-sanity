import {useLoaderData, Link} from 'react-router';
import type {Route} from './+types/($locale)._index';
import {Image} from '@shopify/hydrogen';
import type {
  FeaturedCollectionFragment,
  HomepageCollectionGridQuery,
} from 'storefrontapi.generated';
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
import {
  ShopTheLook,
  type ShopTheLookData,
} from '~/components/ShopTheLook';
import {DualCardBanner} from '~/components/DualCardBanner';
import {Reviews} from '~/components/Reviews';
import {
  InstagramCards,
  type InstagramCardsData,
} from '~/components/InstagramCards';
import {urlFor} from '~/lib/sanityImage';
import {sanityLanguage} from '~/lib/i18n';
import {
  hydrateProductsByGid,
  resolveDualCardBanner,
  resolveFeaturedProductItem,
  resolveLinkUrl,
  uniqueStrings,
  type SanityFeaturedProductSelection,
} from '~/lib/sanityModules';
import {
  resolveReviews,
  SANITY_FEATURED_REVIEWS_PROJECTION,
  SANITY_REVIEWS_PROJECTION,
  type SanityReviewItemRaw,
} from '~/lib/reviews';
import {getSeoMeta, canonicalUrl, organizationJsonLd, rootSeo, webSiteJsonLd} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data, matches, location}) => {
  const {origin, seo} = rootSeo(matches);
  const url = canonicalUrl(origin, location.pathname);

  const homeSeo = (data?.sanityHome as HomeSeoRaw | null)?.seo;
  const rootData = matches.find((match) => match?.id === 'root')?.data as
    | {footer?: {socialLinks?: Array<{url: string}> | null} | null}
    | undefined;
  const sameAs =
    rootData?.footer?.socialLinks?.map((social) => social.url) ?? [];

  return getSeoMeta(seo, {
    title: homeSeo?.title ?? seo.title,
    // Homepage toont de titel zonder site-suffix
    titleTemplate: '%s',
    description: homeSeo?.description ?? seo.description,
    url,
    media: homeSeo?.imageUrl ?? seo.media,
    jsonLd: [organizationJsonLd({url, sameAs}), webSiteJsonLd({origin})],
  });
};

type HomeSeoRaw = {
  seo?: {
    title?: string | null;
    description?: string | null;
    imageUrl?: string | null;
  } | null;
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

  const shopTheLook = await loadShopTheLook(
    context,
    sanityHome?.shopTheLook ?? null,
  );

  const dualCardBanner = resolveDualCardBanner(sanityHome?.dualCardBanner?.cards ?? []);

  const reviews = resolveReviews(
    sanityHome?.reviews ?? null,
    (sanityHome?.featuredReviews as SanityReviewItemRaw[]) ?? [],
  );

  const instagramCards = resolveInstagramCards(
    (sanityHome?.instagramCards as SanityInstagramCardsRaw) ?? null,
  );

  return {
    isShopLinked: Boolean(context.env.PUBLIC_STORE_DOMAIN),
    collectionGrid,
    featuredProducts,
    featuredHeading: (sanityHome?.featuredProducts?.heading as string) ?? '',
    featuredViewAllLabel: (sanityHome?.featuredProducts?.viewAllLabel as string) ?? '',
    featuredViewAllUrl: (sanityHome?.featuredProducts?.viewAllUrl as string) ?? '',
    featuredCollection: collections.nodes[0],
    shopTheLook,
    dualCardBanner,
    reviews,
    instagramCards,
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

type SanityInstagramCardRaw = {
  image?: {
    asset?: {
      url?: string | null;
      metadata?: {dimensions?: {width?: number | null; height?: number | null} | null} | null;
    } | null;
  } | null;
  username?: string | null;
  handle?: string | null;
  title?: string | null;
};

type SanityInstagramCardsRaw = {
  heading?: string | null;
  instagramHandle?: string | null;
  instagramUrl?: string | null;
  cards?: SanityInstagramCardRaw[] | null;
} | null;

type SanityShopTheLookRaw = {
  heading?: string | null;
  looks?: Array<{
    image?: object | null;
    products?: SanityFeaturedProductSelection[] | null;
  }> | null;
} | null;

async function loadShopTheLook(
  context: Route.LoaderArgs['context'],
  raw: SanityShopTheLookRaw,
): Promise<ShopTheLookData | null> {
  if (!raw?.looks?.length) return null;

  // Flatten all product selections across every look (dedupe GIDs)
  const allSelections = raw.looks.flatMap((look) => look.products ?? []);
  const productIds = uniqueStrings(allSelections.map((s) => s.productId));

  if (productIds.length === 0) return null;

  const productsById = await hydrateProductsByGid(context, productIds);

  const looks = raw.looks
    .map((look) => ({
      image: look.image ?? {},
      products: (look.products ?? [])
        .map((sel) => resolveFeaturedProductItem(sel, productsById))
        .filter((p): p is FeaturedProductItem => Boolean(p)),
    }))
    .filter((look) => look.products.length > 0);

  if (!looks.length) return null;

  return {
    heading: raw.heading ?? '',
    looks,
  };
}

async function loadFeaturedProducts(
  context: Route.LoaderArgs['context'],
  selections: SanityFeaturedProductSelection[],
): Promise<FeaturedProductItem[]> {
  const productIds = uniqueStrings(
    selections.map((selection) => selection.productId),
  );

  if (productIds.length === 0) return [];

  const productsById = await hydrateProductsByGid(context, productIds);

  // Preserve Sanity ordering
  return selections
    .map((selection) => resolveFeaturedProductItem(selection, productsById))
    .filter((p): p is FeaturedProductItem => Boolean(p));
}

function resolveInstagramCards(raw: SanityInstagramCardsRaw): InstagramCardsData | null {
  if (!raw?.cards?.length) return null;

  const cards = raw.cards
    .filter((card) => card.image?.asset?.url && card.handle && card.username)
    .map((card) => ({
      image: {
        url: urlFor(card.image as Parameters<typeof urlFor>[0])
          .width(800)
          .height(1000)
          .auto('format')
          .fit('crop')
          .url(),
      },
      username: card.username!,
      title: card.title ?? '',
      handle: card.handle!,
    }))
    .filter((card) => Boolean(card.image.url));

  if (!cards.length) return null;

  return {
    heading: raw.heading ?? '',
    instagramHandle: raw.instagramHandle ?? null,
    instagramUrl: raw.instagramUrl ?? null,
    cards,
  };
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
      {data.shopTheLook ? (
        <ShopTheLook
          heading={data.shopTheLook.heading}
          looks={data.shopTheLook.looks}
        />
      ) : null}
      {data.dualCardBanner.length === 2 ? (
        <DualCardBanner cards={data.dualCardBanner} />
      ) : null}
      {data.reviews ? <Reviews data={data.reviews} /> : null}
      {data.instagramCards ? <InstagramCards data={data.instagramCards} /> : null}
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

function isShopifyCollectionNode(
  node: HomepageCollectionGridQuery['collections'][number],
): node is ShopifyCollectionNode {
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
  shopTheLook{
    "heading": coalesce(heading[language == $language][0].value, heading[language == "nl"][0].value),
    "looks": looks[]{
      image{ asset->{_id, url, metadata{dimensions}}, hotspot, crop },
      "products": products[]->{
        "productId": store.gid,
        "handle": store.slug.current,
        "title": store.title
      }
    }
  },
  dualCardBanner{
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
  ${SANITY_REVIEWS_PROJECTION},
  instagramCards{
    "heading": coalesce(heading[language == $language][0].value, heading[language == "nl"][0].value),
    instagramHandle,
    instagramUrl,
    "cards": cards[]{
      image{ asset->{_id, url, metadata{dimensions}}, hotspot, crop },
      username,
      "handle": product->store.slug.current,
      "title": product->store.title
    }
  },
  ${SANITY_FEATURED_REVIEWS_PROJECTION},
  seo{
    "title": coalesce(title[language == $language][0].value, title[language == "nl"][0].value),
    "description": coalesce(description[language == $language][0].value, description[language == "nl"][0].value),
    "imageUrl": image.asset->url
  }
}`;
