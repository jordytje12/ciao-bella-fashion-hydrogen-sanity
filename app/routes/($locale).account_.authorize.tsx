import type {Route} from './+types/($locale).account_.authorize';
import {syncCartBuyerIdentity} from '~/lib/cartBuyer';

export async function loader({context}: Route.LoaderArgs) {
  const {cart, customerAccount} = context;
  const response = await customerAccount.authorize();

  // Attach the logged-in buyer to any existing cart so VIP automatic discounts
  // evaluate on the storefront cart (not only after checkout identifies them).
  const {headers: cartHeaders} = await syncCartBuyerIdentity({
    cart,
    customerAccount,
  });

  cartHeaders.forEach((value, key) => {
    response.headers.append(key, value);
  });

  return response;
}
