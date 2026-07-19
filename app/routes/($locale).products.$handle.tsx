import {Suspense} from 'react';
import {Await, useLoaderData} from 'react-router';
import type {Route} from './+types/($locale).products.$handle';
import {
  getSelectedProductOptions,
  Analytics,
  useOptimisticVariant,
  getProductOptions,
  getAdjacentAndFirstAvailableVariants,
  useSelectedOptionInUrlParam,
} from '@shopify/hydrogen';
import {PortableText, type PortableTextBlock} from '@portabletext/react';
import {ProductPrice} from '~/components/ProductPrice';
import {ProductGallery} from '~/components/ProductGallery';
import {ProductForm} from '~/components/ProductForm';
import {StockLevelBar} from '~/components/StockLevelBar';
import {Accordion} from '~/components/Accordion';
import {RecommendedProducts} from '~/components/RecommendedProducts';
import {Reviews, TrustpilotStars} from '~/components/Reviews';
import {portableTextComponents} from '~/components/PortableTextComponents';
import {redirectIfHandleIsLocalized} from '~/lib/redirect';
import {sanityLanguage} from '~/lib/i18n';
import {portableTextToPlainText} from '~/lib/portableText';
import {
  resolveReviews,
  SANITY_FEATURED_REVIEWS_PROJECTION,
  SANITY_REVIEWS_PROJECTION,
  type SanityReviewItemRaw,
  type SanityReviewsConfigRaw,
} from '~/lib/reviews';
import {
  getSeoMeta,
  breadcrumbJsonLd,
  canonicalUrl,
  faqPageJsonLd,
  productJsonLd,
  rootSeo,
} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data, matches, location}) => {
  const {origin, seo} = rootSeo(matches);
  const url = canonicalUrl(origin, location.pathname);

  const title =
    data?.sanityProduct?.seo?.title ??
    data?.product.seo?.title ??
    data?.product.title ??
    '';
  const description =
    data?.sanityProduct?.seo?.description ??
    data?.product.seo?.description ??
    data?.product.description ??
    '';

  const selectedVariant = data?.product.selectedOrFirstAvailableVariant;
  const image = selectedVariant?.image?.url ?? data?.product.images.nodes[0]?.url;

  const faqLd = faqPageJsonLd(
    (data?.productFaqs ?? [])
      .filter((faq) => faq.question && faq.answer?.length)
      .map((faq) => ({
        question: faq.question!,
        answer: portableTextToPlainText(faq.answer),
      })),
  );

  return getSeoMeta(seo, {
    title,
    description,
    url,
    media: image,
    jsonLd: data?.product
      ? [
          productJsonLd({
            product: {
              title: data.product.title,
              description,
              vendor: data.product.vendor,
              featuredImage: image ? {url: image} : null,
            },
            selectedVariant,
            url,
          }),
          breadcrumbJsonLd([
            {name: 'Home', url: origin || undefined},
            {name: data.product.title, url},
          ]),
          ...(faqLd ? [faqLd] : []),
        ]
      : undefined,
  });
};

export async function loader(args: Route.LoaderArgs) {
  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);

  return {...criticalData};
}

type SanityProductRaw = {
  body?: PortableTextBlock[] | null;
  seo?: {title?: string | null; description?: string | null} | null;
} | null;

type SanityPdpSettingsRaw = {
  productInfoPanels?: Array<{
    _key: string;
    title?: string | null;
    body?: PortableTextBlock[] | null;
  }> | null;
  productFaqs?: Array<{
    _key: string;
    question?: string | null;
    answer?: PortableTextBlock[] | null;
  }> | null;
  reviewScore?: number | null;
  homeReviews?: {
    reviews?: SanityReviewsConfigRaw;
    featuredReviews?: SanityReviewItemRaw[] | null;
  } | null;
} | null;

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context, params, request}: Route.LoaderArgs) {
  const {handle} = params;
  const {storefront, sanity} = context;

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  const language = sanityLanguage(storefront.i18n.language);

  const [{product}, sanityProduct, sanitySettings] = await Promise.all([
    storefront.query(PRODUCT_QUERY, {
      variables: {handle, selectedOptions: getSelectedProductOptions(request)},
    }),
    sanity
      .fetch<SanityProductRaw>(
        SANITY_PRODUCT_QUERY,
        {handle, language},
        {hydrogen: {debug: {displayName: 'query SanityProduct'}}},
      )
      .catch(() => null),
    sanity
      .fetch<SanityPdpSettingsRaw>(
        SANITY_PDP_SETTINGS_QUERY,
        {language},
        {hydrogen: {debug: {displayName: 'query SanityPdpSettings'}}},
      )
      .catch(() => null),
  ]);

  if (!product?.id) {
    throw new Response(null, {status: 404});
  }

  // The API handle might be localized, so redirect to the localized handle
  redirectIfHandleIsLocalized(request, {handle, data: product});

  // Aanbevelingen hebben het product-GID nodig; start de query zonder await
  // zodat hij deferred blijft (render via <Suspense><Await>).
  const recommended = storefront
    .query(RECOMMENDED_PRODUCTS_QUERY, {
      variables: {productId: product.id},
    })
    .then((result) => result.productRecommendations ?? [])
    .catch(() => []);

  const reviews = resolveReviews(
    sanitySettings?.homeReviews?.reviews ?? null,
    (sanitySettings?.homeReviews?.featuredReviews as SanityReviewItemRaw[]) ??
      [],
  );

  return {
    product,
    sanityProduct,
    productInfoPanels: sanitySettings?.productInfoPanels ?? [],
    productFaqs: sanitySettings?.productFaqs ?? [],
    reviewScore: sanitySettings?.reviewScore ?? null,
    reviews,
    recommended,
  };
}

