import type {CustomerAccount, HydrogenCart} from '@shopify/hydrogen';

type CartResult = Awaited<ReturnType<HydrogenCart['get']>>;

/**
 * Ensures a logged-in Customer Account buyer is attached to the current cart
 * so customer-eligible automatic discounts (e.g. VIP) evaluate before checkout.
 */
export async function syncCartBuyerIdentity({
  cart,
  customerAccount,
}: {
  cart: HydrogenCart;
  customerAccount: CustomerAccount;
}): Promise<{
  cart: CartResult;
  headers: Headers;
}> {
  const headers = new Headers();
  const [isLoggedIn, currentCart] = await Promise.all([
    customerAccount.isLoggedIn(),
    cart.get(),
  ]);

  if (!isLoggedIn) {
    return {cart: currentCart, headers};
  }

  if (currentCart?.buyerIdentity?.customer?.id) {
    return {cart: currentCart, headers};
  }

  if (!cart.getCartId()) {
    return {cart: currentCart, headers};
  }

  const buyer = await customerAccount.getBuyer();
  if (!buyer?.customerAccessToken) {
    return {cart: currentCart, headers};
  }

  try {
    const result = await cart.updateBuyerIdentity({
      customerAccessToken: buyer.customerAccessToken,
    });

    if (result.cart?.id) {
      const cartHeaders = cart.setCartId(result.cart.id);
      cartHeaders.forEach((value, key) => {
        headers.append(key, value);
      });
      // Re-fetch with the custom cart fragment so UI fields (discountAllocations) are present.
      const syncedCart = await cart.get();
      return {cart: syncedCart ?? currentCart, headers};
    }
  } catch (error) {
    console.warn('[cart] Failed to sync buyer identity', error);
  }

  return {cart: currentCart, headers};
}
