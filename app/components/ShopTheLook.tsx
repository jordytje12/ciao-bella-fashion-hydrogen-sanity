import {useEffect, useRef, useState} from 'react';
import {Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';
import {urlFor} from '~/lib/sanityImage';
import type {FeaturedProductItem} from '~/components/FeaturedProducts';

export type ShopTheLookLook = {
  image: object;
  products: FeaturedProductItem[];
};

export type ShopTheLookData = {
  heading: string;
  looks: ShopTheLookLook[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Centered product card (new style, one at a time)
// ─────────────────────────────────────────────────────────────────────────────
function ShopTheLookCard({product}: {product: FeaturedProductItem}) {
  return (
    <Link
      to={`/products/${product.handle}`}
      prefetch="intent"
      className="stl-card"
    >
      <div className="stl-card__image">
        {product.image && (
          <Image
            data={product.image}
            alt={product.image.altText || product.title}
            sizes="(min-width: 64em) 30vw, (min-width: 48em) 40vw, 80vw"
          />
        )}
      </div>
      <span className="stl-card__title">{product.title}</span>
      <span className="stl-card__price">
        <Money data={product.price} />
      </span>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main section
// ─────────────────────────────────────────────────────────────────────────────
export function ShopTheLook({heading, looks}: ShopTheLookData) {
  const [activeLook, setActiveLook] = useState(0);
  const [productIndex, setProductIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  // Ref so the scroll handler always reads the latest activeLook without
  // being in the dependency array (prevents tear-down/re-attach every render)
  const activeLookRef = useRef(activeLook);
  useEffect(() => {
    activeLookRef.current = activeLook;
  }, [activeLook]);

  // Sync activeLook from the left scroll-snap track position
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onScroll = () => {
      const slideWidth = track.clientWidth;
      if (!slideWidth) return;
      const newIndex = Math.max(
        0,
        Math.min(Math.round(track.scrollLeft / slideWidth), looks.length - 1),
      );
      if (newIndex !== activeLookRef.current) {
        setActiveLook(newIndex);
        setProductIndex(0);
      }
    };

    track.addEventListener('scroll', onScroll, {passive: true});
    return () => track.removeEventListener('scroll', onScroll);
  }, [looks.length]);

  // Jump to a look when a dot is clicked
  const goToLook = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    setActiveLook(index);
    setProductIndex(0);
    track.scrollTo({left: index * track.clientWidth, behavior: 'smooth'});
  };

  if (!looks.length) return null;

  const currentProducts = looks[activeLook]?.products ?? [];
  const currentProduct = currentProducts[productIndex];
  const hasPrev = productIndex > 0;
  const hasNext = productIndex < currentProducts.length - 1;
  const showDots = looks.length > 1;
  const showArrows = currentProducts.length > 1;

  return (
    <section className="stl" aria-label="Shop the Look">
      <div className="stl__columns">
        {/* ── Left: image slider ── */}
        <div className="stl__left">
          <div className="stl__image-track" ref={trackRef}>
            {looks.map((look, i) => {
              const imageUrl = urlFor(look.image as Parameters<typeof urlFor>[0])
                .auto('format')
                .fit('crop')
                .url();
              return (
                <div
                  key={i}
                  className="stl__image-slide"
                  aria-hidden={i !== activeLook}
                >
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt={`Look ${i + 1}`}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      className="stl__image"
                    />
                  )}
                </div>
              );
            })}
          </div>

          {showDots && (
            <div className="stl__dots" aria-label="Look navigation">
              {looks.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Look ${i + 1}`}
                  aria-pressed={i === activeLook}
                  className={`stl__dot${i === activeLook ? ' stl__dot--active' : ''}`}
                  onClick={() => goToLook(i)}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Right: product slider ── */}
        <div className="stl__right">
          {heading && <h2 className="stl__heading">{heading}</h2>}

          {currentProduct ? (
            <div className="stl__products">
              <button
                type="button"
                aria-label="Previous product"
                className="stl__arrow stl__arrow--prev"
                onClick={() => setProductIndex((i) => Math.max(0, i - 1))}
                disabled={!hasPrev}
                style={{visibility: showArrows ? 'visible' : 'hidden'}}
              >
                ‹
              </button>

              <ShopTheLookCard product={currentProduct} />

              <button
                type="button"
                aria-label="Next product"
                className="stl__arrow stl__arrow--next"
                onClick={() =>
                  setProductIndex((i) =>
                    Math.min(currentProducts.length - 1, i + 1),
                  )
                }
                disabled={!hasNext}
                style={{visibility: showArrows ? 'visible' : 'hidden'}}
              >
                ›
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