export default function Product() {
  const {
    product,
    sanityProduct,
    productInfoPanels,
    productFaqs,
    reviewScore,
    reviews,
    recommended,
  } = useLoaderData<typeof loader>();

  // Optimistically selects a variant with given available variant information
  const selectedVariant = useOptimisticVariant(
    product.selectedOrFirstAvailableVariant,
    getAdjacentAndFirstAvailableVariants(product),
  );

  // Sets the search param to the selected variant without navigation
  // only when no search params are set in the url
  useSelectedOptionInUrlParam(selectedVariant.selectedOptions);

  // Get the product options array
  const productOptions = getProductOptions({
    ...product,
    selectedOrFirstAvailableVariant: selectedVariant,
  });

  const {title, descriptionHtml} = product;

  const detailsContent = sanityProduct?.body?.length ? (
    <PortableText
      value={sanityProduct.body}
      components={portableTextComponents}
    />
  ) : descriptionHtml ? (
    <div dangerouslySetInnerHTML={{__html: descriptionHtml}} />
  ) : null;

  const accordionItems = [
    ...(detailsContent
      ? [{id: 'details', title: 'Productdetails', content: detailsContent}]
      : []),
    ...productInfoPanels
      .filter((panel) => panel.title && panel.body?.length)
      .map((panel) => ({
        id: panel._key,
        title: panel.title!,
        content: (
          <PortableText
            value={panel.body!}
            components={portableTextComponents}
          />
        ),
      })),
    ...productFaqs
      .filter((faq) => faq.question && faq.answer?.length)
      .map((faq) => ({
        id: faq._key,
        title: faq.question!,
        content: (
          <PortableText
            value={faq.answer!}
            components={portableTextComponents}
          />
        ),
      })),
  ];

  return (
    <>
      <div className="pdp">
        <div className="pdp__gallery">
          <ProductGallery
            images={product.images.nodes}
            selectedVariantImage={selectedVariant?.image}
            productTitle={title}
          />
        </div>
        <div className="pdp__info">
          {product.vendor ? (
            <p className="pdp__vendor">{product.vendor}</p>
          ) : null}
          {reviewScore !== null ? (
            <div className="pdp__rating">
              <TrustpilotStars rating={reviewScore} size="sm" />
              <span className="pdp__rating-score">
                {reviewScore.toFixed(1)}/5.0
              </span>
            </div>
          ) : null}
          <h1 className="pdp__title">{title}</h1>
          <div className="pdp__price">
            <ProductPrice
              price={selectedVariant?.price}
              compareAtPrice={selectedVariant?.compareAtPrice}
            />
          </div>
          <StockLevelBar
            availableForSale={selectedVariant?.availableForSale}
            quantityAvailable={selectedVariant?.quantityAvailable}
          />
          <ProductForm
            productOptions={productOptions}
            selectedVariant={selectedVariant}
          />
          <Accordion items={accordionItems} defaultOpenIndex={0} />
        </div>
      </div>
      <Suspense fallback={null}>
        <Await resolve={recommended} errorElement={null}>
          {(products) => <RecommendedProducts products={products} />}
        </Await>
      </Suspense>
      {reviews ? <Reviews data={reviews} /> : null}
      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />
    </>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    quantityAvailable
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
  }
` as const;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    encodedVariantExistence
    encodedVariantAvailability
    images(first: 10) {
      nodes {
        id
        url
        altText
        width
        height
      }
    }
    options {
      name
      optionValues {
        name
        firstSelectableVariant {
          ...ProductVariant
        }
        swatch {
          color
          image {
            previewImage {
              url
            }
          }
        }
      }
    }
    selectedOrFirstAvailableVariant(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariant
    }
    adjacentVariants (selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    seo {
      description
      title
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  fragment RecommendedProduct on Product {
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

  query ProductRecommendations(
    $productId: ID!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    productRecommendations(productId: $productId, intent: RELATED) {
      ...RecommendedProduct
    }
  }
` as const;

const PORTABLE_TEXT_MARKDEFS = `markDefs[]{
  ...,
  _type == "linkInternal" => {
    "docType": reference->_type,
    "slug": coalesce(reference->store.slug.current, reference->slug.current)
  },
  _type == "linkProduct" => {
    "slug": productWithVariant.product->store.slug.current
  }
}`;

const SANITY_PRODUCT_QUERY = `*[_type == "product" && store.slug.current == $handle && !(_id in path("drafts.**"))][0]{
  "body": coalesce(body[language == $language][0].value, body[language == "nl"][0].value)[]{
    ...,
    ${PORTABLE_TEXT_MARKDEFS}
  },
  seo{
    "title": coalesce(title[language == $language][0].value, title[language == "nl"][0].value),
    "description": coalesce(description[language == $language][0].value, description[language == "nl"][0].value)
  }
}`;

const SANITY_PDP_SETTINGS_QUERY = `*[_type == "settings"][0]{
  "reviewScore": *[_type == "home"][0].reviews.score,
  "homeReviews": *[_type == "home"][0]{
    ${SANITY_REVIEWS_PROJECTION},
    ${SANITY_FEATURED_REVIEWS_PROJECTION}
  },
  "productInfoPanels": productInfoPanels[]{
    _key,
    "title": coalesce(title[language == $language][0].value, title[language == "nl"][0].value),
    "body": coalesce(body[language == $language][0].value, body[language == "nl"][0].value)[]{
      ...,
      ${PORTABLE_TEXT_MARKDEFS}
    }
  },
  "productFaqs": productFaqs[]{
    _key,
    "question": coalesce(question[language == $language][0].value, question[language == "nl"][0].value),
    "answer": coalesce(answer[language == $language][0].value, answer[language == "nl"][0].value)[]{
      ...,
      ${PORTABLE_TEXT_MARKDEFS}
    }
  }
}`;
