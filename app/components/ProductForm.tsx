import {useEffect, useId, useRef, useState} from 'react';
import {useInView} from 'react-intersection-observer';
import {Link, useFetcher, useNavigate} from 'react-router';
import {type MappedProductOptions} from '@shopify/hydrogen';
import type {
  Maybe,
  ProductOptionValueSwatch,
} from '@shopify/hydrogen/storefront-api-types';
import {AddToCartButton} from './AddToCartButton';
import {QuantitySelector} from './QuantitySelector';
import {useAside} from './Aside';
import type {ProductFragment} from 'storefrontapi.generated';

const PDP_ADD_TO_CART_FETCHER_KEY = 'pdp-add-to-cart';

export function ProductForm({
  productOptions,
  selectedVariant,
}: {
  productOptions: MappedProductOptions[];
  selectedVariant: ProductFragment['selectedOrFirstAvailableVariant'];
}) {
  const navigate = useNavigate();
  const {open} = useAside();
  const [quantity, setQuantity] = useState(1);
  const [isSizeSheetOpen, setIsSizeSheetOpen] = useState(false);
  const [selectedSizeVariantId, setSelectedSizeVariantId] = useState<
    string | null
  >(null);
  const sizeSheetTitleId = useId();
  const sizeSheetRef = useRef<HTMLDivElement>(null);
  const sizeSheetCloseRef = useRef<HTMLButtonElement>(null);
  const stickyTriggerRef = useRef<HTMLButtonElement>(null);
  const restoreSheetFocusRef = useRef(true);
  const sizeSheetSubmissionRef = useRef(false);
  const addToCartFetcher = useFetcher({key: PDP_ADD_TO_CART_FETCHER_KEY});
  const {ref: buyRef, entry: buyEntry} = useInView();
  const showStickyAddToCart = Boolean(
    buyEntry &&
    !buyEntry.isIntersecting &&
    buyEntry.boundingClientRect.bottom <= 0,
  );
  const addToCartDisabled =
    !selectedVariant || !selectedVariant.availableForSale;
  const addToCartLines = selectedVariant
    ? [
        {
          merchandiseId: selectedVariant.id,
          quantity,
          selectedVariant,
        },
      ]
    : [];
  const addToCartLabel = selectedVariant?.availableForSale
    ? 'In winkelwagen'
    : 'Uitverkocht';
  const sizeOption = productOptions.find((option) =>
    ['maat', 'size'].includes(option.name.toLocaleLowerCase('nl')),
  );
  const selectedSize = sizeOption?.optionValues.find((value) => value.selected);
  const activeSize =
    sizeOption?.optionValues.find(
      (value) => value.variant.id === selectedSizeVariantId,
    ) ?? selectedSize;
  const sizeSheetVariant =
    activeSize?.variant ?? (!sizeOption ? selectedVariant : null);
  const sizeSheetAddToCartLines = sizeSheetVariant
    ? [
        {
          merchandiseId: sizeSheetVariant.id,
          quantity,
          selectedVariant: sizeSheetVariant,
        },
      ]
    : [];
  const canAddFromSizeSheet = Boolean(
    sizeSheetVariant?.availableForSale &&
    (!sizeOption || (activeSize?.exists && activeSize.available)),
  );
  const sizeSheetButtonLabel =
    sizeOption && !activeSize
      ? 'Kies een maat'
      : sizeSheetVariant?.availableForSale
        ? 'In winkelwagen'
        : 'Uitverkocht';

  const openSizeSheet = () => {
    restoreSheetFocusRef.current = true;
    setSelectedSizeVariantId(selectedSize?.variant.id ?? null);
    setIsSizeSheetOpen(true);
  };

  const closeSizeSheet = (restoreFocus = true) => {
    restoreSheetFocusRef.current = restoreFocus;
    setIsSizeSheetOpen(false);
  };

  useEffect(() => {
    if (
      !sizeSheetSubmissionRef.current ||
      addToCartFetcher.state !== 'submitting'
    ) {
      return;
    }

    sizeSheetSubmissionRef.current = false;
    restoreSheetFocusRef.current = false;
    setIsSizeSheetOpen(false);
    open('cart');
  }, [addToCartFetcher.state, open]);

  useEffect(() => {
    if (!isSizeSheetOpen) return;

    const previousOverflow = document.documentElement.style.overflow;
    const triggerElement = stickyTriggerRef.current;
    const focusFrame = window.requestAnimationFrame(() => {
      sizeSheetCloseRef.current?.focus();
    });

    document.documentElement.style.overflow = 'hidden';

    const desktopMedia = window.matchMedia('(min-width: 48em)');
    const handleBreakpointChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        restoreSheetFocusRef.current = false;
        setIsSizeSheetOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        restoreSheetFocusRef.current = true;
        setIsSizeSheetOpen(false);
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements =
        sizeSheetRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );

      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    desktopMedia.addEventListener('change', handleBreakpointChange);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      desktopMedia.removeEventListener('change', handleBreakpointChange);
      document.removeEventListener('keydown', handleKeyDown);
      document.documentElement.style.overflow = previousOverflow;

      const shouldRestoreFocus = restoreSheetFocusRef.current;
      restoreSheetFocusRef.current = true;

      if (shouldRestoreFocus) {
        window.requestAnimationFrame(() => triggerElement?.focus());
      }
    };
  }, [isSizeSheetOpen]);

  return (
    <div className="pdp-form">
      {productOptions.map((option) => {
        // If there is only a single value in the option values, don't display the option
        if (option.optionValues.length === 1) return null;

        return (
          <div className="pdp-options" key={option.name}>
            <span className="pdp-options__label">{option.name}</span>
            <div className="pdp-options__grid">
              {option.optionValues.map((value) => {
                const {
                  name,
                  handle,
                  variantUriQuery,
                  selected,
                  available,
                  exists,
                  isDifferentProduct,
                  swatch,
                } = value;

                const itemClassName = [
                  'pdp-options__item',
                  selected ? 'pdp-options__item--selected' : '',
                  !available ? 'pdp-options__item--unavailable' : '',
                  swatch?.color || swatch?.image
                    ? 'pdp-options__item--swatch'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ');

                if (isDifferentProduct) {
                  // SEO
                  // When the variant is a combined listing child product
                  // that leads to a different url, we need to render it
                  // as an anchor tag
                  return (
                    <Link
                      className={itemClassName}
                      key={option.name + name}
                      prefetch="intent"
                      preventScrollReset
                      replace
                      to={`/products/${handle}?${variantUriQuery}`}
                    >
                      <ProductOptionSwatch swatch={swatch} name={name} />
                    </Link>
                  );
                } else {
                  // SEO
                  // When the variant is an update to the search param,
                  // render it as a button with javascript navigating to
                  // the variant so that SEO bots do not index these as
                  // duplicated links
                  return (
                    <button
                      type="button"
                      className={itemClassName}
                      key={option.name + name}
                      disabled={!exists}
                      onClick={() => {
                        if (!selected) {
                          void navigate(`?${variantUriQuery}`, {
                            replace: true,
                            preventScrollReset: true,
                          });
                        }
                      }}
                    >
                      <ProductOptionSwatch swatch={swatch} name={name} />
                    </button>
                  );
                }
              })}
            </div>
          </div>
        );
      })}
      <div ref={buyRef} className="pdp-buy">
        <QuantitySelector
          value={quantity}
          onDecrease={() => setQuantity((current) => Math.max(1, current - 1))}
          onIncrease={() => setQuantity((current) => current + 1)}
          disabled={!selectedVariant?.availableForSale}
        />
        <AddToCartButton
          className="pdp-buy__add"
          disabled={addToCartDisabled}
          fetcherKey={PDP_ADD_TO_CART_FETCHER_KEY}
          onClick={() => {
            open('cart');
          }}
          lines={addToCartLines}
        >
          {addToCartLabel}
        </AddToCartButton>
      </div>
      {showStickyAddToCart ? (
        <div className="pdp-buy-sticky">
          <button
            ref={stickyTriggerRef}
            type="button"
            className="pdp-buy__add pdp-buy-sticky__add"
            aria-expanded={isSizeSheetOpen}
            aria-haspopup="dialog"
            onClick={openSizeSheet}
          >
            In winkelwagen
          </button>
        </div>
      ) : null}
      {isSizeSheetOpen ? (
        <div className="pdp-size-sheet-layer">
          <button
            type="button"
            className="pdp-size-sheet__backdrop"
            aria-label="Maatkeuze sluiten"
            tabIndex={-1}
            onClick={() => closeSizeSheet()}
          />
          <div
            ref={sizeSheetRef}
            className="pdp-size-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={sizeSheetTitleId}
          >
            <div className="pdp-size-sheet__header">
              <h2 id={sizeSheetTitleId}>Kies je maat</h2>
              <button
                ref={sizeSheetCloseRef}
                type="button"
                className="pdp-size-sheet__close"
                aria-label="Sluiten"
                onClick={() => closeSizeSheet()}
              >
                &times;
              </button>
            </div>
            {sizeOption ? (
              <div
                className="pdp-size-sheet__options"
                role="group"
                aria-label={sizeOption.name}
              >
                {sizeOption.optionValues.map((value) => {
                  const {
                    name,
                    handle,
                    variantUriQuery,
                    available,
                    exists,
                    isDifferentProduct,
                  } = value;
                  const unavailable = !exists || !available;
                  const active = value.variant.id === activeSize?.variant.id;
                  const itemClassName = [
                    'pdp-size-sheet__option',
                    active ? 'pdp-size-sheet__option--selected' : '',
                    unavailable ? 'pdp-size-sheet__option--unavailable' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <button
                      type="button"
                      className={itemClassName}
                      key={sizeOption.name + name}
                      aria-pressed={active}
                      disabled={unavailable}
                      onClick={() => {
                        if (active) return;

                        const destination = isDifferentProduct
                          ? `/products/${handle}?${variantUriQuery}`
                          : `?${variantUriQuery}`;

                        setSelectedSizeVariantId(value.variant.id);
                        void navigate(destination, {
                          replace: true,
                          preventScrollReset: true,
                        });
                      }}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <AddToCartButton
              className="pdp-buy__add pdp-size-sheet__submit"
              disabled={!canAddFromSizeSheet}
              fetcherKey={PDP_ADD_TO_CART_FETCHER_KEY}
              onClick={() => {
                sizeSheetSubmissionRef.current = true;
              }}
              lines={sizeSheetAddToCartLines}
            >
              {sizeSheetButtonLabel}
            </AddToCartButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProductOptionSwatch({
  swatch,
  name,
}: {
  swatch?: Maybe<ProductOptionValueSwatch> | undefined;
  name: string;
}) {
  const image = swatch?.image?.previewImage?.url;
  const color = swatch?.color;

  if (!image && !color) return name;

  return (
    <div
      aria-label={name}
      className="pdp-options__swatch"
      style={{
        backgroundColor: color || 'transparent',
      }}
    >
      {!!image && <img src={image} alt={name} />}
    </div>
  );
}
