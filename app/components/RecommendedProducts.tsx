import {
  FeaturedProducts,
  type FeaturedProductItem,
} from '~/components/FeaturedProducts';

type RecommendedProductNode = {
  id: string;
  title: string;
  handle: string;
  featuredImage?: {
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
  priceRange: {
    minVariantPrice: FeaturedProductItem['price'];
  };
};

/**
 * "Ook leuk"-slider onderaan de productpagina, gevoed door Shopify
 * productRecommendations en gerenderd met de homepage-productslider.
 */
export function RecommendedProducts({
  products,
}: {
  products: RecommendedProductNode[];
}) {
  const items: FeaturedProductItem[] = products.map((product) => ({
    id: product.id,
    title: product.title,
    handle: product.handle,
    image: product.featuredImage
      ? {
          url: product.featuredImage.url,
          altText: product.featuredImage.altText,
          width: product.featuredImage.width,
          height: product.featuredImage.height,
        }
      : null,
    price: product.priceRange.minVariantPrice,
  }));

  if (!items.length) return null;

  return <FeaturedProducts heading="Ook leuk" products={items} />;
}
