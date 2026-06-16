import {Await, useLoaderData, Link} from 'react-router';
import type {Route} from './+types/_index';
import {Suspense} from 'react';
import {Image} from '@shopify/hydrogen';
import type {
  FeaturedCollectionFragment,
  RecommendedProductsQuery,
} from 'storefrontapi.generated';
import {ProductItem} from '~/components/ProductItem';
import {MockShopNotice} from '~/components/MockShopNotice';
import {HeroBanner} from '~/components/HeroBanner';
import {urlFor} from '~/lib/sanityImage';
import {sanityLanguage} from '~/lib/i18n';

export const meta: Route.MetaFunction = () => {
  return [{title: 'Hydrogen | Home'}];
};

export async function loader(args: Route.LoaderArgs) {
  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args);

  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...deferredData, ...criticalData};
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

  return {
    isShopLinked: Boolean(context.env.PUBLIC_STORE_DOMAIN),
    featuredCollection: collections.nodes[0],
    sanityHome,
  };
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs) {
  const recommendedProducts = context.storefront
    .query(RECOMMENDED_PRODUCTS_QUERY)
    .catch((error: Error) => {
      // Log query errors, but don't throw them so the page can still render
      console.error(error);
      return null;
    });

  return {
    recommendedProducts,
  };
}

export default function Homepage() {
  const data = useLoaderData<typeof loader>();
  const hero = data.sanityHome?.hero;
  const heroImageData = hero?.content?.[0]?.image;
  const heroImage = heroImageData
    ? urlFor(heroImageData).auto('format').fit('crop').url()
    : null;
  const heroLink = hero?.link?.[0];
  const heroLinkUrl = (() => {
    if (!heroLink) return '/';
    if (heroLink._type === 'linkExternal') return heroLink.url ?? '/';
    const ref = heroLink.reference;
    if (!ref?.slug) return '/';
    if (ref._type === 'collection') return `/collections/${ref.slug}`;
    if (ref._type === 'product') return `/products/${ref.slug}`;
    if (ref._type === 'page') return `/pages/${ref.slug}`;
    return '/';
  })();

  return (
    <div className="home">
      {data.isShopLinked ? null : <MockShopNotice />}
      {hero && heroImage ? (
        <HeroBanner
          imageUrl={heroImage}
          title={hero.title}
          description={hero.description}
          link={{text: hero.button_text ?? 'Shop now', url: heroLinkUrl}}
        />
      ) : (
        <FeaturedCollection collection={data.featuredCollection} />
      )}
      <RecommendedProducts products={data.recommendedProducts} />
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

function RecommendedProducts({
  products,
}: {
  products: Promise<RecommendedProductsQuery | null>;
}) {
  return (
    <section
      className="recommended-products"
      aria-labelledby="recommended-products"
    >
      <h2 id="recommended-products">Recommended Products</h2>
      <Suspense fallback={<div>Loading...</div>}>
        <Await resolve={products}>
          {(response) => (
            <div className="recommended-products-grid">
              {response
                ? response.products.nodes.map((product) => (
                    <ProductItem key={product.id} product={product} />
                  ))
                : null}
            </div>
          )}
        </Await>
      </Suspense>
      <br />
    </section>
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
  seo{
    "title": coalesce(title[language == $language][0].value, title[language == "nl"][0].value),
    "description": coalesce(description[language == $language][0].value, description[language == "nl"][0].value)
  }
}`;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  fragment RecommendedProduct on Product {
    id
    title
    handle
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    featuredImage {
      id
      url
      altText
      width
      height
    }
  }
  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 4, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...RecommendedProduct
      }
    }
  }
` as const;