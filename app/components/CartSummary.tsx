import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {CartLayout} from '~/components/CartMain';
import {CartForm, Money, type OptimisticCart} from '@shopify/hydrogen';
import {useEffect, useId, useRef, useState} from 'react';
import {useFetcher} from 'react-router';
import {useAside} from '~/components/Aside';

type CartSummaryProps = {
  cart: OptimisticCart<CartApiQueryFragment | null>;
  layout: CartLayout;
};

export function CartSummary({cart, layout}: CartSummaryProps) {
  const className =
    layout === 'page' ? 'cart-summary-page' : 'cart-summary-aside';
  const summaryId = useId();
  const discountsHeadingId = useId();
  const discountCodeInputId = useId();
  const giftCardHeadingId = useId();
  const giftCardInputId = useId();

  return (
    <div aria-labelledby={summaryId} className={className}>
      <h4 className="sr-only" id={summaryId}>
        Overzicht
      </h4>
      <dl role="group" className="cart-subtotal">
        <dt>Subtotaal</dt>
        <dd>
          {cart?.cost?.subtotalAmount?.amount ? (
            <Money data={cart?.cost?.subtotalAmount} />
          ) : (
            '-'
          )}
        </dd>
      </dl>
      <details className="cart-codes">
        <summary className="cart-codes__summary">
          Kortingscode of cadeaubon
        </summary>
        <div className="cart-codes__body">
          <CartDiscounts
            discountCodes={cart?.discountCodes}
            discountsHeadingId={discountsHeadingId}
            discountCodeInputId={discountCodeInputId}
          />
          <CartGiftCard
            giftCardCodes={cart?.appliedGiftCards}
            giftCardHeadingId={giftCardHeadingId}
            giftCardInputId={giftCardInputId}
          />
        </div>
      </details>
      <CartCheckoutActions checkoutUrl={cart?.checkoutUrl} />
    </div>
  );
}

function CartCheckoutActions({checkoutUrl}: {checkoutUrl?: string}) {
  const {close} = useAside();
  if (!checkoutUrl) return null;

  return (
    <div className="cart-summary__actions">
      <a className="cart-summary__checkout" href={checkoutUrl} target="_self">
        Afrekenen
      </a>
      <button
        className="cart-summary__continue"
        onClick={close}
        type="button"
      >
        of verder winkelen
      </button>
    </div>
  );
}

function CartDiscounts({
  discountCodes,
  discountsHeadingId,
  discountCodeInputId,
}: {
  discountCodes?: CartApiQueryFragment['discountCodes'];
  discountsHeadingId: string;
  discountCodeInputId: string;
}) {
  const codes: string[] =
    discountCodes
      ?.filter((discount) => discount.applicable)
      ?.map(({code}) => code) || [];

  return (
    <section aria-label="Kortingscodes">
      {/* Have existing discount, display it with a remove option */}
      <dl hidden={!codes.length}>
        <div>
          <dt id={discountsHeadingId}>Korting</dt>
          <UpdateDiscountForm>
            <div
              className="cart-discount"
              role="group"
              aria-labelledby={discountsHeadingId}
            >
              <code>{codes?.join(', ')}</code>
              &nbsp;
              <button type="submit" aria-label="Korting verwijderen">
                Verwijderen
              </button>
            </div>
          </UpdateDiscountForm>
        </div>
      </dl>

      {/* Show an input to apply a discount */}
      <UpdateDiscountForm discountCodes={codes}>
        <div className="cart-codes__row">
          <label htmlFor={discountCodeInputId} className="sr-only">
            Kortingscode
          </label>
          <input
            id={discountCodeInputId}
            type="text"
            name="discountCode"
            placeholder="Kortingscode"
          />
          <button type="submit" aria-label="Kortingscode toepassen">
            Toepassen
          </button>
        </div>
      </UpdateDiscountForm>
    </section>
  );
}

function UpdateDiscountForm({
  discountCodes,
  children,
}: {
  discountCodes?: string[];
  children: React.ReactNode;
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.DiscountCodesUpdate}
      inputs={{
        discountCodes: discountCodes || [],
      }}
    >
      {children}
    </CartForm>
  );
}

