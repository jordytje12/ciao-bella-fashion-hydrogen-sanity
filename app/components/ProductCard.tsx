import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {ProductItemFragment} from 'storefrontapi.generated';
import {useVariantUrl} from '~/lib/variants';

/**
 * Productkaart voor collectiepagina's, in dezelfde stijl als de
 * homepage-productslider (home-featured-product).
 */
export function ProductCard({
  product,
  loading,
}: {
  product: ProductItemFragment;
  loading?: 'eager' | 'lazy';
}) {
  const variantUrl = useVariantUrl(product.handle);
  const image = product.featuredImage;

  return (
    <Link
      className="collection-product-card"
      key={product.id}
      prefetch="intent"
      to={variantUrl}
    >
      <div className="collection-product-card__image">
        {image && (
          <Image
            alt={image.altText || product.title}
            data={image}
            loading={loading}
            sizes="(min-width: 64em) 25vw, (min-width: 48em) 33vw, 50vw"
          />
        )}
      </div>
      <span className="collection-product-card__title">{product.title}</span>
      <span className="collection-product-card__price">
        <Money data={product.priceRange.minVariantPrice} />
      </span>
    </Link>
  );
}
