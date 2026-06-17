import {useRef} from 'react';
import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import type {MoneyV2} from '@shopify/hydrogen/storefront-api-types';

export type FeaturedProductItem = {
  id: string;
  title: string;
  handle: string;
  image: {
    url: string;
    altText?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
  price: Pick<MoneyV2, 'amount' | 'currencyCode'>;
};

export function FeaturedProducts({
  heading,
  products,
  viewAllLabel,
  viewAllUrl,
}: {
  heading?: string;
  products: FeaturedProductItem[];
  viewAllLabel?: string;
  viewAllUrl?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  if (!products.length) return null;

  const scrollByCard = (dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>('.home-featured-product');
    const gap = parseFloat(getComputedStyle(track).gap || '0');
    const amount = (card?.offsetWidth ?? track.clientWidth) + gap;
    track.scrollBy({left: dir * amount, behavior: 'smooth'});
  };

  return (
    <section className="home-featured" aria-label={heading}>
      <div className="home-featured__header">
        {heading ? (
          <h2 className="home-featured__heading">{heading}</h2>
        ) : (
          <span />
        )}
        <div className="home-featured__header-right">
          {viewAllLabel && viewAllUrl && (
            <Link to={viewAllUrl} className="home-featured__viewall">
              {viewAllLabel}
            </Link>
          )}
          <div className="home-featured__nav">
            <button
              type="button"
              aria-label="Previous"
              className="home-featured__arrow"
              onClick={() => scrollByCard(-1)}
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next"
              className="home-featured__arrow"
              onClick={() => scrollByCard(1)}
            >
              ›
            </button>
          </div>
        </div>
      </div>
      <div className="home-featured__track" ref={trackRef}>
        {products.map((product, index) => (
          <Link
            key={product.id}
            to={`/products/${product.handle}`}
            prefetch="intent"
            className="home-featured-product"
          >
            <div className="home-featured-product__image">
              {product.image && (
                <Image
                  data={product.image}
                  alt={product.image.altText || product.title}
                  loading={index < 4 ? 'eager' : 'lazy'}
                  sizes="(min-width: 64em) 25vw, (min-width: 48em) 33vw, 50vw"
                />
              )}
            </div>
            <span className="home-featured-product__title">{product.title}</span>
            <span className="home-featured-product__price">
              <Money data={product.price} />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