function CartGiftCard({
  giftCardCodes,
  giftCardHeadingId,
  giftCardInputId,
}: {
  giftCardCodes: CartApiQueryFragment['appliedGiftCards'] | undefined;
  giftCardHeadingId: string;
  giftCardInputId: string;
}) {
  const giftCardCodeInput = useRef<HTMLInputElement>(null);
  const removeButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const previousCardIdsRef = useRef<string[]>([]);
  const giftCardAddFetcher = useFetcher({key: 'gift-card-add'});
  const [removedCardIndex, setRemovedCardIndex] = useState<number | null>(null);

  useEffect(() => {
    if (giftCardAddFetcher.data) {
      if (giftCardCodeInput.current !== null) {
        giftCardCodeInput.current.value = '';
      }
    }
  }, [giftCardAddFetcher.data]);

  useEffect(() => {
    const currentCardIds = giftCardCodes?.map((card) => card.id) || [];

    if (removedCardIndex !== null && giftCardCodes) {
      const focusTargetIndex = Math.min(
        removedCardIndex,
        giftCardCodes.length - 1,
      );
      const focusTargetCard = giftCardCodes[focusTargetIndex];
      const focusButton = focusTargetCard
        ? removeButtonRefs.current.get(focusTargetCard.id)
        : null;

      if (focusButton) {
        focusButton.focus();
      } else if (giftCardCodeInput.current) {
        giftCardCodeInput.current.focus();
      }

      setRemovedCardIndex(null);
    }

    previousCardIdsRef.current = currentCardIds;
  }, [giftCardCodes, removedCardIndex]);

  const handleRemoveClick = (cardId: string) => {
    const index = previousCardIdsRef.current.indexOf(cardId);
    if (index !== -1) {
      setRemovedCardIndex(index);
    }
  };

  return (
    <section aria-label="Cadeaubonnen">
      {giftCardCodes && giftCardCodes.length > 0 && (
        <dl>
          <dt id={giftCardHeadingId}>Toegepaste cadeaubon(nen)</dt>
          {giftCardCodes.map((giftCard) => (
            <dd key={giftCard.id} className="cart-discount">
              <RemoveGiftCardForm
                giftCardId={giftCard.id}
                lastCharacters={giftCard.lastCharacters}
                onRemoveClick={() => handleRemoveClick(giftCard.id)}
                buttonRef={(el: HTMLButtonElement | null) => {
                  if (el) {
                    removeButtonRefs.current.set(giftCard.id, el);
                  } else {
                    removeButtonRefs.current.delete(giftCard.id);
                  }
                }}
              >
                <code>***{giftCard.lastCharacters}</code>
                &nbsp;
                <Money data={giftCard.amountUsed} />
              </RemoveGiftCardForm>
            </dd>
          ))}
        </dl>
      )}

      <AddGiftCardForm fetcherKey="gift-card-add">
        <div className="cart-codes__row">
          <label htmlFor={giftCardInputId} className="sr-only">
            Cadeauboncode
          </label>
          <input
            id={giftCardInputId}
            type="text"
            name="giftCardCode"
            placeholder="Cadeauboncode"
            ref={giftCardCodeInput}
          />
          <button
            type="submit"
            disabled={giftCardAddFetcher.state !== 'idle'}
            aria-label="Cadeauboncode toepassen"
          >
            Toepassen
          </button>
        </div>
      </AddGiftCardForm>
    </section>
  );
}

function AddGiftCardForm({
  fetcherKey,
  children,
}: {
  fetcherKey?: string;
  children: React.ReactNode;
}) {
  return (
    <CartForm
      fetcherKey={fetcherKey}
      route="/cart"
      action={CartForm.ACTIONS.GiftCardCodesAdd}
    >
      {children}
    </CartForm>
  );
}

function RemoveGiftCardForm({
  giftCardId,
  lastCharacters,
  children,
  onRemoveClick,
  buttonRef,
}: {
  giftCardId: string;
  lastCharacters: string;
  children: React.ReactNode;
  onRemoveClick?: () => void;
  buttonRef?: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.GiftCardCodesRemove}
      inputs={{
        giftCardCodes: [giftCardId],
      }}
    >
      {children}
      &nbsp;
      <button
        type="submit"
        aria-label={`Cadeaubon eindigend op ${lastCharacters} verwijderen`}
        onClick={onRemoveClick}
        ref={buttonRef}
      >
        Verwijderen
      </button>
    </CartForm>
  );
}
