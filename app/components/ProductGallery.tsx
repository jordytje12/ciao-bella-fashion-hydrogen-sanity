import {useEffect, useState} from 'react';
import {Image} from '@shopify/hydrogen';

type GalleryImage = {
  id?: string | null;
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
};

/**
 * Fotogalerij voor de productpagina: grote foto + thumbnails op desktop,
 * horizontale snap-slider op mobiel. De afbeelding van de gekozen variant
 * krijgt voorrang zodra de bezoeker van variant wisselt.
 */
export function ProductGallery({
  images,
  selectedVariantImage,
  productTitle,
}: {
  images: GalleryImage[];
  selectedVariantImage?: GalleryImage | null;
  productTitle: string;
}) {
  const galleryImages = images.length
    ? images
    : selectedVariantImage
      ? [selectedVariantImage]
      : [];

  const [activeImageId, setActiveImageId] = useState<string | null>(null);

  // Variantwissel wint van een handmatige thumbnail-keuze
  const variantImageId = selectedVariantImage?.id ?? null;
  useEffect(() => {
    if (variantImageId) setActiveImageId(variantImageId);
  }, [variantImageId]);

  if (!galleryImages.length) {
    return <div className="pdp-gallery" />;
  }

  const activeImage =
    galleryImages.find((image) => image.id === activeImageId) ??
    galleryImages[0];

  return (
    <div className="pdp-gallery">
      <div className="pdp-gallery__main">
        <Image
          alt={activeImage.altText || productTitle}
          data={activeImage}
          key={activeImage.id ?? activeImage.url}
          loading="eager"
          sizes="(min-width: 48em) 55vw, 100vw"
        />
      </div>
      {galleryImages.length > 1 && (
        <div className="pdp-gallery__thumbs">
          {galleryImages.map((image, index) => {
            const isActive =
              (image.id ?? image.url) === (activeImage.id ?? activeImage.url);
            return (
              <button
                aria-current={isActive}
                aria-label={`Afbeelding ${index + 1} van ${galleryImages.length}`}
                className={`pdp-gallery__thumb${isActive ? ' pdp-gallery__thumb--active' : ''}`}
                key={image.id ?? image.url}
                onClick={() => setActiveImageId(image.id ?? null)}
                type="button"
              >
                <Image
                  alt={image.altText || productTitle}
                  data={image}
                  loading={index < 6 ? 'eager' : 'lazy'}
                  sizes="80px"
                />
              </button>
            );
          })}
        </div>
      )}
      <div className="pdp-gallery__track">
        {galleryImages.map((image, index) => (
          <div className="pdp-gallery__slide" key={image.id ?? image.url}>
            <Image
              alt={image.altText || productTitle}
              data={image}
              loading={index === 0 ? 'eager' : 'lazy'}
              sizes="100vw"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
